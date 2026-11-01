import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: settings } = await db.from("store_settings").select("webpay_enabled,webpay_environment").eq("id",1).single();
  if (!settings?.webpay_enabled) return Response.json({ error: "webpay_disabled" }, { status: 409 });

  const commerceCode = Deno.env.get("WEBPAY_COMMERCE_CODE");
  const apiKey = Deno.env.get("WEBPAY_API_KEY");
  if (!commerceCode || !apiKey) return Response.json({ error: "webpay_credentials_missing" }, { status: 503 });

  const { token_ws } = await req.json();
  if (!token_ws) return Response.json({ error: "token_required" }, { status: 400 });
  const { data: tx } = await db.from("webpay_transactions").select("id,order_id,amount_clp,status").eq("token",token_ws).single();
  if (!tx || tx.status !== "initialized") return Response.json({ error: "transaction_not_found" }, { status: 404 });

  const base = settings.webpay_environment === "production" ? "https://webpay3g.transbank.cl" : "https://webpay3gint.transbank.cl";
  const r = await fetch(`${base}/rswebpaytransaction/api/webpay/v1.2/transactions/${encodeURIComponent(token_ws)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Tbk-Api-Key-Id": commerceCode, "Tbk-Api-Key-Secret": apiKey }
  });
  const data = await r.json();
  const authorized = r.ok && Number(data?.response_code) === 0 && String(data?.status || "").toUpperCase() === "AUTHORIZED";

  await db.from("webpay_transactions").update({
    status: authorized ? "authorized" : "failed",
    authorization_code: data?.authorization_code ?? null,
    response_code: data?.response_code ?? null,
    card_number_masked: data?.card_detail?.card_number ?? null,
    raw_response: data,
    committed_at: new Date().toISOString()
  }).eq("id",tx.id);

  if (authorized) {
    await db.from("order_payments").insert({
      order_id: tx.order_id,
      method: "webpay",
      amount_clp: tx.amount_clp,
      reference: token_ws,
      status: "confirmed",
      reconciliation_status: "reconciled",
      payment_date: new Date().toISOString(),
      notes: "Pago Webpay"
    });
  }
  return Response.json({ authorized, status: data?.status ?? null, response_code: data?.response_code ?? null });
});
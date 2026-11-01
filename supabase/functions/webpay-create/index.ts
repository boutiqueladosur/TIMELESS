import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: settings } = await db.from("store_settings").select("webpay_enabled,webpay_environment").eq("id",1).single();
  if (!settings?.webpay_enabled) return Response.json({ error: "webpay_disabled" }, { status: 409 });

  const commerceCode = Deno.env.get("WEBPAY_COMMERCE_CODE");
  const apiKey = Deno.env.get("WEBPAY_API_KEY");
  if (!commerceCode || !apiKey) return Response.json({ error: "webpay_credentials_missing" }, { status: 503 });

  const { order_id, return_url } = await req.json();
  const { data: order } = await db.from("orders").select("id,order_number,total_clp,balance_due_clp,status").eq("id",order_id).single();
  if (!order || ["cancelled","refunded"].includes(order.status)) return Response.json({ error: "order_not_payable" }, { status: 409 });

  const amount = Number(order.balance_due_clp ?? order.total_clp ?? 0);
  const buy_order = `TL-${order.order_number}`.slice(0,26);
  const session_id = crypto.randomUUID().replaceAll("-","").slice(0,61);
  const base = settings.webpay_environment === "production" ? "https://webpay3g.transbank.cl" : "https://webpay3gint.transbank.cl";

  const r = await fetch(`${base}/rswebpaytransaction/api/webpay/v1.2/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Tbk-Api-Key-Id": commerceCode, "Tbk-Api-Key-Secret": apiKey },
    body: JSON.stringify({ buy_order, session_id, amount, return_url })
  });
  const data = await r.json();
  if (!r.ok) return Response.json({ error: "webpay_create_failed", detail: data }, { status: 502 });

  await db.from("webpay_transactions").insert({ order_id: order.id, token: data.token, buy_order, session_id, amount_clp: amount, status: "initialized" });
  return Response.json({ token: data.token, url: data.url });
});
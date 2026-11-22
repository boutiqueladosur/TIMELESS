// Checkout intentionally disabled: current storefront uses assisted WhatsApp orders.
// Do not enable automated orders without a separate security and payment review.
const permitted = new Set(["https://timelesstco.cl","https://www.timelesstco.cl"]);
Deno.serve((req: Request) => {
 const origin=req.headers.get("origin");
 const headers=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"});
 if(origin && permitted.has(origin)) headers.set("Access-Control-Allow-Origin",origin);
 return new Response(JSON.stringify({error:"Los pedidos se coordinan exclusivamente por WhatsApp."}),{status:410,headers});
});

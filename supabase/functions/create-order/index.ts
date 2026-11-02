import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const allowedOrigins=new Set(["https://boutiqueladosur.github.io","http://localhost:5500","http://127.0.0.1:5500"]);
function cors(origin:string|null){const allowed=origin&&allowedOrigins.has(origin)?origin:"https://boutiqueladosur.github.io";return{"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json; charset=utf-8"}}
function json(status:number,body:unknown,origin:string|null,extra:Record<string,string>={}){return new Response(JSON.stringify(body),{status,headers:{...cors(origin),...extra}})}
async function sha256(text:string){const b=new TextEncoder().encode(text);const h=await crypto.subtle.digest("SHA-256",b);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function windowStart(){const d=new Date();d.setUTCSeconds(0,0);d.setUTCMinutes(d.getUTCMinutes()-(d.getUTCMinutes()%10));return d.toISOString()}
Deno.serve(async(req:Request)=>{const origin=req.headers.get("origin");if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});if(req.method!=="POST")return json(405,{error:"Método no permitido"},origin);if(origin&&!allowedOrigins.has(origin))return json(403,{error:"Origen no permitido"},origin);
 try{
  const ip=(req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||"unknown").split(",")[0].trim();
  const ua=(req.headers.get("user-agent")||"").slice(0,180);const fingerprint=await sha256(`${ip}|${ua}`);const win=windowStart();
  const {data:limitCount,error:limitError}=await admin.rpc("consume_order_rate_limit",{p_fingerprint:fingerprint,p_window:win,p_limit:12});
  if(limitError)throw limitError;if(Number(limitCount)<0)return json(429,{error:"Demasiados intentos. Intenta nuevamente en unos minutos."},origin,{"Retry-After":"600"});
  const raw=await req.text();if(raw.length>20000)return json(413,{error:"Solicitud demasiado grande"},origin);
  const body=JSON.parse(raw||"{}");const requestId=/^[0-9a-f-]{36}$/i.test(String(body.client_request_id||""))?String(body.client_request_id):crypto.randomUUID();
  const customerName=String(body.customer_name||"").trim().slice(0,160);const customerPhone=String(body.customer_phone||"").replace(/[^0-9+\- ()]/g,"").trim().slice(0,30);const shippingAddress=String(body.shipping_address||"").trim().slice(0,300);const customerNotes=String(body.customer_notes||"").trim().slice(0,1000)||null;const items=Array.isArray(body.items)?body.items:[];
  if(customerName.length<2)return json(400,{error:"Nombre inválido"},origin);if(customerPhone.length<7)return json(400,{error:"Teléfono inválido"},origin);if(shippingAddress.length<5)return json(400,{error:"Dirección inválida"},origin);if(!items.length||items.length>30)return json(400,{error:"Pedido inválido"},origin);
  const normalized=items.map((x:any)=>({product_id:String(x.product_id||""),quantity:Math.max(1,Math.min(99,Number(x.quantity)||1))}));if(normalized.some((x:any)=>!/^[0-9a-f-]{36}$/i.test(x.product_id)))return json(400,{error:"Producto inválido"},origin);
  const {data,error}=await admin.rpc("create_order_atomic",{p_client_request_id:requestId,p_customer_name:customerName,p_customer_phone:customerPhone,p_shipping_address:shippingAddress,p_customer_notes:customerNotes,p_items:normalized});
  if(error){const m=String(error.message||"");if(m.startsWith("STOCK_INSUFFICIENT")){const parts=m.split("|");return json(409,{error:`Stock insuficiente para ${parts[1]||"un producto"}. Disponible: ${parts[2]||0}.`},origin)}if(m.includes("PRODUCT_UNAVAILABLE"))return json(409,{error:"Uno o más productos ya no están disponibles."},origin);if(m.includes("INVALID_"))return json(400,{error:"Los datos del pedido no son válidos."},origin);throw error}
  const payload=data||{};return json(payload.duplicate?200:201,payload,origin);
 }catch(error){console.error(error);return json(500,{error:"No se pudo crear el pedido"},origin)}
});
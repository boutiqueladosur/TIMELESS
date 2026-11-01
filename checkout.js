(()=>{
'use strict';
const SUPABASE_URL='https://nfphzvcwxyfkbucwwlcx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const ENDPOINT=`${SUPABASE_URL}/functions/v1/create-order`;
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const STORAGE='timeless_cart_v1';
const REQUEST_ID_KEY='timeless_order_request_id';
const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)||0);
const toast=msg=>{const t=$('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200)};
function loadCart(){try{return(JSON.parse(localStorage.getItem(STORAGE)||'[]')||[]).filter(Boolean)}catch{return[]}}
function getRequestId(){try{const saved=sessionStorage.getItem(REQUEST_ID_KEY);if(saved&&/^[0-9a-f-]{36}$/i.test(saved))return saved;const id=crypto.randomUUID();sessionStorage.setItem(REQUEST_ID_KEY,id);return id}catch{return crypto.randomUUID()}}
function clearRequestId(){try{sessionStorage.removeItem(REQUEST_ID_KEY)}catch{}}
function whatsappNumber(){const href=$('whatsapp-link')?.href||$('whatsapp-fab')?.href||'';const m=href.match(/wa\.me\/(\d+)/);return m?.[1]||'56935707722'}
function groupedCart(cart){const m=new Map();for(const x of cart){const id=String(x.id||'');const qty=Math.max(1,Math.min(99,Number(x.qty)||1));if(!id)continue;const current=m.get(id)||{product_id:id,quantity:0,name:x.name||'Producto'};current.quantity=Math.min(99,current.quantity+qty);m.set(id,current)}return [...m.values()]}
async function precheckStock(items){const ids=items.map(x=>x.product_id);const {data,error}=await db.rpc('get_public_stock_availability',{p_product_ids:ids});if(error){console.warn('No se pudo prevalidar stock; el servidor hará la validación definitiva.',error);return}const byId=new Map((data||[]).map(x=>[String(x.product_id),Number(x.available_stock)||0]));for(const item of items){const available=byId.get(String(item.product_id));if(available==null)throw new Error(`${item.name} ya no está disponible.`);if(item.quantity>available)throw new Error(`${item.name}: quedan ${available} unidad${available===1?'':'es'} disponibles.`)}}
async function submitOrder(e){
 e.preventDefault();e.stopImmediatePropagation();const form=e.currentTarget;const button=form.querySelector('button[type="submit"]');const cart=loadCart();if(!cart.length)return toast('Agrega productos antes de confirmar.');
 const name=$('name')?.value.trim()||'',address=$('location')?.value.trim()||'',phone=$('phone')?.value.trim()||'',notes=$('notes')?.value.trim()||'';
 if(name.length<2||address.length<5)return toast('Completa nombre y dirección.');if(phone.replace(/\D/g,'').length<7)return toast('Ingresa un teléfono válido para gestionar la entrega.');
 button.disabled=true;const original=button.innerHTML;button.textContent='Verificando stock…';
 try{
  const items=groupedCart(cart);await precheckStock(items);button.textContent='Guardando pedido…';
  const requestId=getRequestId();
  const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`},body:JSON.stringify({client_request_id:requestId,customer_name:name,customer_phone:phone,shipping_address:address,customer_notes:notes||null,items:items.map(x=>({product_id:x.product_id,quantity:x.quantity}))})});
  const payload=await res.json().catch(()=>({}));if(!res.ok)throw new Error(payload.error||'No se pudo registrar el pedido.');
  const order=payload.order||{},savedItems=Array.isArray(payload.items)?payload.items:[];const lines=['Hola TIMELESS ✨',`Pedido ${order.order_number||''}`,'',...savedItems.map(x=>`• ${x.product_name} × ${x.quantity} — ${money(x.line_total_clp)}`),'',`Total: ${money(order.total_clp)}`,'',`Nombre: ${name}`,`Ciudad / Dirección: ${address}`,`Teléfono: ${phone}`,notes?`Notas: ${notes}`:''].filter(Boolean);
  localStorage.removeItem(STORAGE);clearRequestId();toast(payload.duplicate?`Pedido ${order.order_number||''} recuperado.`:`Pedido ${order.order_number||''} registrado.`);setTimeout(()=>location.reload(),500);window.open(`https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(lines.join('\n'))}`,'_blank','noopener,noreferrer');
 }catch(err){console.error(err);toast(err.message||'No se pudo crear el pedido.')}finally{button.disabled=false;button.innerHTML=original}
}
function init(){const form=$('order-form');if(!form)return;const phone=$('phone');if(phone){phone.required=true;phone.placeholder='Teléfono *'}form.addEventListener('submit',submitOrder,true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

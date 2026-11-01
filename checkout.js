(()=>{
'use strict';
const SUPABASE_URL='https://nfphzvcwxyfkbucwwlcx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const ENDPOINT=`${SUPABASE_URL}/functions/v1/create-order`;
const STORAGE='timeless_cart_v1';
const REQUEST_ID_KEY='timeless_order_request_id';
const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)||0);
const toast=msg=>{const t=$('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)};
function loadCart(){try{return(JSON.parse(localStorage.getItem(STORAGE)||'[]')||[]).filter(Boolean)}catch{return[]}}
function getRequestId(){try{const saved=sessionStorage.getItem(REQUEST_ID_KEY);if(saved&&/^[0-9a-f-]{36}$/i.test(saved))return saved;const id=crypto.randomUUID();sessionStorage.setItem(REQUEST_ID_KEY,id);return id}catch{return crypto.randomUUID()}}
function clearRequestId(){try{sessionStorage.removeItem(REQUEST_ID_KEY)}catch{}}
function whatsappNumber(){const href=$('whatsapp-link')?.href||$('whatsapp-fab')?.href||'';const m=href.match(/wa\.me\/(\d+)/);return m?.[1]||'56935707722'}
async function submitOrder(e){
 e.preventDefault();e.stopImmediatePropagation();const form=e.currentTarget;const button=form.querySelector('button[type="submit"]');const cart=loadCart();if(!cart.length)return toast('Agrega productos antes de confirmar.');
 const name=$('name')?.value.trim()||'',address=$('location')?.value.trim()||'',phone=$('phone')?.value.trim()||'',notes=$('notes')?.value.trim()||'';
 if(name.length<2||address.length<5)return toast('Completa nombre y dirección.');if(phone.replace(/\D/g,'').length<7)return toast('Ingresa un teléfono válido para gestionar la entrega.');
 button.disabled=true;const original=button.innerHTML;button.textContent='Guardando pedido…';
 try{
  const requestId=getRequestId();
  const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`},body:JSON.stringify({client_request_id:requestId,customer_name:name,customer_phone:phone,shipping_address:address,customer_notes:notes||null,items:cart.map(x=>({product_id:x.id,quantity:x.qty||1}))})});
  const payload=await res.json().catch(()=>({}));if(!res.ok)throw new Error(payload.error||'No se pudo registrar el pedido.');
  const order=payload.order||{},items=Array.isArray(payload.items)?payload.items:[];const lines=['Hola TIMELESS ✨',`Pedido ${order.order_number||''}`,'',...items.map(x=>`• ${x.product_name} × ${x.quantity} — ${money(x.line_total_clp)}`),'',`Total: ${money(order.total_clp)}`,'',`Nombre: ${name}`,`Ciudad / Dirección: ${address}`,`Teléfono: ${phone}`,notes?`Notas: ${notes}`:''].filter(Boolean);
  localStorage.removeItem(STORAGE);clearRequestId();toast(payload.duplicate?`Pedido ${order.order_number||''} recuperado.`:`Pedido ${order.order_number||''} registrado.`);setTimeout(()=>location.reload(),500);window.open(`https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(lines.join('\n'))}`,'_blank','noopener,noreferrer');
 }catch(err){console.error(err);toast(err.message||'No se pudo crear el pedido.')}finally{button.disabled=false;button.innerHTML=original}
}
function init(){const form=$('order-form');if(!form)return;const phone=$('phone');if(phone){phone.required=true;phone.placeholder='Teléfono *'}form.addEventListener('submit',submitOrder,true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

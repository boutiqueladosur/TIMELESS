(()=>{
'use strict';
const SUPABASE_URL='https://nfphzvcwxyfkbucwwlcx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const ENDPOINT=`${SUPABASE_URL}/functions/v1/create-order`;
const STORAGE='timeless_cart_v1';
const REQUEST_ID_KEY='timeless_order_request_id';
const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)||0);
const toast=msg=>{const t=$('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200)};
function loadCart(){try{return(JSON.parse(localStorage.getItem(STORAGE)||'[]')||[]).filter(Boolean)}catch{return[]}}
function getRequestId(items){const signature=JSON.stringify(items.map(x=>[x.product_id,x.quantity]).sort((a,b)=>a[0].localeCompare(b[0])));try{const saved=sessionStorage.getItem(REQUEST_ID_KEY),previous=sessionStorage.getItem(REQUEST_ID_KEY+'_cart');if(saved&&previous===signature&&/^[0-9a-f-]{36}$/i.test(saved))return saved;const id=crypto.randomUUID();sessionStorage.setItem(REQUEST_ID_KEY,id);sessionStorage.setItem(REQUEST_ID_KEY+'_cart',signature);return id}catch{return crypto.randomUUID()}}
function clearRequestId(){try{sessionStorage.removeItem(REQUEST_ID_KEY);sessionStorage.removeItem(REQUEST_ID_KEY+'_cart')}catch{}}
function whatsappNumber(){const href=$('whatsapp-link')?.href||$('whatsapp-fab')?.href||'';const m=href.match(/wa\.me\/(\d+)/);return m?.[1]||'56935707722'}
function groupedCart(cart){const m=new Map();for(const x of cart){const id=String(x.id||'');const qty=Math.max(1,Math.min(99,Number(x.qty)||1));if(!id)continue;const current=m.get(id)||{product_id:id,quantity:0,name:x.name||'Producto'};current.quantity=Math.min(99,current.quantity+qty);m.set(id,current)}return [...m.values()]}
async function submitOrder(e){
 e.preventDefault();e.stopImmediatePropagation();const form=e.currentTarget;const button=form.querySelector('button[type="submit"]');const cart=loadCart();if(!cart.length)return toast('Agrega productos antes de confirmar.');
 const name=$('name')?.value.trim()||'',address=$('location')?.value.trim()||'',phone=$('phone')?.value.trim()||'',notes=$('notes')?.value.trim()||'';
 if(name.length<2||address.length<5)return toast('Completa nombre y dirección.');if(phone.replace(/\D/g,'').length<7)return toast('Ingresa un teléfono válido para gestionar la entrega.');
 button.disabled=true;const original=button.innerHTML;button.textContent='Verificando stock y guardando…';
 try{
  const items=groupedCart(cart);const requestId=getRequestId(items);
  const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`},body:JSON.stringify({client_request_id:requestId,customer_name:name,customer_phone:phone,shipping_address:address,customer_notes:notes||null,items:items.map(x=>({product_id:x.product_id,quantity:x.quantity}))})});
  const payload=await res.json().catch(()=>({}));if(!res.ok){const error=new Error(payload.error||'No se pudo registrar el pedido.');error.status=res.status;throw error}
  const order=payload.order;
  if(!order?.order_number||!Number.isFinite(Number(order.total_clp)))throw new Error('El servidor no confirmó los datos del pedido. Intenta nuevamente.');
  const savedItems=Array.isArray(payload.items)?payload.items:[];
  const lines=['Hola TIMELESS ✨',`Pedido ${order.order_number}`,'',...savedItems.map(x=>`• ${x.product_name} × ${x.quantity} — ${money(x.line_total_clp)}`),'',`Total: ${money(order.total_clp)}`,'',`Nombre: ${name}`,`Ciudad / Dirección: ${address}`,`Teléfono: ${phone}`,notes?`Notas: ${notes}`:''].filter(Boolean);
  const whatsappUrl=`https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(lines.join('\n'))}`;
  localStorage.removeItem(STORAGE);
  clearRequestId();
  const notice=document.createElement('div');notice.id='timeless-order-confirmation';notice.setAttribute('role','status');notice.style.cssText='padding:18px;border:1px solid #cfbca2;border-radius:15px;background:#fffdf9;display:grid;gap:12px;line-height:1.5';
  const title=document.createElement('h3');title.style.margin='0';title.textContent='✓ Pedido registrado';
  const info=document.createElement('p');info.style.margin='0';info.textContent=`N° ${order.order_number} · Total ${money(order.total_clp)}. Tu pedido fue guardado y está pendiente de confirmación por WhatsApp.`;
  const link=document.createElement('a');link.href=whatsappUrl;link.target='_blank';link.rel='noopener noreferrer';link.className='send';link.style.cssText='display:block;text-align:center;text-decoration:none;padding:12px;border-radius:10px';link.textContent='Abrir WhatsApp para continuar';
  const back=document.createElement('button');back.type='button';back.className='send';back.style.cssText='background:#f4f1ed;color:#222;padding:12px';back.textContent='Volver a la tienda';back.addEventListener('click',()=>location.reload());
  notice.append(title,info,link,back);form.replaceWith(notice);
  toast(payload.duplicate?'Pedido recuperado con éxito.':'Pedido guardado con éxito.');

 }catch(err){console.error(err);toast(err.message||'No se pudo crear el pedido. Si no recibiste un número de pedido, revisa antes de reintentar.');}finally{button.disabled=false;button.innerHTML=original}
}
function init(){const form=$('order-form');if(!form)return;const phone=$('phone');if(phone){phone.required=true;phone.placeholder='Teléfono *'}form.addEventListener('submit',submitOrder,true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

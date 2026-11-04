(()=>{
'use strict';
const STYLE_ID='timeless-orders-layout-css';
function styles(){
 if(document.getElementById(STYLE_ID))return;
 const el=document.createElement('style');el.id=STYLE_ID;
 el.textContent=`
 #tab-orders .orders-card{max-width:none}
 #orders-list{gap:12px}
 #orders-list .order-card{padding:0;overflow:hidden;border-radius:16px;box-shadow:0 5px 20px rgba(0,0,0,.035)}
 #orders-list .order-top{padding:17px 19px;grid-template-columns:minmax(0,1fr) auto auto;align-items:center}
 #orders-list .order-number{font-size:15px}
 #orders-list .order-meta{line-height:1.5;overflow-wrap:anywhere}
 #orders-list .order-top>div:last-child{min-width:110px;text-align:right}
 #orders-list .order-top>div:last-child strong{font-size:18px}
 #orders-list .order-details{border-top:1px solid var(--line)}
 #orders-list .order-details>summary{display:flex;justify-content:space-between;align-items:center;padding:12px 19px;cursor:pointer;background:#faf8f5;font-weight:700;font-size:12px;list-style:none}
 #orders-list .order-details>summary::-webkit-details-marker{display:none}
 #orders-list .order-details>summary::after{content:'⌄';font-size:21px;line-height:12px;transition:transform .2s}
 #orders-list .order-details[open]>summary::after{transform:rotate(180deg)}
 #orders-list .order-details-body{padding:8px 19px 15px}
 #orders-list .order-section-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#72685f;margin:17px 0 9px}
 #orders-list .order-items{margin:0 0 12px}
 #orders-list .order-fields{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
 #orders-list .order-fields input,#orders-list .order-fields select{min-width:0}
 #orders-list .shipping-finance{grid-template-columns:repeat(3,minmax(0,1fr))}
 #orders-list .tax-docs{margin:14px 0}
 #orders-list .order-actions{padding:13px 19px;margin:0;border-top:1px solid var(--line);background:#fff;align-items:center}
 #orders-list .order-card:has(.order-details[open]){border-color:#c6b8a5}
 @media(max-width:900px){#orders-list .order-fields,#orders-list .shipping-finance{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:620px){#orders-list .order-top{grid-template-columns:1fr auto;padding:14px}#orders-list .order-top>div:first-child{grid-column:1/-1}#orders-list .order-top>.order-badge{justify-self:start}#orders-list .order-details>summary{padding:13px 14px}#orders-list .order-details-body{padding:8px 14px 14px}#orders-list .order-fields,#orders-list .shipping-finance{grid-template-columns:1fr}#orders-list .order-actions{padding:12px 14px}#orders-list .order-actions>.btn,#orders-list .order-actions>a{flex:1;text-align:center}}
 `;
 document.head.appendChild(el);
}
const quickSteps={paid:{label:'Preparar',next:'preparing'},preparing:{label:'Despachar',next:'shipped'},shipped:{label:'Marcar entregado',next:'delivered'}};
const db=window.supabase.createClient('https://nfphzvcwxyfkbucwwlcx.supabase.co','sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS');
function addStatusActions(card){
 const actions=card.querySelector(':scope > .order-actions');
 const field=card.querySelector('[data-field="status"]');
 if(!actions||!field)return;
 const previous=actions.querySelector('[data-quick-state]');
 const step=quickSteps[field.value];
 if(!step){previous?.remove();return}
 if(previous?.dataset.nextStatus===step.next)return;
 previous?.remove();
 const button=document.createElement('button');
 button.type='button';button.className='btn secondary';
 button.dataset.quickState='';button.dataset.nextStatus=step.next;
 button.textContent=step.label;
 actions.insertBefore(button,actions.firstChild);
}
async function quickChange(event){
 const button=event.target.closest('[data-quick-state]');
 if(!button)return;
 const card=button.closest('.order-card[data-order-id]');if(!card)return;
 const current=card.querySelector('[data-field="status"]')?.value;
 const requested=button.dataset.nextStatus;
 if(quickSteps[current]?.next!==requested)return alert('Actualiza el pedido antes de continuar.');
 if(requested==='delivered'&&!confirm('¿Confirmas que se entregó todo el pedido? Si faltan unidades, regístralas primero en Despachos.'))return;
 button.disabled=true;
 try{
  const {data:{user}}=await db.auth.getUser();
  const {data:level,error:authError}=await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if(authError||user?.app_metadata?.role!=='admin'||level?.currentLevel!=='aal2')throw new Error('Requiere permisos de administración y MFA.');
  const {data,error}=await db.from('orders').update({status:requested,updated_at:new Date().toISOString()}).eq('id',card.dataset.orderId).eq('status',current).select('id,status').maybeSingle();
  if(error)throw error;if(!data||data.status!==requested)throw new Error('Estado no actualizado. Refresca el pedido.');
  document.getElementById('refresh-orders')?.click();
 }catch(error){console.error(error);alert(error.message||'No se pudo cambiar el estado.')}finally{button.disabled=false}
}
const opened=new Set();
const section=(title,element,parent)=>{
 const heading=document.createElement('div');heading.className='order-section-title';heading.textContent=title;
 parent.appendChild(heading);parent.appendChild(element);
};
function decorate(){
 const list=document.getElementById('orders-list');
 if(!list)return;
 list.querySelectorAll('.order-card[data-order-id]').forEach(card=>{
  const id=card.dataset.orderId;
  let details=card.querySelector(':scope > .order-details');
  if(!details){
   details=document.createElement('details');details.className='order-details';
   if(opened.has(id))details.open=true;
   const summary=document.createElement('summary');summary.textContent='Ver artículos, documentos y editar pedido';
   const body=document.createElement('div');body.className='order-details-body';
   details.append(summary,body);
   const actions=card.querySelector(':scope > .order-actions');
   card.insertBefore(details,actions);
   details.addEventListener('toggle',()=>{if(details.open)opened.add(id);else opened.delete(id)});
  }
  addStatusActions(card);
  const body=details.querySelector('.order-details-body');
  const parts=[['Artículos comprados','.order-items'],['Documentos tributarios','.tax-docs'],['Estado y despacho','.order-fields'],['Costos del envío','.shipping-finance']];
  for(const [title,selector] of parts){
   const node=card.querySelector(selector);
   if(!node||node.parentElement===body)continue;
   section(title,node,body);
  }
 });
}
function init(){
 styles();
 document.getElementById('orders-management')?.addEventListener('click',quickChange);
 let scheduled=false;
 const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})};
 const timer=setInterval(()=>{const list=document.getElementById('orders-list');if(!list)return;clearInterval(timer);
  const obs=new MutationObserver(mutations=>{
   if(mutations.some(m=>Array.from(m.addedNodes).some(n=>n.nodeType===1&&(n.matches?.('.order-card,.tax-docs,.order-items,.order-fields,.shipping-finance')||n.querySelector?.('.order-card,.tax-docs')))))schedule();
  });
  obs.observe(list,{childList:true,subtree:true});schedule();
 },120);
 setTimeout(()=>clearInterval(timer),12000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
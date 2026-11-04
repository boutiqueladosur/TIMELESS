(()=>{'use strict';
const db=window.supabase.createClient('https://nfphzvcwxyfkbucwwlcx.supabase.co','sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS');
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function deliver(id){
const [o,i,d]=await Promise.all([
db.from('orders').select('id,status,order_number').eq('id',id).single(),
db.from('order_items').select('id,product_name,quantity').eq('order_id',id),
db.from('order_deliveries').select('id').eq('order_id',id)]);
for(const r of [o,i,d])if(r.error)throw r.error;
if(o.data.status!=='shipped')throw Error('El pedido debe estar En ruta');
let counts={};if(d.data.length){const r=await db.from('delivery_lines').select('order_item_id,quantity').in('delivery_id',d.data.map(x=>x.id));if(r.error)throw r.error;for(const x of r.data)counts[x.order_item_id]=(counts[x.order_item_id]||0)+x.quantity}
const wrap=document.getElementById('ship-partial');wrap.innerHTML='<h3>Entrega parcial · '+clean(o.data.order_number)+'</h3><form id="ship-delivery-form">'+i.data.map(x=>{const left=x.quantity-(counts[x.id]||0);return '<label style="display:flex;justify-content:space-between;margin:9px 0">'+clean(x.product_name)+' ('+left+' pendientes)<input type="number" data-id="'+x.id+'" min="0" max="'+left+'" value="0" step="1" style="width:70px"></label>'}).join('')+'<p><input name="carrier" maxlength="120" placeholder="Transportista"> <input name="tracking" maxlength="120" placeholder="Seguimiento"></p><button class="btn primary">Confirmar unidades entregadas</button></form>';
wrap.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,payload=[];
for(const input of form.querySelectorAll('[data-id]')){const qty=Number(input.value);if(!Number.isInteger(qty)||qty<0||qty>Number(input.max))return alert('Cantidad inválida');if(qty)payload.push({order_item_id:input.dataset.id,quantity:qty})}
if(!payload.length)return alert('Selecciona unidades.');
if(!confirm('Se descontarán '+payload.reduce((n,x)=>n+x.quantity,0)+' unidades. ¿Confirmar entrega física?'))return;
const b=form.querySelector('button');b.disabled=true;
try{const r=await db.rpc('record_order_delivery',{p_order_id:id,p_items:payload,p_carrier:form.elements.carrier.value,p_tracking:form.elements.tracking.value,p_notes:null});if(r.error)throw r.error;alert('Entrega '+r.data.delivery_number+' registrada. Pendientes: '+r.data.remaining_units);wrap.innerHTML='';document.getElementById('ship-refresh')?.click()}catch(err){alert('Error: '+err.message)}finally{b.disabled=false}};
}
document.addEventListener('click',async e=>{const button=e.target.closest('[data-partial-delivery]');if(!button)return;try{await deliver(button.closest('[data-ship-id]').dataset.shipId)}catch(err){alert(err.message)}});
})();
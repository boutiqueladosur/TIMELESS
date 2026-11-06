(()=>{
'use strict';
const URL='https://nfphzvcwxyfkbucwwlcx.supabase.co',KEY='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true}});
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)||0);
const labels={draft:'Borrador',sent:'Enviada',in_transit:'En tránsito',received:'Recibida',closed:'Cerrada',cancelled:'Cancelada'};
let suppliers=[],products=[],orders=[];
async function isAdmin(){const{data:{user}}=await db.auth.getUser();return user?.app_metadata?.role==='admin'}
function styles(){if($('purchases-style'))return;const s=document.createElement('style');s.id='purchases-style';s.textContent='.purchase-list{display:grid;gap:12px}.purchase-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:#fff}.purchase-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.purchase-items{margin:10px 0;padding:10px;background:#faf8f5;border-radius:10px}.purchase-row{display:grid;grid-template-columns:1.5fr .6fr .8fr auto;gap:8px;align-items:end;margin:8px 0}.purchase-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.purchase-badge{padding:5px 8px;border-radius:999px;background:#f0ece7;font-size:11px;font-weight:700}@media(max-width:700px){.purchase-row{grid-template-columns:1fr 1fr}.purchase-row>:first-child{grid-column:1/-1}}';document.head.appendChild(s)}
function build(){const panel=$('tab-purchases');if(!panel||$('purchases-management'))return;const wrap=document.createElement('div');wrap.id='purchases-management';wrap.innerHTML=`<div class="orders-card"><div class="orders-head"><div><strong>Órdenes de compra</strong><div class="muted small">Crea compras a proveedores y recibe mercadería directamente al inventario.</div></div><button id="new-purchase" class="btn primary" type="button">+ Nueva orden</button></div><div class="orders-tools"><input id="purchase-search" placeholder="Buscar OC o proveedor"><select id="purchase-filter"><option value="all">Todos los estados</option>${Object.entries(labels).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div><div id="purchase-list" class="purchase-list" style="margin-top:12px"></div></div>`;panel.appendChild(wrap);$('new-purchase').onclick=openNew;$('purchase-search').oninput=render;$('purchase-filter').onchange=render;wrap.addEventListener('click',handleList)}
async function load(){if(!(await isAdmin()))return;build();const [s,p,o]=await Promise.all([db.from('suppliers').select('id,company_name,is_active').eq('is_active',true).order('company_name'),db.from('products').select('id,name,sku,is_active').order('name'),db.from('purchase_orders').select('id,purchase_number,supplier_id,status,order_date,expected_date,received_at,inventory_received_at,notes,total_clp,created_at,suppliers(company_name),purchase_order_items(id,product_id,quantity,unit_cost_clp,line_total_clp,products(name,sku))').order('created_at',{ascending:false}).limit(200)]);if(s.error||p.error||o.error){console.error(s.error||p.error||o.error);return}suppliers=s.data||[];products=p.data||[];orders=o.data||[];render()}
function filtered(){const q=($('purchase-search')?.value||'').toLowerCase().trim(),f=$('purchase-filter')?.value||'all';return orders.filter(o=>(f==='all'||o.status===f)&&(!q||`${o.purchase_number} ${o.suppliers?.company_name||''}`.toLowerCase().includes(q)))}
function render(){const list=$('purchase-list');if(!list)return;const rows=filtered();list.innerHTML=rows.length?rows.map(o=>`<article class="purchase-card" data-purchase-id="${esc(o.id)}"><div class="purchase-head"><div><strong>${esc(o.purchase_number)}</strong><div class="small muted">${esc(o.suppliers?.company_name||'Sin proveedor')} · ${esc(o.order_date||'')}</div></div><div><span class="purchase-badge">${esc(labels[o.status]||o.status)}</span> <strong>${money(o.total_clp)}</strong></div></div><div class="purchase-items">${(o.purchase_order_items||[]).map(i=>`<div>${esc(i.products?.name||'Producto')} × ${i.quantity} · ${money(i.unit_cost_clp)} c/u</div>`).join('')||'Sin productos'}</div><div class="purchase-actions"><select data-status>${(o.status==='received'?[['received',labels.received]]:Object.entries(labels).filter(([v])=>v!=='received')).map(([v,l])=>`<option value="${v}" ${o.status===v?'selected':''}>${l}</option>`).join('')}</select><button class="btn secondary" data-save-status type="button" ${o.status==='received'?'disabled':''}>Guardar estado</button>${!['received','closed','cancelled'].includes(o.status)&&!o.inventory_received_at?`<button class="btn primary" data-receive-purchase type="button">Recepcionar artículos</button>`:''}</div></article>`).join(''):'<div class="empty">No hay órdenes de compra.</div>'}
function modal(){let m=$('purchase-modal');if(m)return m;m=document.createElement('div');m.id='purchase-modal';m.className='overlay hidden';m.innerHTML=`<form id="purchase-form" class="modal" style="width:min(900px,100%)"><div class="modal-head"><h2>Nueva orden de compra</h2><button class="icon" type="button" data-close-purchase>✕</button></div><div class="grid"><div class="field"><label>Proveedor *</label><select id="purchase-supplier" required></select></div><div class="field"><label>Fecha esperada</label><input id="purchase-expected" type="date"></div></div><div class="field"><label>Notas</label><textarea id="purchase-notes" rows="2"></textarea></div><div><strong>Productos</strong><div id="purchase-items"></div><button type="button" id="add-purchase-item" class="btn secondary">+ Agregar producto</button></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="btn secondary" data-close-purchase>Cancelar</button><button class="btn primary" type="submit">Crear orden</button></div></form>`;document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close-purchase]'))m.classList.add('hidden')});$('add-purchase-item').onclick=addItem;$('purchase-form').onsubmit=saveNew;return m}
function productOptions(){return products.filter(p=>p.is_active).map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.sku)}</option>`).join('')}
function addItem(){const c=$('purchase-items');const row=document.createElement('div');row.className='purchase-row';row.innerHTML=`<div class="field" style="margin:0"><label>Producto</label><select data-product required>${productOptions()}</select></div><div class="field" style="margin:0"><label>Cantidad</label><input data-qty type="number" min="1" step="1" value="1" required></div><div class="field" style="margin:0"><label>Costo unitario</label><input data-cost type="number" min="0" step="1" value="0" required></div><button type="button" class="btn danger" data-remove-item>Quitar</button>`;row.querySelector('[data-remove-item]').onclick=()=>row.remove();c.appendChild(row)}
function openNew(){const m=modal();$('purchase-supplier').innerHTML=suppliers.map(s=>`<option value="${esc(s.id)}">${esc(s.company_name)}</option>`).join('');$('purchase-expected').value='';$('purchase-notes').value='';$('purchase-items').innerHTML='';addItem();m.classList.remove('hidden')}
async function saveNew(e){e.preventDefault();const rows=[...document.querySelectorAll('#purchase-items .purchase-row')];if(!rows.length)return alert('Agrega al menos un producto.');const items=rows.map(r=>({product_id:r.querySelector('[data-product]').value,quantity:Math.max(1,Math.round(Number(r.querySelector('[data-qty]').value)||1)),unit_cost_clp:Math.max(0,Math.round(Number(r.querySelector('[data-cost]').value)||0))}));const num=`OC-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${String(Date.now()).slice(-6)}`;const {data:po,error}=await db.from('purchase_orders').insert({purchase_number:num,supplier_id:$('purchase-supplier').value,status:'draft',expected_date:$('purchase-expected').value||null,notes:$('purchase-notes').value.trim()||null}).select('id').single();if(error)return alert(error.message);const {error:ie}=await db.from('purchase_order_items').insert(items.map(i=>({...i,purchase_order_id:po.id})));if(ie){await db.from('purchase_orders').delete().eq('id',po.id);return alert(ie.message)}$('purchase-modal').classList.add('hidden');await load()}
async function handleList(e){const receive=e.target.closest('[data-receive-purchase]');if(receive){const card=receive.closest('[data-purchase-id]');if(card)await openReceipt(card.dataset.purchaseId);return}const b=e.target.closest('[data-save-status]');if(!b)return;const card=b.closest('[data-purchase-id]'),status=card.querySelector('[data-status]').value,id=card.dataset.purchaseId;if(status==='received')return alert('Usa Recepcionar artículos: no se puede marcar recibida manualmente.');b.disabled=true;try{const {error}=await db.from('purchase_orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;b.textContent='Guardado ✓';await load();if(status==='received')setTimeout(()=>location.reload(),250)}catch(err){console.error(err);alert(err.message||'No se pudo actualizar la orden.')}finally{b.disabled=false}}

const RECEIPT_RETRY_PREFIX='timeless_purchase_receipt_retry_';
function receiptRetryId(purchaseId,items){
  const signature=JSON.stringify(items.map(i=>[i.purchase_order_item_id,i.quantity]).sort((a,b)=>a[0].localeCompare(b[0])));
  const key=RECEIPT_RETRY_PREFIX+purchaseId;
  try{
    const cached=JSON.parse(sessionStorage.getItem(key)||'null');
    if(cached?.signature===signature&&/^[0-9a-f-]{36}$/i.test(cached.id))return cached.id;
    const id=crypto.randomUUID();
    sessionStorage.setItem(key,JSON.stringify({id,signature}));
    return id;
  }catch{return crypto.randomUUID()}
}
function clearReceiptRetry(purchaseId){try{sessionStorage.removeItem(RECEIPT_RETRY_PREFIX+purchaseId)}catch{}}
function formatReceiptDate(value){return value?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—'}
async function openReceipt(purchaseId){
  const order=orders.find(o=>o.id===purchaseId);
  if(!order||['received','closed','cancelled'].includes(order.status)||order.inventory_received_at)return;
  let overlay=$('purchase-receipt-modal');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='purchase-receipt-modal';
    overlay.className='overlay hidden';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML='<div class="modal" style="width:min(850px,100%)"><div class="modal-head"><h2>Recepcionar artículos</h2><button class="icon" type="button" data-close-receipt>✕</button></div><p class="muted">Cargando cantidades pendientes…</p></div>';
  overlay.classList.remove('hidden');
  overlay.querySelector('[data-close-receipt]').onclick=()=>overlay.classList.add('hidden');
  try{
    const {data,error}=await db.from('purchase_receipts')
      .select('id,received_at,notes,purchase_receipt_lines(purchase_order_item_id,quantity)')
      .eq('purchase_order_id',purchaseId).order('received_at',{ascending:false});
    if(error)throw error;
    if(overlay.classList.contains('hidden'))return;
    const receipts=data||[],received=new Map();
    for(const receipt of receipts)for(const line of receipt.purchase_receipt_lines||[]){
      received.set(line.purchase_order_item_id,(received.get(line.purchase_order_item_id)||0)+Number(line.quantity||0));
    }
    const lines=(order.purchase_order_items||[]).map(item=>({
      ...item,remaining:Math.max(0,Number(item.quantity||0)-(received.get(item.id)||0)),
      already:received.get(item.id)||0
    }));
    const pending=lines.filter(item=>item.remaining>0);
    const history=receipts.length?receipts.map(r=>{
      const total=(r.purchase_receipt_lines||[]).reduce((sum,line)=>sum+Number(line.quantity||0),0);
      return `<div class="small muted">${formatReceiptDate(r.received_at)} · ${total} unidad(es)${r.notes?' · '+esc(r.notes):''}</div>`;
    }).join(''):'<div class="small muted">Sin recepciones parciales registradas.</div>';
    overlay.innerHTML=`<div class="modal" style="width:min(850px,100%)">
      <div class="modal-head"><h2>Recepcionar artículos · ${esc(order.purchase_number)}</h2><button type="button" class="icon" data-close-receipt>✕</button></div>
      <p class="muted small">Registra solo la mercadería efectivamente recibida. Cada recepción actualiza stock y costo mediante una operación atómica de Supabase.</p>
      <div class="purchase-items">${pending.length?pending.map(item=>`<div class="purchase-row" data-receipt-item="${esc(item.id)}">
        <div><strong>${esc(item.products?.name||'Producto')}</strong><div class="muted small">${esc(item.products?.sku||'')} · Solicitado: ${Number(item.quantity)} · Recibido: ${item.already} · Pendiente: ${item.remaining}</div></div>
        <div class="small">${money(item.unit_cost_clp)} c/u</div>
        <div class="field" style="margin:0"><label>Cantidad recibida</label><input data-receipt-qty type="number" min="0" max="${item.remaining}" step="1" value="0"></div>
      </div>`).join(''):'<div class="notice">Esta orden ya no tiene unidades pendientes de recepción.</div>'}</div>
      <div class="field"><label>Notas de recepción</label><textarea id="purchase-receipt-notes" maxlength="1000" rows="2" placeholder="Observaciones del ingreso"></textarea></div>
      <div id="purchase-receipt-message" class="notice hidden" role="alert"></div>
      <div class="purchase-actions"><button class="btn secondary" type="button" data-close-receipt>Cancelar</button>
        <button id="purchase-receipt-save" class="btn primary" type="button" ${pending.length?'':'disabled'}>Registrar recepción</button></div>
      <h3 style="font-size:15px;margin-top:18px">Historial de recepciones</h3>${history}
    </div>`;
    overlay.querySelectorAll('[data-close-receipt]').forEach(btn=>btn.onclick=()=>overlay.classList.add('hidden'));
    const submit=overlay.querySelector('#purchase-receipt-save');
    if(submit)submit.onclick=async()=>{
      const inputs=[...overlay.querySelectorAll('[data-receipt-item]')];
      const selected=[],invalid=[];
      for(const row of inputs){
        const input=row.querySelector('[data-receipt-qty]');
        if(input.value.trim()===''){invalid.push('Ingresa una cantidad para cada artículo.');continue}
        const qty=Number(input.value),line=pending.find(x=>x.id===row.dataset.receiptItem);
        if(!Number.isInteger(qty)||qty<0||qty>line.remaining){invalid.push('Una cantidad excede el saldo pendiente o no es un número entero.');continue}
        if(qty>0)selected.push({purchase_order_item_id:line.id,quantity:qty});
      }
      const message=overlay.querySelector('#purchase-receipt-message');
      const show=txt=>{message.textContent=txt;message.classList.remove('hidden')};
      message.classList.add('hidden');
      if(invalid.length)return show(invalid[0]);
      if(!selected.length)return show('Indica al menos una unidad recibida.');
      const requestId=receiptRetryId(purchaseId,selected);
      submit.disabled=true;submit.textContent='Registrando…';
      try{
        const {data:result,error:rpcError}=await db.rpc('record_purchase_receipt',{
          p_request_id:requestId,p_purchase_order_id:purchaseId,
          p_items:selected,p_notes:overlay.querySelector('#purchase-receipt-notes').value.trim()||null
        });
        if(rpcError)throw rpcError;
        if(!result?.receipt_id)throw new Error('No se recibió confirmación de la recepción. Reintenta para consultar el mismo identificador.');
        clearReceiptRetry(purchaseId);
        overlay.classList.add('hidden');
        await load();
        alert(result.already_recorded?'Recepción ya registrada previamente; no se duplicó el stock.':result.completed?'Recepción registrada. Orden completada.':'Recepción parcial registrada. Quedan unidades pendientes.');
      }catch(err){
        console.error('Recepción de compra fallida',err);
        show((err?.message||'No se pudo confirmar la recepción.')+' Puedes reintentar sin duplicar stock.');
      }finally{submit.disabled=false;submit.textContent='Registrar recepción'}
    };
  }catch(err){
    console.error('No se cargó la recepción',err);
    overlay.innerHTML=`<div class="modal"><h2>No se pudo abrir la recepción</h2><p class="notice">${esc(err?.message||'Verifica conexión y MFA.')}</p><button class="btn secondary" type="button" data-close-receipt>Cerrar</button></div>`;
    overlay.querySelector('[data-close-receipt]').onclick=()=>overlay.classList.add('hidden');
  }
}

function init(){styles();const t=setInterval(()=>{if($('tab-purchases')){clearInterval(t);build();load()}},100);setTimeout(()=>clearInterval(t),5000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
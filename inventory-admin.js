(()=>{
'use strict';
const SUPABASE_URL='https://nfphzvcwxyfkbucwwlcx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true}});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let items=[],suppliers=[];
const movementLabels={entry:'Entrada',return_to_stock:'Devolución a stock',unavailable:'Baja / no disponible',damaged:'Dañado',lost:'Pérdida'};
async function isAdmin(){const {data:{user}}=await db.auth.getUser();return user?.app_metadata?.role==='admin'}
function ensureUI(){
  const panel=document.getElementById('tab-inventory');if(!panel||document.getElementById('inventory-management'))return;
  const wrap=document.createElement('div');wrap.id='inventory-management';
  wrap.innerHTML=`<div class="orders-card"><div class="orders-head"><div><strong>Gestión de inventario</strong><div class="muted small">El stock actual es calculado: entradas y devoluciones suman; entregas, bajas, daños y pérdidas restan.</div></div><button id="refresh-inventory" class="btn secondary" type="button">Actualizar</button></div><div class="orders-tools"><input id="inventory-search" placeholder="Buscar producto o SKU"><select id="inventory-filter"><option value="all">Todos</option><option value="low">Stock bajo</option><option value="out">Sin stock</option><option value="inactive">No disponibles para venta</option></select></div><div id="inventory-list" class="products" style="margin-top:12px"></div></div>`;
  panel.appendChild(wrap);
  document.getElementById('refresh-inventory').addEventListener('click',load);
  document.getElementById('inventory-search').addEventListener('input',render);
  document.getElementById('inventory-filter').addEventListener('change',render);
  wrap.addEventListener('click',handleClick);
}
async function load(){
  if(!(await isAdmin()))return;ensureUI();
  const [pc,sc]=await Promise.all([
    db.from('products').select('id,sku,name,stock,low_stock_threshold,is_active,supplier_id').order('name'),
    db.from('suppliers').select('id,company_name,is_active').order('company_name')
  ]);
  if(pc.error){console.error(pc.error);return}if(sc.error){console.error(sc.error);return}
  items=pc.data||[];suppliers=sc.data||[];render();
}
function filtered(){
  const q=(document.getElementById('inventory-search')?.value||'').toLowerCase().trim(),f=document.getElementById('inventory-filter')?.value||'all';
  return items.filter(p=>{const stock=Number(p.stock)||0,low=stock<=(Number(p.low_stock_threshold)||0),available=p.is_active?stock:0;return(!q||`${p.name} ${p.sku}`.toLowerCase().includes(q))&&(f==='all'||(f==='low'&&low)||(f==='out'&&stock===0)||(f==='inactive'&&available===0&&!p.is_active))});
}
function supplierOptions(selected){return `<option value="">Sin proveedor</option>${suppliers.map(s=>`<option value="${esc(s.id)}" ${selected===s.id?'selected':''}>${esc(s.company_name)}${s.is_active?'':' · Inactivo'}</option>`).join('')}`}
function movementOptions(){return Object.entries(movementLabels).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
function render(){
  const list=document.getElementById('inventory-list');if(!list)return;
  const rows=filtered();
  list.innerHTML=rows.length?rows.map(p=>{const stock=Number(p.stock)||0,available=p.is_active?stock:0;return `<article class="row" data-inventory-id="${esc(p.id)}" style="grid-template-columns:1.25fr .95fr .58fr .68fr .68fr 1.25fr auto;align-items:end"><div><strong>${esc(p.name)}</strong><div class="muted small">${esc(p.sku)} · ${p.is_active?'Activo':'Inactivo / no vendible'}</div></div><div class="field" style="margin:0"><label>Proveedor</label><select data-supplier>${supplierOptions(p.supplier_id)}</select></div><div class="field" style="margin:0"><label>Stock actual</label><input type="number" value="${stock}" readonly title="Calculado desde el kardex"></div><div class="field" style="margin:0"><label>Disponible venta</label><input type="number" value="${available}" readonly title="0 si el producto está inactivo"></div><div class="field" style="margin:0"><label>Alerta stock bajo</label><input data-threshold type="number" min="0" step="1" value="${Number(p.low_stock_threshold)||0}"></div><div class="field" style="margin:0"><label>Registrar movimiento</label><div style="display:grid;grid-template-columns:1fr 76px;gap:6px"><select data-movement>${movementOptions()}</select><input data-qty type="number" min="1" step="1" value="1" aria-label="Cantidad"></div></div><div class="actions" style="flex-direction:column"><button class="btn primary" type="button" data-apply-movement>Aplicar</button><button class="btn secondary" type="button" data-save-config>Guardar</button></div></article>`}).join(''):'<div class="empty">No hay productos con esos filtros.</div>';
}
async function saveConfig(row,btn){
  const low=Math.max(0,Math.round(Number(row.querySelector('[data-threshold]').value)||0));
  const supplier_id=row.querySelector('[data-supplier]')?.value||null;btn.disabled=true;
  try{const {error}=await db.from('products').update({low_stock_threshold:low,supplier_id,updated_at:new Date().toISOString()}).eq('id',row.dataset.inventoryId);if(error)throw error;btn.textContent='Guardado ✓';setTimeout(()=>btn.textContent='Guardar',900)}catch(err){console.error(err);btn.textContent='Error';setTimeout(()=>btn.textContent='Guardar',1200)}finally{btn.disabled=false}
}
async function applyMovement(row,btn){
  const type=row.querySelector('[data-movement]')?.value||'entry';
  const qty=Math.max(1,Math.round(Number(row.querySelector('[data-qty]')?.value)||1));
  const positive=type==='entry'||type==='return_to_stock';
  const delta=positive?qty:-qty;
  btn.disabled=true;
  try{
    const {error}=await db.from('inventory_movements').insert({product_id:row.dataset.inventoryId,movement_type:type,quantity_delta:delta,note:`Movimiento manual desde panel: ${movementLabels[type]}`});
    if(error)throw error;
    btn.textContent='Aplicado ✓';
    try{sessionStorage.setItem('timeless_admin_tab','inventory')}catch{}
    setTimeout(()=>window.location.reload(),350);
  }catch(err){console.error(err);btn.textContent='Error';setTimeout(()=>btn.textContent='Aplicar',1400);btn.disabled=false}
}
async function handleClick(e){
  const row=e.target.closest('[data-inventory-id]');if(!row)return;
  const apply=e.target.closest('[data-apply-movement]');if(apply)return applyMovement(row,apply);
  const save=e.target.closest('[data-save-config]');if(save)return saveConfig(row,save);
}
function init(){const timer=setInterval(()=>{if(document.getElementById('tab-inventory')){clearInterval(timer);ensureUI();load()}},100);setTimeout(()=>clearInterval(timer),5000);document.addEventListener('timeless:suppliers-updated',load)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

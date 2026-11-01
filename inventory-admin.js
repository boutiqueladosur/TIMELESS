(()=>{
'use strict';
const SUPABASE_URL='https://nfphzvcwxyfkbucwwlcx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true}});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let items=[],suppliers=[];
async function isAdmin(){const {data:{user}}=await db.auth.getUser();return user?.app_metadata?.role==='admin'}
function ensureUI(){
  const panel=document.getElementById('tab-inventory'); if(!panel||document.getElementById('inventory-management'))return;
  const wrap=document.createElement('div'); wrap.id='inventory-management';
  wrap.innerHTML=`<div class="orders-card"><div class="orders-head"><div><strong>Gestión de inventario</strong><div class="muted small">Ajusta existencias, proveedor y umbrales de stock bajo sin editar cada ficha.</div></div><button id="refresh-inventory" class="btn secondary" type="button">Actualizar</button></div><div class="orders-tools"><input id="inventory-search" placeholder="Buscar producto o SKU"><select id="inventory-filter"><option value="all">Todos</option><option value="low">Stock bajo</option><option value="out">Sin stock</option></select></div><div id="inventory-list" class="products" style="margin-top:12px"></div></div>`;
  panel.appendChild(wrap);
  document.getElementById('refresh-inventory').addEventListener('click',load);
  document.getElementById('inventory-search').addEventListener('input',render);
  document.getElementById('inventory-filter').addEventListener('change',render);
  wrap.addEventListener('click',saveRow);
}
async function load(){
  if(!(await isAdmin()))return;ensureUI();
  const [pc,sc]=await Promise.all([
    db.from('products').select('id,sku,name,stock,low_stock_threshold,is_active,supplier_id').order('name'),
    db.from('suppliers').select('id,company_name,is_active').order('company_name')
  ]);
  if(pc.error){console.error(pc.error);return}if(sc.error){console.error(sc.error);return}
  items=pc.data||[];suppliers=sc.data||[];render()
}
function filtered(){const q=(document.getElementById('inventory-search')?.value||'').toLowerCase().trim(),f=document.getElementById('inventory-filter')?.value||'all';return items.filter(p=>{const stock=Number(p.stock)||0,low=stock<=(Number(p.low_stock_threshold)||0);return(!q||`${p.name} ${p.sku}`.toLowerCase().includes(q))&&(f==='all'||(f==='low'&&low)||(f==='out'&&stock===0))})}
function supplierOptions(selected){return `<option value="">Sin proveedor</option>${suppliers.map(s=>`<option value="${esc(s.id)}" ${selected===s.id?'selected':''}>${esc(s.company_name)}${s.is_active?'':' · Inactivo'}</option>`).join('')}`}
function render(){const list=document.getElementById('inventory-list');if(!list)return;const rows=filtered();list.innerHTML=rows.length?rows.map(p=>`<article class="row" data-inventory-id="${esc(p.id)}" style="grid-template-columns:1.45fr 1fr .75fr .75fr auto"><div><strong>${esc(p.name)}</strong><div class="muted small">${esc(p.sku)} · ${p.is_active?'Activo':'Inactivo'}</div></div><div class="field" style="margin:0"><label>Proveedor</label><select data-supplier>${supplierOptions(p.supplier_id)}</select></div><div class="field" style="margin:0"><label>Stock actual</label><input data-stock type="number" min="0" step="1" value="${Number(p.stock)||0}"></div><div class="field" style="margin:0"><label>Alerta stock bajo</label><input data-threshold type="number" min="0" step="1" value="${Number(p.low_stock_threshold)||0}"></div><button class="btn primary" type="button" data-save-inventory>Guardar</button></article>`).join(''):'<div class="empty">No hay productos con esos filtros.</div>'}
async function saveRow(e){const btn=e.target.closest('[data-save-inventory]');if(!btn)return;const row=btn.closest('[data-inventory-id]');if(!row)return;const stock=Math.max(0,Math.round(Number(row.querySelector('[data-stock]').value)||0));const low=Math.max(0,Math.round(Number(row.querySelector('[data-threshold]').value)||0));const supplier_id=row.querySelector('[data-supplier]')?.value||null;btn.disabled=true;try{const {error}=await db.from('products').update({stock,low_stock_threshold:low,supplier_id,updated_at:new Date().toISOString()}).eq('id',row.dataset.inventoryId);if(error)throw error;btn.textContent='Guardado ✓';await load();setTimeout(()=>btn.textContent='Guardar',1000)}catch(err){console.error(err);btn.textContent='Error';setTimeout(()=>btn.textContent='Guardar',1200)}finally{btn.disabled=false}}
function init(){const timer=setInterval(()=>{if(document.getElementById('tab-inventory')){clearInterval(timer);ensureUI();load()}},100);setTimeout(()=>clearInterval(timer),5000);document.addEventListener('timeless:suppliers-updated',load)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

(()=>{
'use strict';

const $=id=>document.getElementById(id);

function injectStyles(){
  if($('admin-tabs-styles'))return;
  const style=document.createElement('style');
  style.id='admin-tabs-styles';
  style.textContent=`
    .admin-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 22px;padding:7px;background:#eee8e0;border-radius:16px}
    .admin-tab{border:0;background:transparent;border-radius:11px;padding:11px 16px;cursor:pointer;font-weight:800;color:var(--muted);transition:.2s}
    .admin-tab:hover{background:rgba(255,255,255,.65);color:var(--ink)}
    .admin-tab.active{background:#111;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.12)}
    .admin-panel{display:none}
    .admin-panel.active{display:block}
    .admin-panel-head{margin:0 0 16px}
    .admin-panel-head h2{margin:0 0 5px;font-size:22px}
    .admin-panel-head p{margin:0;color:var(--muted);font-size:13px}
    .summary-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    @media(max-width:620px){.admin-tabs{display:grid;grid-template-columns:1fr 1fr}.admin-tab{width:100%;padding:10px 8px}.admin-panel-head h2{font-size:20px}}
  `;
  document.head.appendChild(style);
}

function loadModule(src,id){
  if(document.getElementById(id))return;
  const script=document.createElement('script');
  script.id=id;
  script.src=src;
  document.body.appendChild(script);
}

function makePanel(id,title,description){
  const panel=document.createElement('section');
  panel.id=id;
  panel.className='admin-panel';
  panel.innerHTML=`<div class="admin-panel-head"><h2>${title}</h2><p>${description}</p></div>`;
  return panel;
}

function activate(name){
  document.querySelectorAll('.admin-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===name));
  document.querySelectorAll('.admin-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===name));
  try{sessionStorage.setItem('timeless_admin_tab',name)}catch{}
}

function moveOrders(){
  const panel=$('tab-orders');
  const orders=$('orders-management');
  if(panel&&orders&&orders.parentElement!==panel){
    const placeholder=$('orders-placeholder');
    if(placeholder)placeholder.remove();
    panel.appendChild(orders);
  }
}

function buildTabs(){
  if($('admin-tabs'))return;
  const main=document.querySelector('#app-view main');
  const top=main?.querySelector('.top');
  if(!main||!top)return;

  const nav=document.createElement('nav');
  nav.id='admin-tabs';
  nav.className='admin-tabs';
  nav.setAttribute('aria-label','Secciones del panel');
  nav.innerHTML=`
    <button class="admin-tab" type="button" data-tab="summary">Resumen</button>
    <button class="admin-tab" type="button" data-tab="products">Productos</button>
    <button class="admin-tab" type="button" data-tab="inventory">Inventario</button>
    <button class="admin-tab" type="button" data-tab="suppliers">Proveedores</button>
    <button class="admin-tab" type="button" data-tab="orders">Pedidos</button>
    <button class="admin-tab" type="button" data-tab="settings">Configuración</button>`;
  top.insertAdjacentElement('afterend',nav);

  const summary=makePanel('tab-summary','Resumen','Vista general rápida de productos e inventario.');
  summary.dataset.panel='summary';
  const products=makePanel('tab-products','Productos','Administra catálogo, precios, descuentos, stock e imágenes.');
  products.dataset.panel='products';
  const inventory=makePanel('tab-inventory','Inventario','Controla existencias, proveedor y alertas de stock desde una vista dedicada.');
  inventory.dataset.panel='inventory';
  inventory.insertAdjacentHTML('beforeend','<div class="empty">Cargando inventario…</div>');
  const suppliers=makePanel('tab-suppliers','Proveedores','Administra proveedores, contactos y condiciones comerciales.');
  suppliers.dataset.panel='suppliers';
  suppliers.insertAdjacentHTML('beforeend','<div class="empty">Cargando proveedores…</div>');
  const orders=makePanel('tab-orders','Pedidos','Gestiona pedidos, documentos tributarios, devoluciones, pagos, preparación, despacho y entregas.');
  orders.dataset.panel='orders';
  orders.insertAdjacentHTML('beforeend','<div id="orders-placeholder" class="empty">Cargando gestión de pedidos…</div>');
  const settings=makePanel('tab-settings','Configuración','Ajustes generales de la tienda y canales de atención.');
  settings.dataset.panel='settings';

  main.append(summary,products,inventory,suppliers,orders,settings);

  const stats=main.querySelector('.stats');
  const settingsCard=main.querySelector('.settings-card');
  const toolbar=main.querySelector('.toolbar');
  const productList=$('products');

  if(stats)summary.appendChild(stats);
  summary.insertAdjacentHTML('beforeend','<div class="summary-actions"><button type="button" class="btn primary" data-go-tab="products">Administrar productos</button><button type="button" class="btn secondary" data-go-tab="inventory">Gestionar inventario</button><button type="button" class="btn secondary" data-go-tab="suppliers">Ver proveedores</button><button type="button" class="btn secondary" data-go-tab="orders">Ver pedidos</button></div>');
  if(toolbar)products.appendChild(toolbar);
  if(productList)products.appendChild(productList);
  if(settingsCard)settings.appendChild(settingsCard);

  nav.addEventListener('click',e=>{const btn=e.target.closest('[data-tab]');if(btn)activate(btn.dataset.tab)});
  main.addEventListener('click',e=>{const btn=e.target.closest('[data-go-tab]');if(btn)activate(btn.dataset.goTab)});

  moveOrders();
  const observer=new MutationObserver(moveOrders);
  observer.observe(main,{childList:true,subtree:true});

  loadModule('inventory-admin.js','inventory-admin-module');
  loadModule('suppliers-admin.js','suppliers-admin-module');
  loadModule('tax-documents-admin.js','tax-documents-admin-module');
  loadModule('returns-admin.js','returns-admin-module');

  let initial='summary';
  try{const saved=sessionStorage.getItem('timeless_admin_tab');if(['summary','products','inventory','suppliers','orders','settings'].includes(saved))initial=saved}catch{}
  activate(initial);
}

function init(){injectStyles();buildTabs();setTimeout(moveOrders,250);setTimeout(moveOrders,800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

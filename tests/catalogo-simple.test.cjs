'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const vm=require('node:vm');
const admin=readFileSync('admin.html','utf8');
const shop=readFileSync('index.html','utf8');
const catalog=readFileSync('catalogo-publico.js','utf8');

test('The public site is a simple WhatsApp catalog, not a checkout',()=>{
  assert.match(shop,/catalogo-publico\.js/);
  assert.match(shop,/id="whatsapp-header"/);
  assert.doesNotMatch(shop,/id="order-form"|id="cart-modal"|checkout\.js/);
  assert.doesNotMatch(catalog,/create-order|create_order_atomic|inventory_reservations/);
  assert.match(catalog,/messageLink/);
  assert.match(catalog,/wa\.me/);
});

test('Catalog retrieves product details and product images but no cost fields',()=>{
  assert.match(catalog,/\.from\('products'\)/);
  assert.match(catalog,/product_images\(image_url,sort_order,is_primary\)/);
  assert.doesNotMatch(catalog,/average_cost_clp|unit_cost_clp|supplier_id/);
});

test('The minimal panel supports photos, prices and inventory movements',()=>{
  for(const key of ['id="images"','id="price"','id="sale-price"','id="name"','id="description"','id="products"','id="save-whatsapp"','id="stock-quantity"','id="apply-stock"'])assert.ok(admin.includes(key),key);
  assert.match(admin,/uploadImages/);
  assert.match(admin,/async function adjustStock/);
  assert.match(admin,/db\.from\('inventory_movements'\)\.insert/);
  assert.match(admin,/Number\.isSafeInteger\(quantity\)/);
  assert.match(admin,/aal\?\.currentLevel!=='aal2'/);
  assert.match(admin,/id="stock"[^>]+readonly/);
});

test('ERP modules and checkout are absent from the store project',()=>{
  assert.doesNotMatch(admin,/(?:orders-admin|admin-tabs|payments-admin|kardex-admin)\.js/);
  for(const f of ['orders-admin.js','admin-tabs.js','payments-admin.js','kardex-admin.js','checkout.js'])assert.ok(!existsSync(f),f+' should not exist in storefront');
});

test('Admin keeps MFA and idle-session security',()=>{
  assert.match(admin,/security-admin\.js/);
  assert.match(admin,/session-idle\.js/);
});

test('All inline scripts parse correctly',()=>{
  for(const source of [admin,shop]){
    for(const [,attrs,body] of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
      if(!/\bsrc\s*=/.test(attrs)&&body.trim())assert.doesNotThrow(()=>new vm.Script(body));
    }
  }
  assert.doesNotThrow(()=>new vm.Script(catalog));
});

test('Editorial catalog has product cards, responsive layout and accessible product detail dialog',()=>{
  const css=readFileSync('catalogo-estilo.css','utf8');
  assert.match(shop,/catalogo-estilo\.css/);
  assert.match(shop,/id="product-modal"/);
  assert.match(shop,/role="dialog" aria-modal="true"/);
  assert.match(shop,/id="modal-whatsapp"/);
  assert.match(catalog,/function openDetail/);
  assert.match(catalog,/function closeDetail/);
  assert.match(catalog,/data-detail/);
  assert.match(catalog,/data-modal-index/);
  assert.match(catalog,/messageLink\(p\)/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/\.grid\{display:grid/);
});
test('Storefront does not disclose internal purchase costs or store credentials',()=>{
  assert.doesNotMatch(shop + catalog,/average_cost_clp|unit_cost_clp|supplier_id|SUPABASE_SERVICE_ROLE_KEY|service_role/);
  assert.doesNotMatch(shop,/checkout\.js|id="order-form"/);
});

test('Official Timeless identity appears on website and administration panel',()=>{
  const fs=require('node:fs');
  assert.match(shop,/assets\/timeless-portada\.svg/);
  assert.match(shop,/assets\/timeless-mariposa\.svg/);
  assert.match(admin,/assets\/timeless-mariposa\.svg/);
  assert.ok(fs.existsSync('assets/timeless-portada.svg'));
  assert.ok(fs.existsSync('assets/timeless-mariposa.svg'));
  const cover=fs.readFileSync('assets/timeless-portada.svg','utf8');
  const butterfly=fs.readFileSync('assets/timeless-mariposa.svg','utf8');
  assert.match(cover,/Carteras y accesorios para mujer/);
  assert.match(butterfly,/fill-rule="evenodd"/);
  const style=fs.readFileSync('catalogo-estilo.css','utf8');
  assert.match(style,/\.hero-banner/);
  assert.match(style,/\.brand-symbol/);
  assert.match(style,/\.story-identity/);
});

test('Mobile catalog keeps the product-detail button visible and touch gallery navigation',()=>{
  const css=readFileSync('catalogo-estilo.css','utf8');
  assert.match(catalog,/data-detail/);
  assert.match(catalog,/Ver fotos y detalles/);
  assert.match(css,/\.card \.details\{display:flex!important/);
  assert.match(shop,/id="modal-prev"/);
  assert.match(shop,/id="modal-next"/);
  assert.match(shop,/id="modal-count"/);
  assert.match(catalog,/touchstart/);
  assert.match(catalog,/touchend/);
  assert.match(catalog,/showImage\(modalIndex/);
});
test('Every product can be shared and opened from a direct URL',()=>{
  assert.match(catalog,/function productLink/);
  assert.match(catalog,/searchParams\.set\('producto'/);
  assert.match(catalog,/URLSearchParams\(location\.search\)\.get\('producto'/);
  assert.match(catalog,/history\.pushState/);
  assert.match(catalog,/window\.addEventListener\('popstate'/);
  assert.match(shop,/id="modal-copy"/);
  assert.match(catalog,/navigator\.clipboard\.writeText/);
});
test('Honest WhatsApp process, buying guidance and updated privacy',()=>{
  const privacy=readFileSync('privacidad.html','utf8');
  assert.match(shop,/id="como-comprar"/);
  assert.match(shop,/Confirma disponibilidad, costo y plazo/);
  assert.match(catalog,/Cuánto cuesta el despacho/);
  assert.match(privacy,/No ofrece carrito de compra ni registra pedidos automáticamente/);
  assert.doesNotMatch(privacy,/La tienda utiliza almacenamiento local del navegador para conservar los productos/);
});
test('Public storefront has a single semantic H1 and canonical URL',()=>{
  assert.equal((shop.match(/<h1(?:\s|>)/g)||[]).length,1);
  assert.match(shop,/rel="canonical"/);
  assert.match(shop,/TIMELESS TCO: carteras y accesorios/);
});

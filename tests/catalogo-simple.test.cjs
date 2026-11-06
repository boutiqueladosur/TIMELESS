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
  assert.match(catalog,/data-modal-image/);
  assert.match(catalog,/messageLink\(p\)/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/\.grid\{display:grid/);
});
test('Storefront does not disclose internal purchase costs or store credentials',()=>{
  assert.doesNotMatch(shop + catalog,/average_cost_clp|unit_cost_clp|supplier_id|SUPABASE_SERVICE_ROLE_KEY|service_role/);
  assert.doesNotMatch(shop,/checkout\.js|id="order-form"/);
});

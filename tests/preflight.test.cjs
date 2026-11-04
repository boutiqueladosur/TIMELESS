'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const file=name=>readFileSync(name,'utf8');

test('public checkout has only the server-backed submit handler',()=>{
 const html=file('index.html');
 const checkout=file('checkout.js');
 assert.doesNotMatch(html,/\$\('order-form'\)\.addEventListener\('submit'/);
 assert.match(html,/checkout\.js\?v=/);
 assert.match(checkout,/addEventListener\('submit',submitOrder,true\)/);
 assert.match(checkout,/functions\/v1\/create-order/);
 assert.match(checkout,/Pedido registrado/);
});
test('deployed order validation is recorded in source control',()=>{
 const server=file('supabase/functions/create-order/index.ts');
 assert.match(server,/Number\.isInteger\(x\.quantity\)/);
 assert.match(server,/consume_order_rate_limit/);
 assert.match(server,/create_order_atomic/);
});
test('sales documents use atomic RPC and no partial browser inserts',()=>{
 const tax=file('tax-documents-admin.js');
 assert.match(tax,/db\.rpc\('create_sales_document_atomic'/);
 assert.doesNotMatch(tax,/from\('sales_document_items'\)\.insert/);
});
test('approved Orders layout and HTML escaping remain unchanged',()=>{
 const orders=file('orders-admin.js');
 const layout=file('orders-layout.js');
 assert.match(orders,/Object\.entries\(statusLabels\)/);
 assert.match(orders,/&quot;/);
 assert.match(layout,/order-details/);
 assert.match(layout,/Ver artículos, documentos y editar pedido/);
});
test('inline scripts in public and admin HTML parse',()=>{
 for(const name of ['index.html','admin.html']){
  const html=file(name);
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for(const [,attrs,source] of scripts){
   if(/\bsrc\s*=/.test(attrs)||!source.trim())continue;
   assert.doesNotThrow(()=>new vm.Script(source,{filename:name}),name);
  }
 }
});


test('published checkout validates user input and pins Supabase dependency',()=>{
 const html=file('index.html');
 assert.match(html,/maxlength="160" autocomplete="name"/);
 assert.match(html,/maxlength="300" autocomplete="street-address"/);
 assert.match(html,/maxlength="1000" placeholder="Notas del pedido"/);
 assert.match(html,/supabase-js@2\.118\.0/);
 assert.doesNotMatch(html,/supabase-js@2["']/);
});
test('checkout only offers registered orders, not direct WhatsApp fallback',()=>{
 const checkout=file('checkout.js');
 assert.doesNotMatch(checkout,/showDirectWhatsApp|timeless-direct-whatsapp/);
 assert.match(checkout,/create-order/);
 assert.match(checkout,/Pedido registrado/);
});
test('HTML escape maps include quote entity terminator',()=>{
 const {readdirSync}=require('node:fs');
 for(const name of readdirSync('.').filter(n=>/\.(js|html)$/.test(n))){
  assert.doesNotMatch(file(name),/'&quot'/,name);
 }
});
test('approved Orders panel remains visually unchanged',()=>{
 const orders=file('orders-admin.js');
 assert.match(orders,/Object\.entries\(statusLabels\)/);
 assert.doesNotMatch(orders,/ORDERS_PAGE_SIZE/);
});
test('database audit covers financial and inventory reconciliation',()=>{
 const sql=file('docs/db-audit.sql');
 assert.match(sql,/Saldo distinto del total menos pagos/);
 assert.match(sql,/Stock distinto del Kardex/);
 assert.doesNotMatch(sql,/\b(?:drop|delete|update|truncate|alter|insert)\s+(?:table|from|into|public\.)/i);
});

test('partial delivery module is loaded in Shipping without altering Orders',()=>{
 const tabs=file('admin-tabs.js');
 const module=file('partial-delivery-admin.js');
 assert.match(tabs,/partial-delivery-admin\.js/);
 assert.match(module,/record_order_delivery/);
});
test('checkout only sends server-owned product prices',()=>{
 const checkout=file('checkout.js');
 assert.match(checkout,/product_id:x\.product_id,quantity:x\.quantity/);
 assert.doesNotMatch(checkout,/unit_price_clp:x\./);
});

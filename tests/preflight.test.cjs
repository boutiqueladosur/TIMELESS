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
test('orders use batched pagination and escape HTML attributes safely',()=>{
 const orders=file('orders-admin.js');
 assert.match(orders,/\.range\(offset,offset\+batchSize-1\)/);
 assert.match(orders,/orders-pagination/);
 assert.doesNotMatch(orders,/\.limit\(200\)/);
 assert.match(orders,/&quot;/);
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

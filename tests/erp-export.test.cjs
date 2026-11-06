'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const vm=require('node:vm');
const file=name=>readFileSync(name,'utf8');
test('ERP is an independent admin application without the storefront checkout',()=>{
 assert.match(file('index.html'),/Abrir panel ERP/);
 assert.ok(!existsSync('checkout.js'));
 assert.match(file('admin.html'),/admin-tabs\.js/);
});
test('ERP scripts and admin inline JavaScript parse',()=>{
 const src=file('admin.html');
 for(const [,attrs,script] of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!/\bsrc\s*=/.test(attrs)&&script.trim())assert.doesNotThrow(()=>new vm.Script(script));
 }
});
test('full business modules retained',()=>{
 for(const f of ['purchases-admin.js','orders-admin.js','inventory-admin.js','payments-admin.js','mfa-admin.js','session-idle.js','admin-tabs.js'])assert.ok(existsSync(f),f);
});
test('purchase receiving integrates atomic idempotent Supabase operation',()=>{
 const src=file('purchases-admin.js');
 assert.match(src,/db\.rpc\('record_purchase_receipt'/);
 assert.match(src,/RECEIPT_RETRY_PREFIX/);
 assert.doesNotMatch(src,/Al marcar como Recibida, las cantidades ingresarán automáticamente/);
});

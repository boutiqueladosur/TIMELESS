'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const vm=require('node:vm');
const html=readFileSync('admin.html','utf8');
const shop=readFileSync('index.html','utf8');
test('Minimal panel keeps product and image management',()=>{
 for(const marker of ['id="images"','id="price"','id="sale-price"','id="name"','id="description"','id="products"','id="save-whatsapp"'])assert.ok(html.includes(marker),marker);
 assert.match(html,/uploadImages/);
 assert.match(html,/Supabase/);
});
test('No large ERP modules are loaded from the minimal panel',()=>{
 assert.doesNotMatch(html,/(?:orders-admin|admin-tabs|payments-admin|kardex-admin)\.js/);
 for(const f of ['orders-admin.js','admin-tabs.js','payments-admin.js','kardex-admin.js'])assert.ok(!existsSync(f),f+' should be extracted');
});
test('Catalog retains server-protected checkout',()=>{
 assert.match(shop,/checkout\.js\?v=/);
 assert.match(readFileSync('checkout.js','utf8'),/create-order/);
});
test('MFA and idle security are loaded in minimal panel',()=>{
 assert.match(html,/security-admin\.js/);
 assert.match(html,/session-idle\.js/);
 assert.ok(existsSync('security-admin.js'));
});
test('Inline admin scripts parse',()=>{
 for(const [,attrs,body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!/\bsrc\s*=/.test(attrs)&&body.trim())assert.doesNotThrow(()=>new vm.Script(body));
 }
});

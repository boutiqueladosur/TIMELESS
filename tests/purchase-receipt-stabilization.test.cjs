'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');

const source=readFileSync('purchases-admin.js','utf8');

test('Purchases cannot directly mark inventory as received',()=>{
  assert.match(source,/Object\.entries\(labels\)\.filter\(\(\[v\]\)=>v!==['"]received['"]\)/);
  assert.match(source,/status===['"]received['"]\)return alert/);
  assert.doesNotMatch(source,/Al marcar como Recibida, las cantidades ingresarán automáticamente/);
});

test('Partial purchase receipts use the live atomic RPC and not direct inventory writes',()=>{
  assert.match(source,/db\.rpc\(['"]record_purchase_receipt['"]/);
  for(const name of ['p_request_id','p_purchase_order_id','p_items','p_notes']){
    assert.ok(source.includes(name),name+' missing from purchase RPC call');
  }
  assert.doesNotMatch(source,/db\.from\(['"]inventory_movements['"]\)\.insert\(/);
  assert.doesNotMatch(source,/db\.from\(['"]purchase_receipts['"]\)\.insert\(/);
  assert.doesNotMatch(source,/db\.from\(['"]purchase_receipt_lines['"]\)\.insert\(/);
});

test('Receipts show previously received and outstanding quantities',()=>{
  assert.match(source,/purchase_receipt_lines\(purchase_order_item_id,quantity\)/);
  assert.match(source,/received\.get\(item\.id\)/);
  assert.match(source,/item\.remaining>0/);
  assert.match(source,/Cantidad recibida/);
  assert.match(source,/Historial de recepciones/);
});

test('Receipts validate quantity and require a nonempty selection',()=>{
  assert.match(source,/Number\.isInteger\(qty\)/);
  assert.match(source,/qty>line\.remaining/);
  assert.match(source,/!selected\.length/);
  assert.match(source,/result\?\.receipt_id/);
  assert.match(source,/submit\.disabled=true/);
});

test('Retrying an uncertain receipt reuses its original idempotency key',()=>{
  assert.match(source,/RECEIPT_RETRY_PREFIX/);
  assert.match(source,/cached\?\.signature===signature/);
  assert.match(source,/sessionStorage\.setItem\(key,JSON\.stringify\(\{id,signature\}\)\)/);
  assert.match(source,/clearReceiptRetry\(purchaseId\)/);
  assert.match(source,/result\.already_recorded/);
  const catchSection=source.slice(source.indexOf("console.error('Recepción de compra fallida'"));
  assert.doesNotMatch(catchSection.slice(0,300),/clearReceiptRetry/);
});

test('Completed, closed and cancelled purchase orders never show receipt action',()=>{
  assert.match(source,/\!\['received','closed','cancelled'\]\.includes\(o\.status\)/);
  assert.match(source,/order\.inventory_received_at\)return/);
});

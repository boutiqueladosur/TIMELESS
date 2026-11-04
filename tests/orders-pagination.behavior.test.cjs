'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');

const ordersSource=readFileSync('orders-admin.js','utf8');
const instrumented=ordersSource.replace(/\}\)\(\);\s*$/, [
  'globalThis.__ordersTest={',
  ' loadOrders,loadMoreOrders,',
  ' state:()=>({size:orders.length,total:ordersTotal,hasMore:ordersHasMore,loading:ordersLoading})',
  '};})();'
].join(''));
assert.notEqual(instrumented,ordersSource,'Cannot instrument Orders script');

function fakeOrder(i){
 return {
  id:'order-'+i,order_number:'TM-'+i,customer_name:'Cliente '+i,
  customer_phone:'56912345678',shipping_address:'Calle 123',
  created_at:'2026-11-04T10:00:00Z',status:'paid',payment_status:'pending',
  total_clp:39000,shipping_clp:0,shipping_cost_clp:0,subtotal_clp:39000,discount_clp:0,
  paid_amount_clp:0,balance_due_clp:39000,order_items:[]
 };
}

function harness(respond,role='admin'){
 const nodes=new Map();
 const node=id=>{
  if(!nodes.has(id))nodes.set(id,{
   id,value:id==='order-filter'||id==='payment-filter'||id==='date-filter'?'all':id==='order-sort'?'newest':'',
   textContent:'',innerHTML:'',disabled:false,hidden:false,addEventListener(){},
  });
  return nodes.get(id);
 };
 const calls=[];
 const database={
  auth:{getUser:async()=>({data:{user:role?{app_metadata:{role}}:null}})},
  from(table){
   assert.equal(table,'orders');
   const call={select:null,order:null,range:null};calls.push(call);
   const chain={
    select(columns,options){call.select={columns,options};return chain},
    order(name,options){call.order={name,options};return chain},
    range(start,end){call.range=[start,end];return Promise.resolve().then(()=>respond(call,calls.length))}
   };
   return chain;
  }
 };
 const context={
  window:{supabase:{createClient:()=>database}},
  document:{readyState:'loading',addEventListener(){},getElementById:node},
  console:{error(){},warn(){},log(){}},
  Intl,Date,Number,String,Math,Object,Array,Set,JSON,
  setTimeout(){},clearTimeout(){},
 };
 vm.createContext(context);
 new vm.Script(instrumented,{filename:'orders-admin.js'}).runInContext(context);
 return {api:context.__ordersTest,node,calls};
}

test('Orders loads all four real-sized records without asking for another page',async()=>{
 const data=Array.from({length:4},(_,i)=>fakeOrder(i));
 const h=harness(()=>({data,error:null,count:4}));
 await h.api.loadMoreOrders();
 assert.equal(h.api.state().size,4);
 assert.equal(h.api.state().total,4);
 assert.equal(h.api.state().hasMore,false);
 assert.equal(h.node('orders-load-more').hidden,true);
 assert.deepEqual(h.calls[0].range,[0,99]);
 assert.match(h.node('orders-list').innerHTML,/TM-0/);
});

test('Orders loads second and third batches without losing earlier orders',async()=>{
 const data=Array.from({length:205},(_,i)=>fakeOrder(i));
 const h=harness(({range:[start,end]})=>({data:data.slice(start,end+1),error:null,count:205}));
 await h.api.loadMoreOrders();
 assert.equal(h.api.state().size,100);
 assert.equal(h.api.state().hasMore,true);
 await h.api.loadMoreOrders();
 assert.equal(h.api.state().size,200);
 await h.api.loadMoreOrders();
 assert.equal(h.api.state().size,205);
 assert.equal(h.api.state().hasMore,false);
 assert.deepEqual(h.calls.map(c=>c.range),[[0,99],[100,199],[200,299]]);
 assert.match(h.node('orders-list').innerHTML,/TM-204/);
});

test('Failed count query retries without exact count',async()=>{
 let n=0;
 const h=harness(()=>{n++;return n===1?
  {data:null,error:{message:'count blocked'},count:null}:
  {data:Array.from({length:4},(_,i)=>fakeOrder(i)),error:null,count:null};
 });
 await h.api.loadMoreOrders();
 assert.equal(h.api.state().size,4);
 assert.equal(h.api.state().hasMore,false);
 assert.equal(h.calls.length,2);
 assert.equal(h.calls[0].select.options.count,'exact');
 assert.equal(h.calls[1].select.options,undefined);
});

test('Two failed database queries display actionable error without deleting data',async()=>{
 const h=harness(()=>({data:null,error:{message:'Permiso RLS denegado'},count:null}));
 await h.api.loadMoreOrders();
 assert.equal(h.api.state().size,0);
 assert.match(h.node('orders-list').innerHTML,/Permiso RLS denegado/);
 assert.equal(h.calls.length,2);
});

test('Duplicate concurrent clicks only start one page request',async()=>{
 let release;
 const gate=new Promise(resolve=>release=resolve);
 const h=harness(async()=>{await gate;return {data:[fakeOrder(1)],error:null,count:1}});
 const first=h.api.loadMoreOrders();
 const second=h.api.loadMoreOrders();
 release();
 await Promise.all([first,second]);
 assert.equal(h.calls.length,1);
 assert.equal(h.api.state().size,1);
});

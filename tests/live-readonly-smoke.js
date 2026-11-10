'use strict';
/**
 * Live, read-only smoke test for the TIMELESS public catalog.
 * Uses the same public/publishable API key as the storefront.
 * Does not authenticate a user or modify data.
 */
const {readFileSync}=require('node:fs');
const source=readFileSync('catalogo-publico.js','utf8');
const match=source.match(/createClient\('([^']+)'\s*,\s*'([^']+)'\)/);
if(!match)throw new Error('No se encontraron URL y clave pública del catálogo.');
const [,base,key]=match;
const timeout=12000;
let failures=0;
async function checkApi(label,query){
 try{
  const response=await fetch(base+'/rest/v1/'+query,{headers:{apikey:key,Accept:'application/json'},signal:AbortSignal.timeout(timeout)});
  const data=await response.json();
  if(!response.ok||!Array.isArray(data)){
   console.error('FAIL',label,'HTTP',response.status,typeof data?.code==='string'?data.code:'respuesta inválida');
   failures++;return;
  }
  console.log('OK  ',label,'HTTP',response.status,data.length?'filas disponibles':'sin filas');
 }catch(error){console.error('FAIL',label,error.name||'error de red');failures++}
}
async function checkSite(label,url){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(timeout)});
  const body=await response.text();
  const valid=response.ok&&body.includes('TIMELESS')&&body.includes('catalogo-publico.js');
  console.log(valid?'OK  ':'WARN',label,'HTTP',response.status,'catálogo HTML:',valid?'sí':'no');
 }catch(error){console.log('WARN',label,error.name||'red no disponible')}
}
(async()=>{
 await checkApi('products + categories + images',
 'products?select=id,sku,name,description,price_clp,sale_price_clp,is_featured,is_active,stock,category_id,categories(name),product_images(image_url,sort_order,is_primary)&is_active=eq.true&limit=1');
 await checkApi('store_settings public WhatsApp','store_settings?select=whatsapp_number&id=eq.1&limit=1');
 await checkSite('GitHub Pages','https://boutiqueladosur.github.io/TIMELESS/');
 await checkSite('Netlify','https://timelesstco.netlify.app/');
 if(failures)process.exitCode=1;
})();

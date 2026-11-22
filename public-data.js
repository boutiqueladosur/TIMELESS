(()=>{'use strict';
const origin='https://nfphzvcwxyfkbucwwlcx.supabase.co';
const key='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const tables=new Set(['products','store_settings','site_content']);
function from(table){
 if(!tables.has(table))throw new Error('Public table not allowed');
 const params=new URLSearchParams(),sort=[];let signal,single=false;
 const q={select(columns){params.set('select',columns);return q},eq(col,value){params.append(col,'eq.'+String(value));return q},is(col,value){params.append(col,'is.'+String(value));return q},order(col,options={}){sort.push(col+'.'+(options.ascending===false?'desc':'asc'));return q},abortSignal(value){signal=value;return q},single(){single=true;return q},then(resolve,reject){return run().then(resolve,reject)}};
 async function run(){
  try{
   if(sort.length)params.set('order',sort.join(','));
   const response=await fetch(origin+'/rest/v1/'+table+'?'+params.toString(),{headers:{apikey:key,Accept:single?'application/vnd.pgrst.object+json':'application/json'},signal:signal||AbortSignal.timeout(12000)});
   if(!response.ok)return {data:null,error:new Error('Catalog request failed: '+response.status)};
   return {data:await response.json(),error:null};
  }catch(error){return {data:null,error}}
 }
 return q;
}
window.timelessPublicDB=Object.freeze({from});
})();

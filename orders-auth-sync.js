(()=>{
'use strict';
const URL='https://nfphzvcwxyfkbucwwlcx.supabase.co';
const KEY='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true}});
let lastReady=false,timer=null;
async function mfaReady(){const {data:{user}}=await db.auth.getUser();if(user?.app_metadata?.role!=='admin')return false;const {data,error}=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(error){console.error(error);return false}return data?.currentLevel==='aal2'}
async function refreshOrders(force=false){const ready=await mfaReady();if(!ready){lastReady=false;return}if(!force&&lastReady)return;lastReady=true;clearTimeout(timer);timer=setTimeout(()=>{const btn=document.getElementById('refresh-orders');if(btn)btn.click()},120)}
function init(){refreshOrders(true);db.auth.onAuthStateChange(()=>refreshOrders(true));document.addEventListener('timeless:admin-tab-changed',e=>{if(e.detail?.tab==='orders')refreshOrders(true)});window.addEventListener('focus',()=>refreshOrders(false))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
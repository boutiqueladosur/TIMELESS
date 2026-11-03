(()=>{
'use strict';
const IDLE_MS=30*60*1000;
const KEY='timeless_admin_last_activity';
let timer=null,loggingOut=false;

async function logout(){
  if(loggingOut)return;
  loggingOut=true;
  try{localStorage.removeItem(KEY)}catch{}
  try{
    const client=window.supabase?.createClient?.('https://nfphzvcwxyfkbucwwlcx.supabase.co','sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS',{auth:{persistSession:true}});
    if(client)await client.auth.signOut();
  }catch(e){console.warn('Idle sign out fallback',e)}
  const btn=document.getElementById('logout');
  if(btn){try{btn.click()}catch{}}
  location.reload();
}

function readLast(){
  try{return Number(localStorage.getItem(KEY))||0}catch{return 0}
}
function writeNow(){
  try{localStorage.setItem(KEY,String(Date.now()))}catch{}
}
function expired(last=readLast()){
  return !!last && Date.now()-last>=IDLE_MS;
}
function schedule(){
  clearTimeout(timer);
  const last=readLast();
  if(!last){writeNow();timer=setTimeout(logout,IDLE_MS);return}
  if(expired(last)){logout();return}
  timer=setTimeout(logout,Math.max(0,IDLE_MS-(Date.now()-last)));
}
function activity(){
  if(loggingOut)return;
  const last=readLast();
  if(last&&expired(last)){logout();return}
  writeNow();
  schedule();
}

['pointerdown','keydown','touchstart'].forEach(ev=>window.addEventListener(ev,activity,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
window.addEventListener('pageshow',schedule);
window.addEventListener('focus',schedule);

// Critical: validate persisted last activity BEFORE writing a new timestamp.
schedule();
})();
(()=>{
'use strict';
const IDLE_MS=30*60*1000;
const KEY='timeless_admin_last_activity';
let timer=null;
function logout(){const btn=document.getElementById('logout');if(btn){btn.click();return}location.reload()}
function schedule(){clearTimeout(timer);let last=Date.now();try{last=Number(localStorage.getItem(KEY))||Date.now()}catch{}const remaining=Math.max(0,IDLE_MS-(Date.now()-last));timer=setTimeout(logout,remaining)}
function activity(){try{localStorage.setItem(KEY,String(Date.now()))}catch{}schedule()}
['pointerdown','keydown','touchstart'].forEach(ev=>window.addEventListener(ev,activity,{passive:true}));document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});activity();
})();
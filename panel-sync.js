(()=>{
'use strict';
const REFRESH_BY_TAB={
 summary:[],management:['mgmt-refresh'],alerts:['alerts-refresh'],orders:['refresh-orders'],customers:['crm-refresh'],payments:['pay-refresh'],shipping:['ship-refresh'],products:[],inventory:['refresh-inventory'],kardex:['kardex-refresh'],purchases:['purchases-refresh'],suppliers:['suppliers-refresh'],expenses:['expenses-refresh'],audit:['audit-refresh'],settings:[]
};
let lastFocusRefresh=0;
function clickRefresh(id){const el=document.getElementById(id);if(el&&!el.disabled)el.click()}
function refreshTab(tab){(REFRESH_BY_TAB[tab]||[]).forEach(clickRefresh)}
function activeTab(){return document.querySelector('.admin-panel.active')?.dataset.panel||'summary'}
function refreshAll(){Object.values(REFRESH_BY_TAB).flat().forEach(clickRefresh);document.dispatchEvent(new CustomEvent('timeless:returns-refresh'))}
document.addEventListener('timeless:admin-tab-changed',e=>setTimeout(()=>refreshTab(e.detail?.tab||activeTab()),60));
document.addEventListener('timeless:data-changed',()=>setTimeout(refreshAll,80));
window.addEventListener('focus',()=>{const now=Date.now();if(now-lastFocusRefresh<5000)return;lastFocusRefresh=now;refreshTab(activeTab())});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshTab(activeTab())});
})();
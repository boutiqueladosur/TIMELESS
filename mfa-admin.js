(()=>{
'use strict';
const SUPABASE_URL='https://nfphzvcwxyfkbucwwlcx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
const MFA_SESSION_KEY='timeless_mfa_verified_session_id';
let enrollment=null;

function injectStyles(){
  if($('mfa-admin-styles'))return;
  const s=document.createElement('style');
  s.id='mfa-admin-styles';
  s.textContent=`
  .mfa-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;max-width:760px;box-shadow:0 8px 26px rgba(0,0,0,.035)}
  .mfa-row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
  .mfa-badge{display:inline-flex;align-items:center;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:800;background:#f0ece7}
  .mfa-badge.ok{background:#e9f6ef;color:#1f6b45}.mfa-badge.warn{background:#fff4dd;color:#8a5b00}
  .mfa-setup{margin-top:16px;padding-top:16px;border-top:1px solid var(--line)}
  .mfa-qr{width:220px;max-width:100%;background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px}
  .mfa-code{max-width:220px;letter-spacing:.22em;font-size:20px;font-weight:800;text-align:center}
  .mfa-secret{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;background:#f7f5f2;border-radius:10px;padding:9px 11px;font-size:12px}
  .mfa-gate{position:fixed;inset:0;z-index:9999;background:rgba(17,17,17,.78);display:grid;place-items:center;padding:20px}
  .mfa-gate-card{width:min(430px,100%);background:#fff;border-radius:22px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
  .mfa-gate-card h2{margin:0 0 8px}.mfa-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
  `;
  document.head.appendChild(s);
}

function panel(){return $('tab-security')}
function setPanel(html){const p=panel();if(!p)return;p.querySelectorAll('.mfa-card').forEach(x=>x.remove());p.insertAdjacentHTML('beforeend',html)}
function msg(text,type=''){return `<div class="notice ${type}">${text}</div>`}
function decodeJwt(token){try{const p=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(decodeURIComponent(atob(p).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')))}catch{return {}}}
function sessionId(session){return decodeJwt(session?.access_token||'').session_id||''}
function verifiedSessionId(){try{return sessionStorage.getItem(MFA_SESSION_KEY)||''}catch{return ''}}
function markSessionVerified(session){const id=sessionId(session);if(!id)return;try{sessionStorage.setItem(MFA_SESSION_KEY,id)}catch{}}
function clearVerifiedSession(){try{sessionStorage.removeItem(MFA_SESSION_KEY)}catch{}}
function requiresFreshGate(session){const id=sessionId(session);return !!id&&verifiedSessionId()!==id}

async function authState(){
  const [{data:{session}},factors,aal]=await Promise.all([
    client.auth.getSession(),
    client.auth.mfa.listFactors(),
    client.auth.mfa.getAuthenticatorAssuranceLevel()
  ]);
  if(!session)throw new Error('Sesión no disponible');
  if(factors.error)throw factors.error;
  if(aal.error)throw aal.error;
  const verified=[...(factors.data?.totp||[]),...(factors.data?.phone||[])].filter(f=>f.status==='verified');
  return {session,verified,totp:(factors.data?.totp||[]),aal:aal.data};
}

async function render(){
  if(!client||!panel())return;
  try{
    const st=await authState();
    const current=st.aal?.currentLevel||'aal1';
    const next=st.aal?.nextLevel||current;
    const has=st.verified.length>0;
    const freshRequired=has&&requiresFreshGate(st.session);
    setPanel(`<div class="mfa-card">
      <div class="mfa-row"><div><strong>Autenticación multifactor</strong><p class="muted small" style="margin:6px 0 0">Protege el panel con una aplicación autenticadora y códigos temporales de 6 dígitos.</p></div>
      <span class="mfa-badge ${has?'ok':'warn'}">${has?'MFA configurado':'MFA pendiente'}</span></div>
      <div style="margin-top:14px" class="small"><strong>Nivel de sesión:</strong> ${current==='aal2'&&!freshRequired?'AAL2 · MFA verificado':'Pendiente de verificación MFA'}</div>
      ${!has?`<div class="mfa-setup"><button type="button" id="mfa-start" class="btn primary">Configurar MFA</button><p class="muted small">Usa Google Authenticator, Microsoft Authenticator, Authy, 1Password u otra app TOTP.</p><div id="mfa-enroll-area"></div></div>`:
      current==='aal2'&&!freshRequired?`<div class="notice" style="margin-top:14px">✓ Esta sesión ya está protegida con segundo factor.</div>`:
      `<div class="mfa-setup"><div class="notice">Esta sesión administrativa necesita verificar nuevamente el segundo factor.</div><button type="button" id="mfa-challenge" class="btn primary">Verificar segundo factor</button></div>`}
    </div>`);
    $('mfa-start')?.addEventListener('click',startEnroll);
    $('mfa-challenge')?.addEventListener('click',()=>challengeExisting(st.verified[0]));
    if(has&&((next==='aal2'&&current!=='aal2')||freshRequired))showGate(st.verified[0]);else hideGate();
  }catch(err){
    console.error('MFA status error',err);
    setPanel(`<div class="mfa-card">${msg('No se pudo consultar el estado de MFA. Recarga el panel e intenta nuevamente.')}</div>`);
  }
}

async function startEnroll(){
  const area=$('mfa-enroll-area');if(!area)return;
  area.innerHTML='<p class="muted small">Generando código QR…</p>';
  try{
    const existing=await client.auth.mfa.listFactors();
    if(existing.error)throw existing.error;
    for(const f of (existing.data?.totp||[]).filter(x=>x.status!=='verified'))await client.auth.mfa.unenroll({factorId:f.id}).catch(()=>{});
    const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'TIMELESS Admin'});
    if(error)throw error;
    enrollment=data;
    const qr=data?.totp?.qr_code||'',secret=data?.totp?.secret||'';
    area.innerHTML=`<div class="mfa-setup"><p><strong>1.</strong> Escanea este QR con tu aplicación autenticadora.</p><img class="mfa-qr" src="${qr}" alt="Código QR para configurar MFA">${secret?`<p class="small muted">Si no puedes escanearlo, ingresa manualmente esta clave:</p><div class="mfa-secret">${secret}</div>`:''}<p><strong>2.</strong> Ingresa el código de 6 dígitos que muestra la aplicación.</p><div class="field" style="max-width:240px"><input id="mfa-enroll-code" class="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></div><div class="mfa-actions"><button type="button" id="mfa-verify-enroll" class="btn primary">Activar MFA</button><button type="button" id="mfa-cancel-enroll" class="btn secondary">Cancelar</button></div><div id="mfa-enroll-error"></div></div>`;
    $('mfa-verify-enroll').addEventListener('click',verifyEnrollment);
    $('mfa-cancel-enroll').addEventListener('click',cancelEnrollment);
  }catch(err){console.error(err);area.innerHTML=msg('No se pudo iniciar la configuración de MFA.')}
}

async function verifyEnrollment(){
  const code=String($('mfa-enroll-code')?.value||'').replace(/\D/g,''),out=$('mfa-enroll-error');
  if(code.length!==6){if(out)out.innerHTML=msg('Ingresa un código válido de 6 dígitos.');return}
  try{
    const {data:challenge,error:ce}=await client.auth.mfa.challenge({factorId:enrollment.id});if(ce)throw ce;
    const {error:ve}=await client.auth.mfa.verify({factorId:enrollment.id,challengeId:challenge.id,code});if(ve)throw ve;
    enrollment=null;
    const {data:{session}}=await client.auth.refreshSession();
    if(session)markSessionVerified(session);
    await render();
  }catch(err){console.error(err);if(out)out.innerHTML=msg('El código no fue aceptado. Espera el siguiente código e inténtalo nuevamente.')}
}

async function cancelEnrollment(){try{if(enrollment?.id)await client.auth.mfa.unenroll({factorId:enrollment.id})}catch{}enrollment=null;await render()}
function gateMarkup(){return `<div id="mfa-gate" class="mfa-gate"><div class="mfa-gate-card"><h2>Verificación de seguridad</h2><p class="muted">Ingresa el código actual de 6 dígitos de tu aplicación autenticadora para acceder a esta sesión administrativa.</p><div class="field"><input id="mfa-gate-code" class="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></div><div id="mfa-gate-error"></div><div class="mfa-actions"><button type="button" id="mfa-gate-verify" class="btn primary">Verificar</button><button type="button" id="mfa-gate-logout" class="btn secondary">Cerrar sesión</button></div></div></div>`}
function showGate(factor){if(!$('mfa-gate'))document.body.insertAdjacentHTML('beforeend',gateMarkup());$('mfa-gate').dataset.factorId=factor.id;$('mfa-gate-verify').onclick=()=>verifyGate(factor.id);$('mfa-gate-logout').onclick=async()=>{clearVerifiedSession();await client.auth.signOut();location.reload()};setTimeout(()=>$('mfa-gate-code')?.focus(),50)}
function hideGate(){$('mfa-gate')?.remove()}
async function challengeExisting(factor){showGate(factor)}
async function verifyGate(factorId){
  const code=String($('mfa-gate-code')?.value||'').replace(/\D/g,''),out=$('mfa-gate-error');
  if(code.length!==6){if(out)out.innerHTML=msg('Ingresa un código válido de 6 dígitos.');return}
  try{
    const {data:challenge,error:ce}=await client.auth.mfa.challenge({factorId});if(ce)throw ce;
    const {error:ve}=await client.auth.mfa.verify({factorId,challengeId:challenge.id,code});if(ve)throw ve;
    const {data:{session}}=await client.auth.refreshSession();
    if(session)markSessionVerified(session);
    hideGate();
    await render();
  }catch(err){console.error(err);if(out)out.innerHTML=msg('Código incorrecto o vencido. Intenta con el código actual de tu aplicación.')}
}

function init(){
  injectStyles();
  render();
  document.addEventListener('timeless:admin-tab-changed',e=>{if(e.detail?.tab==='security')render()});
  document.getElementById('logout')?.addEventListener('click',clearVerifiedSession,{capture:true});
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'){clearVerifiedSession();hideGate();return}
    if(event==='SIGNED_IN'&&session&&requiresFreshGate(session))setTimeout(render,50);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,150));else setTimeout(init,150);
})();
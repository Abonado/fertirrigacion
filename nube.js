/* Abonado Pinta Santos · acceso por usuario y datos compartidos (Firebase) */
(function(){
const CFG={"apiKey": "AIzaSyCv50WiLmJT1azfWpLv6hMtNQ5WQv-ZgIQ", "authDomain": "fertirrigacion-cabezales.firebaseapp.com", "projectId": "fertirrigacion-cabezales", "storageBucket": "fertirrigacion-cabezales.firebasestorage.app", "messagingSenderId": "1060076970871", "appId": "1:1060076970871:web:37b517002d9d51bd17f772"};
const ADMIN="juanjo.serrano3@gmail.com".toLowerCase();
if(!CFG)return;
const P='abonado_';
const $n=s=>document.querySelector(s);
const escN=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aviso=t=>{try{toast(t)}catch(e){}};
const N=window.NUBE={user:null,acc:null,db:null,conf:null,busy:false};

/* ---------- Pantalla de acceso ---------- */
const CSS=`.nb{position:fixed;inset:0;z-index:40;background:var(--bg);overflow:auto;display:flex;align-items:center;justify-content:center;padding:calc(24px + env(safe-area-inset-top,0px)) 16px calc(24px + env(safe-area-inset-bottom,0px))}
.nb .card{width:100%;max-width:400px;display:grid;gap:14px;padding:24px}
.nb .ic{width:64px;height:64px;border-radius:16px;display:block;margin:0 auto}
.nb h2{text-align:center;font-size:30px}
.nb .sub{text-align:center}
.nb .inp input{width:100%;text-align:left;font-size:16px;text-transform:none}
.nb .btn{justify-content:center}
.nb .err{background:var(--bad-bg);color:var(--bad);border-radius:8px;padding:8px 10px;font-size:14px}
.nb .ok{background:var(--ok-bg);color:var(--ok);border-radius:8px;padding:8px 10px;font-size:14px}
.nb .lnk{background:none;border:0;color:var(--muted);text-decoration:underline;cursor:pointer;font:inherit;font-size:13px;justify-self:center}
.nu{display:grid;gap:0}
.nu .r{display:grid;grid-template-columns:1fr auto;gap:8px 12px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}
.nu .r:first-child{border-top:0}
.nu .r small{display:block;color:var(--muted);font-size:12px;text-transform:none}
.nu .r .row{justify-content:flex-end}
.nform{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.nform .inp input{width:100%;text-align:left;font-size:16px}
.nform input[type=email],.nform input[type=password]{text-transform:none}
@media (max-width:560px){.nu .r{grid-template-columns:1fr}.nu .r .row{justify-content:flex-start}}`;
function estilos(){if($n('#nbcss'))return;const s=document.createElement('style');s.id='nbcss';s.textContent=CSS;document.head.appendChild(s)}
function capa(html){estilos();let d=$n('#nb');if(!d){d=document.createElement('div');d.id='nb';d.className='nb';document.body.appendChild(d)}d.innerHTML=`<div class="card">${html}</div>`;document.documentElement.style.overflow='hidden';return d}
function quitarCapa(){const d=$n('#nb');if(d)d.remove()}
const CAB=`<img class="ic" src="icon-192.png" alt=""><div><h2>Acceso</h2><div class="sub">Fertirrigación · cabezales de riego</div></div>`;
const MSG={'auth/invalid-credential':'Email o contraseña incorrectos','auth/wrong-password':'Email o contraseña incorrectos','auth/user-not-found':'Email o contraseña incorrectos','auth/invalid-login-credentials':'Email o contraseña incorrectos',
  'auth/invalid-email':'Ese email no es válido','auth/too-many-requests':'Demasiados intentos. Espera unos minutos','auth/network-request-failed':'Sin conexión. Comprueba la cobertura',
  'auth/user-disabled':'Esta cuenta está desactivada','auth/missing-password':'Escribe la contraseña','auth/weak-password':'La contraseña debe tener al menos 6 caracteres','auth/email-already-in-use':'Ese email ya tiene cuenta'};
const errTxt=e=>MSG[e&&e.code]||(e&&e.code==='permission-denied'?'Sin permiso':'No se pudo completar ('+((e&&e.code)||'error')+')');

function mostrarLogin(msg,ok){const d=capa(`${CAB}
  ${msg?`<div class="${ok?'ok':'err'}">${escN(msg)}</div>`:''}
  <form id="nbf" class="nbf" style="display:grid;gap:12px" novalidate>
  <div class="field"><label for="nb_em">Email</label><div class="inp"><input id="nb_em" type="email" autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false" value="${escN(N.ultEmail||'')}"></div></div>
  <div class="field"><label for="nb_pw">Contraseña</label><div class="inp"><input id="nb_pw" type="password" autocomplete="current-password"></div></div>
  <button class="btn pri" type="submit" id="nb_go">Entrar</button></form>
  <button class="lnk" type="button" id="nb_olv">He olvidado mi contraseña</button>`);
  const em=$n('#nb_em'),pw=$n('#nb_pw');(em.value?pw:em).focus();
  $n('#nbf').onsubmit=async e=>{e.preventDefault();const b=$n('#nb_go');N.ultEmail=em.value.trim();if(!N.ultEmail||!pw.value){mostrarLogin('Escribe tu email y tu contraseña');return}
    b.disabled=true;b.textContent='Entrando…';try{await N.auth.signInWithEmailAndPassword(N.ultEmail,pw.value)}catch(err){mostrarLogin(errTxt(err))}};
  $n('#nb_olv').onclick=async()=>{const e=em.value.trim();if(!e){mostrarLogin('Escribe tu email y vuelve a pulsar «He olvidado mi contraseña»');return}N.ultEmail=e;
    try{await N.auth.sendPasswordResetEmail(e);mostrarLogin('Si ese email tiene cuenta, te llegará un correo para poner una contraseña nueva. Mira también en spam.',true)}catch(err){mostrarLogin(errTxt(err))}}}
function mostrarSinAcceso(email){capa(`${CAB}<div class="err">La cuenta ${escN(email)} no tiene acceso a esta app. Pide al administrador que te dé de alta.</div><button class="btn" id="nb_out">Entrar con otra cuenta</button>`);
  $n('#nb_out').onclick=()=>N.auth.signOut()}
function mostrarSinSdk(){capa(`${CAB}<div class="err">No se pudo cargar el acceso. Comprueba la cobertura y vuelve a intentarlo.</div><button class="btn pri" id="nb_re">Reintentar</button>`);$n('#nb_re').onclick=()=>location.reload()}

if(!window.firebase||!firebase.initializeApp){N.ready=()=>new Promise(()=>mostrarSinSdk());return}

/* ---------- Firebase ---------- */
let fs;
try{firebase.initializeApp(CFG);N.auth=firebase.auth();N.auth.languageCode='es';fs=firebase.firestore();fs.settings({ignoreUndefinedProperties:true});fs.enablePersistence({synchronizeTabs:true}).catch(()=>{})}
catch(e){console.error(e);N.ready=()=>new Promise(()=>mostrarSinSdk());return}

/* Escrituras: sin cobertura Firestore las guarda en el dispositivo y las sube al volver; no esperamos más de 1,5 s */
function espera(p){p.catch(e=>{console.error(e);aviso(e&&e.code==='permission-denied'?'Sin permiso para guardar: vuelve a entrar':'No se pudo guardar en la nube')});return Promise.race([p,new Promise(r=>setTimeout(r,1500))])}
const D=ref=>({get:()=>ref.get(),set:d=>espera(ref.set(d)),update:d=>espera(ref.update(d)),delete:()=>espera(ref.delete())});
const Q=q=>({orderBy:(f,o)=>Q(q.orderBy(f,o)),limit:n=>Q(q.limit(n)),get:()=>q.get()});
const C=n=>{const c=fs.collection(P+n);return{...Q(c),doc:id=>D(c.doc(id)),add:async d=>{const r=c.doc();await espera(r.set(d));return{id:r.id}}}};
const DB={doc:p=>{const i=p.indexOf('/');return D(fs.collection(P+p.slice(0,i)).doc(p.slice(i+1)))},collection:C};

/* ---------- Adjuntos troceados en Firestore (sin necesidad de Storage) ---------- */
const TROZO=600*1024;
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
function deB64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
const AD=()=>fs.collection(P+'adjuntos');
N.putBlob=async(id,blob,type)=>{const u8=new Uint8Array(await blob.arrayBuffer()),n=Math.max(1,Math.ceil(u8.length/TROZO));const ps=[];
  for(let i=0;i<n;i++)ps.push(AD().doc(id+'_'+i).set({n,t:type||blob.type||'',i,d:b64(u8.subarray(i*TROZO,(i+1)*TROZO))}));await espera(Promise.all(ps))};
N.getBlob=async id=>{const s0=await AD().doc(id+'_0').get();if(!s0.exists)return null;const a=s0.data(),parts=[deB64(a.d)];
  for(let i=1;i<a.n;i++){const s=await AD().doc(id+'_'+i).get();if(!s.exists)return null;parts.push(deB64(s.data().d))}return new Blob(parts,{type:a.t})};
N.delBlob=async id=>{let n=1;try{const s0=await AD().doc(id+'_0').get();if(s0.exists)n=s0.data().n||1}catch(e){}const ps=[];for(let i=0;i<n;i++)ps.push(AD().doc(id+'_'+i).delete());await espera(Promise.all(ps))};

/* ---------- Usuarios autorizados ---------- */
const ACC=()=>fs.collection(P+'acceso').doc('usuarios');
async function leerAcceso(server){try{const s=await ACC().get(server?{source:'server'}:undefined);return s.exists?s.data():null}catch(e){if(e&&e.code==='permission-denied')return false;return undefined}}
function nombreLocal(){try{return (localStorage.getItem('abono.autor')||'').trim()}catch(e){return ''}}

N.ready=()=>new Promise(res=>{let listo=false;
  N.auth.onAuthStateChanged(async u=>{
    if(listo){location.reload();return}
    if(!u){mostrarLogin();return}
    const email=(u.email||'').toLowerCase(),admin=email===ADMIN;
    capa(`${CAB}<div class="sub">Comprobando acceso…</div>`);
    let acc=await leerAcceso();
    if(admin&&(acc===null||(acc&&!(acc.emails||[]).includes(ADMIN)))){acc=acc||{emails:[],info:{}};acc.emails=[...new Set([...(acc.emails||[]),ADMIN])];acc.info={...(acc.info||{}),[ADMIN]:{nombre:nombreLocal()||'Juanjo',alta:new Date().toISOString(),admin:true}};await espera(ACC().set(acc))}
    const ok=admin||acc===undefined||(acc&&(acc.emails||[]).includes(email));
    if(!ok){mostrarSinAcceso(email);return}
    const inf=(acc&&acc.info&&acc.info[email])||{};let cache='';try{cache=localStorage.getItem('abono.nombre.'+email)||''}catch(e){}
    N.user={email,admin,nombre:inf.nombre||cache||email.split('@')[0]};try{if(inf.nombre)localStorage.setItem('abono.nombre.'+email,inf.nombre)}catch(e){}N.acc=acc||null;N.db=DB;listo=true;
    quitarCapa();res();if(admin)cargarAcc()})});

N.salir=()=>N.auth.signOut();

async function guardarAcc(acc){await ACC().set(acc);N.acc=acc}
async function cargarAcc(){const a=await leerAcceso(true);if(a)N.acc=a;try{renderMain()}catch(e){}}

N.alta=async(nombre,email,pass)=>{email=(email||'').trim().toLowerCase();nombre=(nombre||'').trim();
  if(!nombre)throw{msg:'Escribe el nombre'};if(!/^\S+@\S+\.\S+$/.test(email))throw{msg:'Ese email no es válido'};if((pass||'').length<6)throw{msg:'La contraseña debe tener al menos 6 caracteres'};
  if(!navigator.onLine)throw{msg:'Necesitas conexión para dar de alta'};
  const sec=firebase.apps.find(a=>a.name==='alta')||firebase.initializeApp(CFG,'alta');const a2=sec.auth();let existia=false;
  try{await a2.setPersistence(firebase.auth.Auth.Persistence.NONE);await a2.createUserWithEmailAndPassword(email,pass)}
  catch(e){if(e&&e.code==='auth/email-already-in-use')existia=true;else throw e}finally{try{await a2.signOut()}catch(e){}}
  const acc=(await leerAcceso(true))||{emails:[],info:{}};acc.emails=[...new Set([...(acc.emails||[]),email])];acc.info={...(acc.info||{}),[email]:{nombre,alta:new Date().toISOString()}};
  await guardarAcc(acc);return existia};
N.baja=async email=>{if(email===ADMIN)return;const acc=(await leerAcceso(true))||N.acc||{emails:[],info:{}};acc.emails=(acc.emails||[]).filter(e=>e!==email);const info={...(acc.info||{})};delete info[email];acc.info=info;await guardarAcc(acc)};
N.renombrar=async(email,nombre)=>{nombre=(nombre||'').trim();if(!nombre)throw{msg:'Escribe el nombre'};const acc=(await leerAcceso(true))||N.acc;if(!acc||!acc.info||!acc.info[email])return;acc.info={...acc.info,[email]:{...acc.info[email],nombre}};await guardarAcc(acc);if(email===N.user.email){N.user.nombre=nombre;try{st.autor=nombre}catch(e){}}};

/* ---------- Subir lo guardado en este dispositivo ---------- */
const lsJ=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
function datosLocales(){const r=lsJ('abono.regs')||[],c=['msgs','llenados','almacen','diagnosticos'].reduce((s,k)=>s+((lsJ('abono.'+k)||[]).length),0);return{dias:r.length,otros:c,config:!!lsJ('abono.config'),cambios:(lsJ('abono.cambios')||[]).length}}
async function subirAdj(list){const out=[];for(const a of list||[]){if(a.local||a.fb){let b=null;try{b=await Adj.idbGet(a.id)}catch(e){}if(b){await N.putBlob(a.id,b,a.type);const x={...a,fb:true};delete x.local;out.push(x);continue}}out.push(a)}return out}
N.subirLocal=async(silencio)=>{if(!navigator.onLine)throw{msg:'Necesitas conexión para subir los datos'};
  const ops=[];const cfg=lsJ('abono.config');if(cfg)ops.push(()=>fs.collection(P+'config').doc('finca').set(cfg));
  for(const f of lsJ('abono.regs')||[]){const r=lsJ('abono.reg.'+f);if(r)ops.push(()=>fs.collection(P+'registros').doc(f).set(r))}
  (lsJ('abono.cambios')||[]).forEach((c,i)=>{const id='c'+String(c.ts||i).replace(/[^0-9A-Za-z]/g,'');ops.push(()=>fs.collection(P+'cambios').doc(id).set(c))});
  for(const[k,col]of[['msgs','mensajes'],['llenados','llenados'],['almacen','almacen'],['diagnosticos','diagnosticos']])
    for(const m of lsJ('abono.'+k)||[]){if(!m)continue;const id=m.id||(col[0]+Date.now().toString(36)+Math.random().toString(36).slice(2,6));ops.push(async()=>{const d={...m};delete d.id;if(d.adjuntos)d.adjuntos=await subirAdj(d.adjuntos);if(!d.ts)d.ts=new Date().toISOString();return fs.collection(P+col).doc(id).set(d)})}
  let hechos=0;for(let i=0;i<ops.length;i+=20){await Promise.all(ops.slice(i,i+20).map(f=>f()));hechos=Math.min(ops.length,i+20);if(!silencio)aviso('Subiendo… '+hechos+' de '+ops.length)}
  try{localStorage.setItem('abono.subido',new Date().toISOString())}catch(e){}return ops.length};

/* ---------- Copia de seguridad desde la nube ---------- */
N.exportAll=async()=>{const ls={},adj={};const all=async c=>(await fs.collection(P+c).get({source:'server'})).docs.map(d=>({...d.data(),id:d.id}));
  const cs=await fs.collection(P+'config').doc('finca').get();if(cs.exists)ls['abono.config']=JSON.stringify(cs.data());
  const regs=await all('registros');const fechas=[];for(const r of regs){const f=r.id;delete r.id;ls['abono.reg.'+f]=JSON.stringify(r);fechas.push(f)}ls['abono.regs']=JSON.stringify(fechas);
  const cam=(await all('cambios')).map(c=>{delete c.id;return c}).sort((a,b)=>a.ts<b.ts?1:-1);ls['abono.cambios']=JSON.stringify(cam);
  for(const[k,col]of[['msgs','mensajes'],['llenados','llenados'],['almacen','almacen'],['diagnosticos','diagnosticos']]){const l=(await all(col)).sort((a,b)=>a.ts<b.ts?1:-1);
    for(const m of l)for(const a of m.adjuntos||[])if(a.fb&&!adj[a.id]){const b=await N.getBlob(a.id).catch(()=>null);if(b)adj[a.id]=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)})}
    ls['abono.'+k]=JSON.stringify(l)}
  return{ls,adjuntos:adj,dias:fechas.length}};

/* ---------- Tarjeta en Ajustes ---------- */
N.cardHTML=()=>{const u=N.user;if(!u)return '';const loc=datosLocales(),hay=loc.dias||loc.otros||loc.config,sub=(()=>{try{return localStorage.getItem('abono.subido')}catch(e){return null}})();
  let h=`<section class="card"><div><h3>Usuarios y acceso</h3><div class="sub">Has entrado como ${escN(u.nombre)}${u.admin?' · administrador':''}</div></div>
  <div class="row"><button class="btn" data-nube="salir">Cerrar sesión</button>${hay&&!sub?(N.conf==='subir'?`<span class="note">¿Subir ${loc.dias} días y ${loc.otros} registros de este dispositivo? Lo que coincida en la nube se sustituye.</span><button class="btn pri" data-nube="subir-si" ${N.busy?'disabled':''}>Sí, subir</button><button class="btn" data-nube="no">Cancelar</button>`:`<button class="btn" data-nube="subir">Subir a la nube los datos de este dispositivo</button>`):''}</div>`;
  if(u.admin){const acc=N.acc||{emails:[],info:{}};const lista=[...(acc.emails||[])].sort((a,b)=>a===ADMIN?-1:b===ADMIN?1:a<b?-1:1);
    h+=`<div><h3 style="font-size:18px">Personas con acceso</h3><div class="sub">Solo ellas pueden entrar y ver los datos</div></div><div class="nu">`+lista.map(e=>{const i=(acc.info||{})[e]||{};
      return `<div class="r"><div><b>${escN(i.nombre||e)}</b><small>${escN(e)}${e===ADMIN?' · administrador':''}</small></div><div class="row">
      ${N.conf==='baja:'+e?`<span class="note">¿Quitar acceso?</span><button class="btn danger" data-nube="baja-si" data-em="${escN(e)}">Sí, quitar</button><button class="btn" data-nube="no">Cancelar</button>`:
      N.conf==='nom:'+e?`<div class="inp"><input id="nu_ren" value="${escN(i.nombre||'')}" style="width:12ch;text-align:left"></div><button class="btn pri" data-nube="nom-si" data-em="${escN(e)}">Guardar</button><button class="btn" data-nube="no">Cancelar</button>`:
      `<button class="btn" data-nube="nom" data-em="${escN(e)}">Cambiar nombre</button><button class="btn" data-nube="reset" data-em="${escN(e)}">Enviar cambio de contraseña</button>${e===ADMIN?'':`<button class="btn" data-nube="baja" data-em="${escN(e)}">Quitar acceso</button>`}`}</div></div>`}).join('')+`</div>
    <div><h3 style="font-size:18px">Dar de alta</h3><div class="sub">Crea su cuenta: entrará con este email y esta contraseña</div></div>
    <div class="nform"><div class="field"><label for="nu_nom">Nombre</label><div class="inp"><input id="nu_nom" autocomplete="off"></div></div>
    <div class="field"><label for="nu_em">Email</label><div class="inp"><input id="nu_em" type="email" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>
    <div class="field"><label for="nu_pw">Contraseña</label><div class="inp"><input id="nu_pw" type="password" autocomplete="new-password" placeholder="mínimo 6"></div></div></div>
    <div class="row"><button class="btn pri" data-nube="alta" ${N.busy?'disabled':''}>Dar de alta</button></div>`}
  return h+`</section>`};

document.addEventListener('click',async e=>{const b=e.target.closest('[data-nube]');if(!b)return;const a=b.dataset.nube,em=b.dataset.em;const re=()=>{try{renderMain()}catch(_){}};
  try{
    if(a==='salir'){if(st.dirtyReg||st.dirtyCfg){aviso('Guarda los cambios antes de cerrar sesión');return}await N.salir()}
    else if(a==='subir'){N.conf='subir';re()}
    else if(a==='no'){N.conf=null;re()}
    else if(a==='subir-si'){N.busy=true;re();const n=await N.subirLocal();N.busy=false;N.conf=null;aviso(n+' registros subidos a la nube');setTimeout(()=>location.reload(),1200)}
    else if(a==='baja'){N.conf='baja:'+em;re()}
    else if(a==='nom'){N.conf='nom:'+em;re();const i=$n('#nu_ren');if(i){i.focus();i.select()}}
    else if(a==='nom-si'){await N.renombrar(em,$n('#nu_ren').value);N.conf=null;re();aviso('Nombre cambiado')}
    else if(a==='baja-si'){await N.baja(em);N.conf=null;re();aviso('Acceso quitado')}
    else if(a==='reset'){await N.auth.sendPasswordResetEmail(em);aviso('Correo enviado a '+em)}
    else if(a==='alta'){const nom=$n('#nu_nom').value,mail=$n('#nu_em').value,pw=$n('#nu_pw').value;N.busy=true;b.disabled=true;b.textContent='Dando de alta…';
      const ex=await N.alta(nom,mail,pw);N.busy=false;re();aviso(ex?'Ese email ya tenía cuenta: tiene acceso con su contraseña de siempre':'Alta hecha: ya puede entrar')}
  }catch(err){N.busy=false;re();aviso(err&&err.msg?err.msg:errTxt(err))}});

window.addEventListener('online',()=>{if(N.user&&N.user.admin)cargarAcc()});
/* Si el administrador cambia el nombre, se actualiza al volver a la app */
document.addEventListener('visibilitychange',async()=>{if(document.hidden||!N.user)return;const a=await leerAcceso(true);if(!a)return;N.acc=a;const i=(a.info||{})[N.user.email];
  if(i&&i.nombre&&i.nombre!==N.user.nombre){N.user.nombre=i.nombre;try{localStorage.setItem('abono.nombre.'+N.user.email,i.nombre);st.autor=i.nombre;renderMain()}catch(e){}}});
N.cargarAcc=cargarAcc;
})();

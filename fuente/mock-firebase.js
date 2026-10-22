/* Simulación mínima del SDK compat de Firebase para pruebas locales */
(function(){
const K='mockfb';
const load=()=>{try{return JSON.parse(localStorage.getItem(K))||{docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}}catch(e){return{docs:{},users:{},cur:null}}};
const save=s=>localStorage.setItem(K,JSON.stringify(s));
const ADMIN='juanjo.serrano3@gmail.com';
function err(code){const e=new Error(code);e.code=code;return e}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
window.__fbLog=[];window.__reads=0;
const CAMPO_C=['abonado_cincid','abonado_ctareas','abonado_cmensajes'];const esNota=p=>p.split('/')[0]==='abonado_notas';const esFich=p=>['abonado_fichajes','abonado_posiciones'].includes(p.split('/')[0]);const esCampoC=p=>CAMPO_C.includes(p.split('/')[0]);
function gestor(){const s=load(),em=s.cur,ac=s.docs['abonado_acceso/usuarios'];return em===ADMIN||!!(ac&&ac.info&&ac.info[em]&&ac.info[em].encargado)}
function allowed(path,write,mod){const s=load();const em=s.cur;if(!em)return false;const col=path.split('/')[0];
  if(write&&col==='abonado_config'&&!gestor()&&!window.__cfgSoloBidones)return false;
  if(write&&mod&&col==='abonado_almacen'&&!gestor()){const d=s.docs[path];if(d&&d.porEmail!==em&&!d.auto)return false}
  if(col==='abonado_acceso')return write?em===ADMIN:true;
  if(!col.startsWith('abonado_'))return false;if(em===ADMIN)return true;const acc=s.docs['abonado_acceso/usuarios'];{const ar=acc&&acc.info&&acc.info[em]&&acc.info[em].areas;if(Array.isArray(ar)&&!ar.includes('riego')&&!['abonado_config','abonado_collas','abonado_jornadas','abonado_adjuntos','abonado_notas','abonado_fichajes','abonado_posiciones',...CAMPO_C].includes(col))return false}return !!(acc&&acc.emails.includes(em))}
function snap(path,data){return{id:path.split('/').pop(),exists:data!==undefined,data:()=>data===undefined?undefined:JSON.parse(JSON.stringify(data))}}
function docRef(path){return{id:path.split('/').pop(),path,
  async get(o){await sleep(5);if(!allowed(path,false))throw err('permission-denied');if(esNota(path)){const d=load().docs[path];if(d&&d.email!==load().cur)throw err('permission-denied')}if(esFich(path)&&!gestor()){const d=load().docs[path];if(d&&d.email!==load().cur)throw err('permission-denied')}if((path.startsWith('abonado_jornadas/')||path.startsWith('abonado_collas/')||esCampoC(path))&&!gestor()){const d=load().docs[path];if(d&&d.jefeEmail!==load().cur)throw err('permission-denied')}if(!(o&&o.source==='cache'))window.__reads++;return snap(path,load().docs[path])},
  async set(d,o){await sleep(5);if(esFich(path)){const cu=load().cur,old=load().docs[path];if(d.email!==cu||(old&&old.email!==cu))throw err('permission-denied');if(path.startsWith('abonado_fichajes/')){if(path!=='abonado_fichajes/'+cu+'_'+d.fecha)throw err('permission-denied');if(old&&(!(d.eventos.length>old.eventos.length)||JSON.stringify(d.eventos.slice(0,old.eventos.length))!==JSON.stringify(old.eventos)))throw err('permission-denied')}}if(esNota(path)){const old=load().docs[path],cu=load().cur;if(d.email!==cu||(old&&old.email!==cu))throw err('permission-denied')}if(esCampoC(path)&&!gestor()){const old=load().docs[path],cu=load().cur;if(d.jefeEmail!==cu||(old&&old.jefeEmail!==cu))throw err('permission-denied')}if(path.startsWith('abonado_jornadas/')&&!gestor()){const old=load().docs[path],cu=load().cur,co=load().docs['abonado_collas/'+d.colla];if(d.jefeEmail!==cu||(old&&old.jefeEmail!==cu)||!co||co.jefeEmail!==cu)throw err('permission-denied')}if(path.startsWith('abonado_collas/')&&!gestor())throw err('permission-denied');if(path==='abonado_config/finca'&&!gestor()){const old=load().docs[path]||{};const ks=[...new Set([...Object.keys(old),...Object.keys(d)])].filter(k=>JSON.stringify(old[k])!==JSON.stringify(d[k]));window.__cfgSoloBidones=ks.every(k=>k==='bidones')}{const ok=allowed(path,true);window.__cfgSoloBidones=false;if(!ok)throw err('permission-denied')}const s=load();const nd=JSON.parse(JSON.stringify(d));if(o&&o.merge){const old=s.docs[path]||{};for(const[k,v]of Object.entries(nd))old[k]=v&&typeof v==='object'&&!Array.isArray(v)&&old[k]&&typeof old[k]==='object'?{...old[k],...v}:v;s.docs[path]=old}else s.docs[path]=nd;save(s);__fbLog.push(['set',path])},
  async update(d){await sleep(5);if(esCampoC(path)&&!gestor()){const old=load().docs[path];if(!old||old.jefeEmail!==load().cur)throw err('permission-denied')}if(path.startsWith('abonado_collas/')&&!gestor()){const old=load().docs[path];if(!old||old.jefeEmail!==load().cur||Object.keys(d).some(k=>k!=='miembros'&&k!=='mod'))throw err('permission-denied')}if(path.startsWith('abonado_jornadas/')&&!gestor())throw err('permission-denied');if(!allowed(path,true,true))throw err('permission-denied');const s=load();if(!s.docs[path])throw err('not-found');Object.assign(s.docs[path],d);save(s)},
  async delete(){await sleep(5);if(esNota(path)){const old=load().docs[path];if(old&&old.email!==load().cur)throw err('permission-denied')}if(!allowed(path,true,true))throw err('permission-denied');const s=load();delete s.docs[path];save(s);__fbLog.push(['del',path])}}}
function query(col,ord,lim,wh){const self={onSnapshot(cb){const vistos=new Set();const tick=async()=>{try{const r=await self.get();const ch=r.docs.filter(x=>!vistos.has(x.id)).map(x=>{vistos.add(x.id);return{type:'added',doc:x}});cb({docChanges:()=>ch})}catch(e){}};tick();const t=setInterval(tick,400);return()=>clearInterval(t)}};return Object.assign(self,{orderBy:(f,o)=>query(col,[f,o],lim,wh),limit:n=>query(col,ord,n,wh),where:(f,op,v)=>query(col,ord,lim,[f,op,v]),
  async get(o){await sleep(5);if(!allowed(col+'/x',false))throw err('permission-denied');const s=load();let ds=Object.entries(s.docs).filter(([p])=>p.startsWith(col+'/')&&p.split('/').length===2).map(([p,d])=>snap(p,d));
    if(ord){ds=ds.filter(d=>d.data()[ord[0]]!==undefined);ds.sort((a,b)=>{const x=a.data()[ord[0]],y=b.data()[ord[0]];return (x<y?-1:x>y?1:0)*(ord[1]==='desc'?-1:1)})}
    if(wh)ds=ds.filter(d=>wh[1]==='>'?d.data()[wh[0]]>wh[2]:wh[1]==='=='?d.data()[wh[0]]===wh[2]:(d.data()[wh[0]]||[]).includes(wh[2]));if(col==='abonado_jornadas'&&!gestor())throw err('permission-denied');if(col==='abonado_notas'&&!(wh&&wh[0]==='email'&&wh[1]==='=='&&wh[2]===load().cur))throw err('permission-denied');if((col==='abonado_fichajes'||col==='abonado_posiciones')&&!gestor())throw err('permission-denied');if((col==='abonado_collas'||CAMPO_C.includes(col))&&!gestor()&&!(wh&&wh[0]==='jefeEmail'&&wh[2]===load().cur))throw err('permission-denied');if(col==='abonado_privados'&&!(wh&&wh[2]===load().cur))throw err('permission-denied');if(lim)ds=ds.slice(0,lim);if(!(o&&o.source==='cache'))window.__reads+=Math.max(1,ds.length);return{docs:ds}}})}
let n=0;
function fsInst(){return{settings(){},enablePersistence:async()=>{},collection:c=>({...query(c),doc:id=>docRef(c+'/'+(id||('auto'+Date.now().toString(36)+(n++))))})}}
const listeners=[];
function authInst(main){return{languageCode:null,
  get currentUser(){const c=load().cur;return main&&c?{email:c,getIdToken:async()=>'tok-'+c}:null},
  onAuthStateChanged(cb){if(main){listeners.push(cb);setTimeout(()=>{const c=load().cur;cb(c?{email:c}:null)},20)}},
  async signInWithEmailAndPassword(e,p){await sleep(10);e=e.toLowerCase();const s=load();if(s.users[e]!==p)throw err('auth/invalid-credential');if(main){s.cur=e;save(s);listeners.forEach(l=>l({email:e}))}},
  async signOut(){if(main){const s=load();s.cur=null;save(s);listeners.forEach(l=>l(null))}},
  async sendPasswordResetEmail(e){__fbLog.push(['reset',e])},
  async setPersistence(){},
  async createUserWithEmailAndPassword(e,p){const s=load();e=e.toLowerCase();if(s.users[e])throw err('auth/email-already-in-use');if(p.length<6)throw err('auth/weak-password');s.users[e]=p;save(s);__fbLog.push(['create',e])}}}
const apps=[];
window.firebase={apps,initializeApp(cfg,name){const a={name:name||'[DEFAULT]',auth:()=>a._a||(a._a=authInst(!name)),firestore:()=>a._f||(a._f=fsInst())};apps.push(a);if(!name)window.firebase._def=a;return a},
  auth(){return window.firebase._def.auth()},firestore(){return window.firebase._def.firestore()}};
window.firebase.auth.Auth={Persistence:{NONE:'none',LOCAL:'local'}};
})();

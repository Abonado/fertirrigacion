/* Alta guiada de una empresa nueva (solo el administrador).
   Cinco pasos: empresa, fincas, cabezales, depósitos y personas. Al terminar crea la configuración
   desde cero (sin nada de otra empresa) y da de alta a las personas con NUBE.alta.
   Se carga solo al abrir la pestaña «Alta de empresa», como taller.js. */
(function(){
const PASOS=['Empresa','Fincas','Cabezales','Depósitos','Personas'];
const TIPOS={pot:'Potásico',cal:'Solución cálcica',fe:'Hierro (Microstep Fe)',nit:'Ácido nítrico'};
const A={paso:0,emp:{nombre:'',cultivo:'Tomate',variedad:'',plantacion:'',lat:'',lon:''},
  fincas:[{nombre:''}],cabs:[],deps:{},gente:[],conf:false,hecho:null,ocupado:false};

/* ids cortos y únicos a partir del nombre */
function slug(s,usados){let b=String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,8)||'x',id=b,n=2;
  while(usados.has(id))id=b+(n++);usados.add(id);return id}
const nOk=v=>{const n=parseFloat(String(v??'').replace(',','.'));return isFinite(n)?n:null};

function fincasOk(){return A.fincas.filter(f=>f.nombre.trim())}
function cabsOk(){return A.cabs.filter(c=>c.nombre.trim()&&fincasOk().some(f=>f===A.fincas[c.finca]))}

/* Qué falta en cada paso para poder seguir */
function falta(p){
  if(p===0)return A.emp.nombre.trim()?'':'Pon el nombre de la empresa.';
  if(p===1)return fincasOk().length?'':'Añade al menos una finca con nombre.';
  if(p===2){if(!cabsOk().length)return 'Añade al menos un cabezal con nombre.';if(cabsOk().some(c=>!(c.sectores>=1)))return 'Cada cabezal necesita 1 sector o más.';return ''}
  if(p===3)return cabsOk().every(c=>(A.deps[A.cabs.indexOf(c)]||[]).length)?'':'Cada cabezal necesita al menos un depósito.';
  if(p===4){for(const g of A.gente){if(!g.email.trim()&&!g.nombre.trim())continue;if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email.trim()))return 'Revisa el email de '+(g.nombre||'cada persona')+'.';if(String(g.pass||'').length<6)return 'La contraseña inicial necesita 6 letras o números como mínimo.'}return ''}
  return ''}

/* La configuración nueva, sin nada de la empresa anterior */
function construir(){
  const cfg=clone(DEFAULT_CONFIG),usF=new Set(),usC=new Set(),usB=new Set();
  const fs=fincasOk().map(f=>({id:slug(f.nombre,usF),nombre:f.nombre.trim(),cabezales:[]}));
  const cabezales=[],bidones=[],cultivo={};
  cabsOk().forEach(c=>{const i=A.cabs.indexOf(c),id=slug(c.nombre,usC),fi=fincasOk().indexOf(A.fincas[c.finca]);fs[fi].cabezales.push(id);
    const sectores=[];for(let n=1;n<=c.sectores;n++){const bj=[];for(let k=1;k<=Math.max(1,c.bandejas||1);k++)bj.push([n+'.'+k,null,null]);sectores.push(sec(id,n,null,bj))}
    cabezales.push({id,nombre:c.nombre.trim(),ejM3:null,sectores});
    cultivo[id]={cultivo:A.emp.cultivo.trim()||'Tomate',variedad:A.emp.variedad.trim(),plantacion:A.emp.plantacion||hoy(),guias:2};
    for(const d of A.deps[i]||[]){const bId=slug(d.tipo+'_'+id,usB),lpcm=nOk(d.lpcm)||10,cap=nOk(d.cap)||1000;
      const b=d.tipo==='pot'?pot(bId,[id],lpcm,0,POT.map(()=>0),null,null):d.tipo==='cal'?cal(bId,[id],lpcm,0,0,0,null,null):d.tipo==='fe'?fe(bId,[id],lpcm,cap,0,0,null,null):nit(bId,[id],lpcm,cap,0,0,null,null);
      b.capacidad=cap;bidones.push(b)}});
  cfg.fincas=fs;cfg.cabezales=cabezales;cfg.bidones=bidones;cfg.cultivo=cultivo;
  cfg.almacenes=fs.filter(f=>f.cabezales.length).map(f=>({id:f.id,nombre:f.nombre,cabezales:[...f.cabezales]}));
  cfg.stockMin={};cfg.saco={};cfg.empresa=A.emp.nombre.trim();
  const lat=nOk(A.emp.lat),lon=nOk(A.emp.lon);if(lat!=null&&lon!=null)cfg.ubic={lat,lon};
  return cfg}

async function terminar(){
  if(A.ocupado)return;const f=[0,1,2,3,4].map(falta).find(x=>x);if(f){toast(f);return}
  if(st.cfg&&st.cfg.cabezales&&st.cfg.cabezales.length&&!A.conf){toast('Marca la casilla: la configuración actual se sustituye');return}
  A.ocupado=true;renderMain();const res={cfg:false,gente:[]};
  try{st.cfg=construir();st.dirtyCfg=true;st.finca=st.cfg.fincas[0].id;st.cab=(st.cfg.cabezales[0]||{}).id;await saveCfg();res.cfg=!st.dirtyCfg}
  catch(e){console.error('alta: configuración',e)}
  for(const g of A.gente){if(!g.email.trim())continue;
    try{const ex=window.NUBE&&NUBE.alta?await NUBE.alta(g.nombre,g.email,g.pass):null;res.gente.push({...g,ok:true,ex})}
    catch(e){console.error('alta: persona',e);res.gente.push({...g,ok:false,err:e&&e.code||'error'})}}
  A.hecho=res;A.ocupado=false;try{renderAll()}catch(e){renderMain()}}

/* ---------- Pantallas ---------- */
const inp=(k,v,ph,t)=>`<input data-alta="${k}" value="${esc(v)}" placeholder="${esc(ph||'')}"${t?` type="${t}"`:''}>`;
function pasoEmpresa(){const e=A.emp;return `
  <label>Nombre de la empresa ${inp('emp.nombre',e.nombre,'Ej.: Hortalizas del Campo SL')}</label>
  <label>Cultivo principal ${inp('emp.cultivo',e.cultivo,'Tomate')}</label>
  <label>Variedad (opcional) ${inp('emp.variedad',e.variedad,'')}</label>
  <label>Fecha de plantación ${inp('emp.plantacion',e.plantacion,'',"date")}</label>
  <div class="sub">Ubicación para el tiempo y la radiación (opcional; se puede poner después en Ajustes)</div>
  <label>Latitud ${inp('emp.lat',e.lat,'37,40','text')}</label><label>Longitud ${inp('emp.lon',e.lon,'-1,58','text')}</label>`}
function pasoFincas(){return A.fincas.map((f,i)=>`<div class="row"><label style="flex:1">Finca ${i+1} ${inp('finca.'+i,f.nombre,'Nombre de la finca')}</label>${A.fincas.length>1?`<button class="btn" data-alta-act="finca-quita" data-i="${i}">Quitar</button>`:''}</div>`).join('')+
  `<button class="btn" data-alta-act="finca-pon">+ Otra finca</button>`}
function pasoCabezales(){const fs=fincasOk();if(!A.cabs.length)A.cabs.push({nombre:'',finca:A.fincas.indexOf(fs[0]),sectores:2,bandejas:1});
  return A.cabs.map((c,i)=>`<div class="card" style="margin:8px 0"><label>Cabezal ${i+1} ${inp('cab.'+i+'.nombre',c.nombre,'Ej.: Nave grande')}</label>
    <label>Finca <select data-alta="cab.${i}.finca">${fs.map(f=>{const fi=A.fincas.indexOf(f);return `<option value="${fi}"${fi===c.finca?' selected':''}>${esc(f.nombre)}</option>`}).join('')}</select></label>
    <label>Sectores ${inp('cab.'+i+'.sectores',c.sectores,'2','number')}</label><label>Bandejas de drenaje por sector ${inp('cab.'+i+'.bandejas',c.bandejas,'1','number')}</label>
    ${A.cabs.length>1?`<button class="btn" data-alta-act="cab-quita" data-i="${i}">Quitar cabezal</button>`:''}</div>`).join('')+
  `<button class="btn" data-alta-act="cab-pon">+ Otro cabezal</button>`}
function pasoDepositos(){return cabsOk().map(c=>{const i=A.cabs.indexOf(c);if(!A.deps[i])A.deps[i]=[{tipo:'pot',cap:5000,lpcm:31},{tipo:'cal',cap:5000,lpcm:31}];
  return `<div class="card" style="margin:8px 0"><h4>${esc(c.nombre)}</h4>${A.deps[i].map((d,j)=>`<div class="row">
    <label>Tipo <select data-alta="dep.${i}.${j}.tipo">${Object.entries(TIPOS).map(([k,t])=>`<option value="${k}"${k===d.tipo?' selected':''}>${t}</option>`).join('')}</select></label>
    <label>Capacidad (L) ${inp(`dep.${i}.${j}.cap`,d.cap,'5000','number')}</label><label>Litros por cm ${inp(`dep.${i}.${j}.lpcm`,d.lpcm,'31','text')}</label>
    <button class="btn" data-alta-act="dep-quita" data-i="${i}" data-j="${j}">Quitar</button></div>`).join('')}
    <button class="btn" data-alta-act="dep-pon" data-i="${i}">+ Otro depósito</button></div>`}).join('')+
  `<div class="sub">Las dosis de cada abono se ponen después en Receta: el alta las deja a cero.</div>`}
function pasoPersonas(){return `<div class="sub">Opcional. Cada persona entra con su email y esta contraseña inicial; los permisos (riego, campo, encargado) se ajustan luego en Ajustes → Usuarios.</div>`+
  A.gente.map((g,i)=>`<div class="row"><label>Nombre ${inp(`gen.${i}.nombre`,g.nombre,'')}</label><label>Email ${inp(`gen.${i}.email`,g.email,'','email')}</label><label>Contraseña inicial ${inp(`gen.${i}.pass`,g.pass,'','text')}</label>
    <button class="btn" data-alta-act="gen-quita" data-i="${i}">Quitar</button></div>`).join('')+
  `<button class="btn" data-alta-act="gen-pon">+ Añadir persona</button>`}
function resumen(){const c=construir();return `<div class="sub">${esc(A.emp.nombre)}: ${c.fincas.length} finca(s), ${c.cabezales.length} cabezal(es), ${c.cabezales.reduce((s,x)=>s+x.sectores.length,0)} sector(es), ${c.bidones.length} depósito(s), ${A.gente.filter(g=>g.email.trim()).length} persona(s).</div>`}
function hecho(){const h=A.hecho;return `<section class="card"><h3>${h.cfg?'Alta hecha':'No se ha podido guardar'}</h3>
  <div class="sub">${h.cfg?'La configuración nueva ya está guardada. Siguiente: la receta de cada depósito y los límites de drenaje en Ajustes.':'Revisa la conexión y vuelve a intentarlo; no se ha cambiado nada.'}</div>
  ${h.gente.map(g=>`<div>${esc(g.nombre||g.email)}: ${g.ok?(g.ex?'ya tenía cuenta, entra con su contraseña de siempre':'alta hecha'):'no se pudo dar de alta ('+esc(g.err)+')'}</div>`).join('')}
  <button class="btn pri" data-alta-act="cerrar">Ir a Receta</button></section>`}

function vista(){if(A.hecho)return hecho();
  const p=A.paso,cuerpo=[pasoEmpresa,pasoFincas,pasoCabezales,pasoDepositos,pasoPersonas][p](),hay=st.cfg&&st.cfg.cabezales&&st.cfg.cabezales.length;
  return `<section class="card alta"><h3>Alta de empresa · paso ${p+1} de 5: ${PASOS[p]}</h3>
    <div class="sub">${PASOS.map((t,i)=>i===p?`<b>${t}</b>`:t).join(' · ')}</div>${cuerpo}
    ${p===4?resumen()+(hay?`<label class="row"><input type="checkbox" data-alta="conf"${A.conf?' checked':''}> Entiendo que se sustituye la configuración actual (fincas, cabezales y depósitos)</label>`:''):''}
    <div class="row">${p?`<button class="btn" data-alta-act="atras">Atrás</button>`:''}
    ${p<4?`<button class="btn pri" data-alta-act="sigue">Siguiente</button>`:`<button class="btn pri" data-alta-act="fin"${A.ocupado?' disabled':''}>${A.ocupado?'Guardando…':'Crear empresa'}</button>`}</div></section>`}

/* ---------- Eventos (solo los de esta pantalla, marcados con data-alta) ---------- */
function onInput(e){const t=e.target,k=t.dataset&&t.dataset.alta;if(!k)return;const v=t.type==='checkbox'?t.checked:t.value,p=k.split('.');
  if(p[0]==='emp')A.emp[p[1]]=v;else if(p[0]==='finca')A.fincas[+p[1]].nombre=v;else if(p[0]==='conf')A.conf=v;
  else if(p[0]==='cab'){const c=A.cabs[+p[1]];c[p[2]]=p[2]==='nombre'?v:Math.max(0,Math.min(50,parseInt(v,10)||0))}
  else if(p[0]==='dep')A.deps[+p[1]][+p[2]][p[3]]=v;else if(p[0]==='gen')A.gente[+p[1]][p[2]]=v;
  if(t.tagName==='SELECT'&&p[0]!=='dep')renderMain()}
function onClick(e){const t=e.target.closest&&e.target.closest('[data-alta-act]');if(!t)return;const a=t.dataset.altaAct,i=+t.dataset.i,j=+t.dataset.j;
  if(a==='sigue'){const f=falta(A.paso);if(f){toast(f);return}A.paso++}
  else if(a==='atras')A.paso=Math.max(0,A.paso-1);
  else if(a==='finca-pon')A.fincas.push({nombre:''});else if(a==='finca-quita'){A.fincas.splice(i,1);A.cabs=A.cabs.filter(c=>c.finca!==i).map(c=>({...c,finca:c.finca>i?c.finca-1:c.finca}));A.deps={}}
  else if(a==='cab-pon'){const fs=fincasOk();A.cabs.push({nombre:'',finca:A.fincas.indexOf(fs[0]),sectores:2,bandejas:1})}
  else if(a==='cab-quita'){A.cabs.splice(i,1);const d={};Object.keys(A.deps).forEach(k=>{const n=+k;if(n<i)d[n]=A.deps[k];else if(n>i)d[n-1]=A.deps[k]});A.deps=d}
  else if(a==='dep-pon')A.deps[i].push({tipo:'fe',cap:1000,lpcm:10});else if(a==='dep-quita')A.deps[i].splice(j,1);
  else if(a==='gen-pon')A.gente.push({nombre:'',email:'',pass:''});else if(a==='gen-quita')A.gente.splice(i,1);
  else if(a==='fin'){terminar();return}
  else if(a==='cerrar'){A.hecho=null;A.paso=0;st.tab='receta';try{renderAll()}catch(e){renderMain()}return}
  renderMain()}
document.addEventListener('input',onInput);document.addEventListener('change',onInput);document.addEventListener('click',onClick);

window.ALTA={vista,construir,falta,_estado:A};
})();

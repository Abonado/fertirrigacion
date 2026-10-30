/* Taller de sensores · solo el administrador (menú Taller → Taller de sensores).
   Eliges qué quieres medir y la app da: piezas, esquema de conexiones con avisos de errores, caja para imprimir en 3D
   (STL de la base y de la tapa, y .scad para retocarla en OpenSCAD) y la ficha de montaje y uso.
   Se carga solo cuando el administrador abre la pestaña. Los diseños se guardan en este móvil (abono.taller), no en la nube.
   Las medidas de las piezas son aproximadas: se comprueban con calibre antes de imprimir. */
(()=>{
const T=window.TALLER={};
const e_=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n1=x=>(Math.round(x*10)/10).toString().replace('.',',');

/* ---------- Catálogo de piezas ----------
   med: largo × ancho × alto en mm (aproximado, con pines soldados). dentro: va dentro de la caja.
   pines: nombre → tipo. pwr = entrada de alimentación (v: tensiones que admite), gnd, tx/rx = serie, ana = analógica, rs = RS485 */
const PIEZAS={
  heltec:{c:'Heltec V3',n:'Heltec WiFi LoRa 32 V3 (868 MHz)',med:[51,26,14],dentro:true,color:'#2d6cdf',
    nota:'Trae los pines sin soldar y una antena de muelle (IPEX). La radio no puede emitir sin la antena puesta.'},
  a02:{c:'A02YYUW',n:'Sensor ultrasónico A02YYUW',med:[0,0,0],dentro:false,color:'#7a4fd0',v:[3.3,5],sale:'v',
    nota:'Va fuera de la caja, mirando al agua. Zona ciega de unos 3 cm; mide hasta unos 4,5 m.',cable:'PG7'},
  cap:{c:'Capacitivo v1.2',n:'Sensor capacitivo de humedad v1.2 (chip TLC555)',med:[0,0,0],dentro:false,color:'#c0392b',v:[3.3,5],sale:'v',
    nota:'Solo la versión con chip TLC555: las que traen NE555 no funcionan a 3,3 V. Sella el borde de arriba (barniz o termorretráctil): con la humedad se estropea.',cable:'PG7'},
  max3485:{c:'MAX3485',n:'Módulo MAX3485 (RS485 a 3,3 V)',med:[44,15,12],dentro:true,color:'#16a085',v:[3.3,3.3]},
  mt3608:{c:'MT3608 (12 V)',n:'Elevador MT3608 (ajustado a 12 V)',med:[37,17,8],dentro:true,color:'#d35400',
    nota:'Se ajusta a 12 V con el polímetro ANTES de conectar el sensor: de fábrica puede sacar mucho más.'},
  rs485s:{c:'Sensor RS485',n:'Sensor de suelo RS485 (humedad + temperatura + CE)',med:[0,0,0],dentro:false,color:'#8e44ad',v:[12,12],
    nota:'BORRADOR: los colores y la tensión dependen del modelo. Hasta tener su hoja técnica no se conecta.',cable:'PG7'},
  bat:{c:'Pila 18650',n:'Pila 18650 protegida + portapilas',med:[78,21,20],dentro:true,color:'#27ae60',
    nota:'Protegida (con circuito de protección). Nunca la cargues ni la guardes caliente al sol.'},
  carg:{c:'Cargador CN3791',n:'Cargador solar CN3791 (6 V)',med:[45,27,12],dentro:true,color:'#f39c12',nota:'Alternativa: TP4056 con protección (más pequeño, peor con sol flojo).'},
  panel:{c:'Placa solar 6 V',n:'Placa solar 6 V · 2–3 W',med:[0,0,0],dentro:false,color:'#34495e',nota:'Fuera, mirando al sur e inclinada unos 35°.',cable:'PG7'},
  usb:{c:'Cargador USB 5 V',n:'Cargador USB de enchufe (5 V) + cable USB-C',med:[0,0,0],dentro:false,color:'#7f8c8d',nota:'El cable entra por un prensaestopas PG9 (la clavija USB-C pasa justa).',cable:'PG9'}
};
const GLAND={PG7:{d:12.5,cab:'cable de 3 a 6,5 mm'},PG9:{d:15.2,cab:'cable de 4 a 8 mm'}};

/* ---------- Pines de la Heltec V3 ----------
   Los que usa la propia placa no se pueden usar para sensores. ADC1 = GPIO 1–10 (los únicos analógicos que valen con WiFi). */
const HPINES=[0,1,2,3,4,5,6,7,19,20,21,26,33,34,35,36,37,38,39,40,41,42,45,46,47,48];
const RESERV={0:'el botón PRG (arranque)',1:'la lectura de la batería',8:'la radio LoRa',9:'la radio LoRa',10:'la radio LoRa',11:'la radio LoRa',12:'la radio LoRa',13:'la radio LoRa',14:'la radio LoRa',
  17:'la pantalla',18:'la pantalla',21:'la pantalla',19:'el USB',20:'el USB',35:'el LED blanco',36:'Vext (enciende los sensores)',37:'el control de la lectura de batería'};
const ARRANQUE=[3,45,46];

/* ---------- Nodos ya decididos ----------
   con: cables. de/a = [pieza, pin]; var = pin de la Heltec que se puede cambiar; tipo del pin de la Heltec: gpio, ana, rx, tx */
const NODOS={
  N1:{n:'N1 · Nivel del depósito',corto:'Nivel de depósito',piezas:['heltec','a02','usb'],
    con:[{de:['a02','VCC (rojo)'],a:['heltec','Ve'],c:'#d62728',alim:'a02'},{de:['a02','GND (negro)'],a:['heltec','GND'],c:'#222'},
      {de:['a02','TX (blanco)'],a:['heltec','GPIO'],c:'#bbb',var:'rx',tipo:'rx',def:47,nom:'Lectura del sensor (TX del sensor)'},
      {de:['a02','RX (amarillo)'],a:null,c:'#e6c300',nota:'Sin conectar: así el sensor manda el valor ya filtrado'},
      {de:['usb','USB-C'],a:['heltec','USB-C'],c:'#7f8c8d'}],
    glands:['a02','usb']},
  N2:{n:'N2 · Humedad del sustrato (capacitivo)',corto:'Humedad de sustrato',piezas:['heltec','cap','bat','carg','panel'],
    con:[{de:['cap','VCC'],a:['heltec','Ve'],c:'#d62728',alim:'cap'},{de:['cap','GND'],a:['heltec','GND'],c:'#222'},
      {de:['cap','AOUT'],a:['heltec','GPIO'],c:'#1f77b4',var:'ana',tipo:'ana',def:7,nom:'Salida analógica del sensor'}],
    glands:['cap','panel']},
  N3:{n:'N3 · Humedad, temperatura y CE (RS485)',corto:'Humedad + CE (RS485)',borrador:true,piezas:['heltec','max3485','mt3608','rs485s','bat','carg','panel'],
    con:[{de:['max3485','VCC'],a:['heltec','Ve'],c:'#d62728'},{de:['max3485','GND'],a:['heltec','GND'],c:'#222'},
      {de:['max3485','RO'],a:['heltec','GPIO'],c:'#2ca02c',var:'ro',tipo:'rx',def:5,nom:'RO (lo que llega del sensor)'},
      {de:['max3485','DI'],a:['heltec','GPIO'],c:'#ff7f0e',var:'di',tipo:'tx',def:6,nom:'DI (lo que se manda al sensor)'},
      {de:['max3485','DE + RE'],a:['heltec','GPIO'],c:'#9467bd',var:'de',tipo:'gpio',def:4,nom:'DE y RE juntos (hablar / escuchar)'},
      {de:['mt3608','VIN+'],a:['heltec','Ve'],c:'#d62728'},{de:['mt3608','VIN−'],a:['heltec','GND'],c:'#222'},
      {de:['rs485s','V+'],a:['mt3608','OUT+ (12 V)'],c:'#d62728',alim:'rs485s',v:12},{de:['rs485s','GND'],a:['mt3608','OUT−'],c:'#222'},
      {de:['rs485s','A'],a:['max3485','A'],c:'#e6c300'},{de:['rs485s','B'],a:['max3485','B'],c:'#17becf'}],
    glands:['rs485s','panel']},
  P:{n:'P · Pasarela (LoRa → WiFi → app)',corto:'Pasarela',piezas:['heltec','usb'],
    con:[{de:['usb','USB-C'],a:['heltec','USB-C'],c:'#7f8c8d'}],glands:['usb']}
};
function SOLARF(){return [{de:['panel','+'],a:['carg','IN+'],c:'#d62728'},{de:['panel','−'],a:['carg','IN−'],c:'#222'},
  {de:['bat','+'],a:['carg','BAT+'],c:'#d62728'},{de:['bat','−'],a:['carg','BAT−'],c:'#222'},
  {de:['bat','+'],a:['heltec','Batería JST +'],c:'#d62728',nota:'Comprueba con el polímetro qué cable del conector JST es el + ANTES de enchufar: hay conectores con los colores al revés'},
  {de:['bat','−'],a:['heltec','Batería JST −'],c:'#222'}]}
for(const k of ['N2','N3'])NODOS[k].con=NODOS[k].con.concat(SOLARF());   // los dos con batería y placa solar

/* ---------- Asistente ---------- */
const PREG=[
  {k:'medir',t:'¿Qué quieres medir?',ops:[['nivel','Nivel de un depósito'],['humedad','Humedad del sustrato (coco)'],['ce','Humedad, temperatura y CE del sustrato'],['pasarela','Nada: recibir los datos y subirlos a la app']]},
  {k:'energia',t:'¿Cómo se alimenta?',ops:[['enchufe','Enchufe cerca (menos de 3 m)'],['solar','Batería y placa solar']]},
  {k:'lugar',t:'¿Dónde va?',ops:[['inv','Dentro del invernadero'],['fuera','Al aire libre']]}
];
function nodoDe(q){return {nivel:'N1',humedad:'N2',ce:'N3',clima:'N4',raiz:'N5',pulsos:'N6',ma:'N7',co2:'N8',bomba:'N9',pasarela:'P'}[q.medir]||null}

/* ---------- Estado y guardado: en la nube (colección «tldisenos») y una copia en el móvil para abrirlos sin conexión ----------
   nube:true = esa copia ya está en la nube. Lo que solo está en el móvil (hecho sin conexión o de antes) se sube al abrir el Taller;
   lo que estaba en la nube y ya no está, se borró desde otro sitio y se quita también de aquí. */
const LS='abono.taller',COL='tldisenos';
const cargar=()=>{try{return JSON.parse(localStorage.getItem(LS)||'[]')}catch(e){return []}};
const guardarTodo=l=>{try{localStorage.setItem(LS,JSON.stringify(l))}catch(e){}};
const NB={ok:false,va:false};
const aNube=d=>{const {nube,...x}=d;return {...JSON.parse(JSON.stringify(x)),ts:d.mod||new Date().toISOString()}};
async function sincroniza(){if(NB.va||typeof Store==='undefined'||!Store.listCol)return;NB.va=true;
  try{const n=await Store.listCol(COL,500),ids=new Set(n.map(x=>x.id)),loc=cargar(),out=n.map(x=>({...x,nube:true}));
    for(const d of loc)if(!ids.has(d.id)&&!d.nube){try{await Store.setCol(COL,d.id,aNube(d));out.push({...d,nube:true})}catch(e){out.push(d)}}
    out.sort((a,b)=>(a.mod||'')<(b.mod||'')?1:-1);guardarTodo(out.slice(0,200));NB.ok=true;if(st.tab==='taller')repinta()}catch(e){}NB.va=false}
T.sincroniza=sincroniza;T.lista=()=>cargar();T.guardarActual=()=>{const s=S();if(s.d)guardar(s.d)};
const S=()=>(st.tl=st.tl||{q:{},d:null,v:'piezas',yaw:-35,pitch:28,expl:1});
const CAJA0={pared:3.6,suelo:2.4,holg:3,extra:12,ranura:true,orejas:true,antena:false};
function nuevo(q){const nodo=q.nodo||nodoDe(q),N=NODOS[nodo],pines={};for(const c of N.con)if(c.var)pines[c.var]=c.def;
  const alim={};for(const c of N.con)if(c.alim)alim[c.alim]=c.v||3.3;
  return {id:'d'+Date.now().toString(36),nombre:N.corto+' '+new Date().toLocaleDateString('es-ES'),nodo,energia:q.energia,lugar:q.lugar,pines,alim,caja:{...CAJA0},hecho:[],mod:new Date().toISOString()}}

/* ---------- Comprobaciones del esquema ---------- */
T.validar=d=>{const N=NODOS[d.nodo],out=[],usados={};
  const vistos=new Set();for(const c of N.con){if(!c.var||vistos.has(c.var))continue;vistos.add(c.var);const g=+d.pines[c.var];(usados[g]=usados[g]||[]).push(c.nom);
    if(RESERV[g])out.push(['bad',`GPIO ${g} lo usa ${RESERV[g]}: elige otro para «${c.nom}».`]);
    else if(c.tipo==='ana'&&!(g>=2&&g<=10))out.push(['bad',`GPIO ${g} no lee valores analógicos con el WiFi/LoRa en marcha: para «${c.nom}» usa del GPIO 2 al 7.`]);
    else if(ARRANQUE.includes(g))out.push(['warn',`GPIO ${g} influye en el arranque de la placa: funciona, pero mejor otro para «${c.nom}».`])}
  for(const[g,l]of Object.entries(usados))if(l.length>1)out.push(['bad',`GPIO ${g} está puesto dos veces (${l.join(' y ')}). Cada cable necesita su pin.`]);
  for(const[p,v]of Object.entries(d.alim||{})){const P=PIEZAS[p];if(!P.v)continue;
    if(v<P.v[0]||v>P.v[1])out.push(['bad',`${P.n} funciona a ${P.v[0]===P.v[1]?n1(P.v[0]):n1(P.v[0])+'–'+n1(P.v[1])} V, no a ${n1(v)} V.`]);
    else if(P.sale==='v'&&v>3.3)out.push(['bad',`Alimentando ${P.n} a ${n1(v)} V, su señal también sale a ${n1(v)} V y el ESP32 solo aguanta 3,3 V en sus pines. Aliméntalo desde Ve (3,3 V).`])}
  if(d.nodo!=='P'&&!N.con.some(c=>c.a&&c.a[1]==='GND'))out.push(['bad','Falta la masa común (GND).']);
  if((d.energia==='solar')!==!!N.solar&&d.nodo!=='P')out.push(['warn',d.energia==='solar'?'Este nodo está pensado con enchufe en la primera versión; con batería y placa solar va en la fase 2.':'Este nodo está pensado con batería y placa solar.']);
  if(N.borrador)out.push(['warn','Esquema en BORRADOR: falta la hoja técnica del sensor RS485 para confirmar colores, tensión y dirección Modbus.']);
  return out};
const hayError=d=>T.validar(d).some(x=>x[0]==='bad');

/* ---------- Distribución de las piezas dentro de la caja ---------- */
function distribuir(d){const N=NODOS[d.nodo],c=d.caja,ps=N.piezas.filter(p=>PIEZAS[p].dentro).map(p=>({p,L:PIEZAS[p].med[0],W:PIEZAS[p].med[1],H:PIEZAS[p].med[2]})).sort((a,b)=>b.L-a.L);
  const area=ps.reduce((s,x)=>s+x.L*x.W,0),meta=Math.max(ps[0].L,Math.sqrt(area)*1.25),gap=6,filas=[];
  for(const x of ps){let f=filas.find(f=>f.L+gap+x.L<=meta);if(!f){f={L:-gap,W:0,ps:[]};filas.push(f)}x.x0=f.L+gap;f.L+=gap+x.L;f.W=Math.max(f.W,x.W);f.ps.push(x)}
  const Lu=Math.max(...filas.map(f=>f.L)),Wu=filas.reduce((s,f)=>s+f.W,0)+gap*(filas.length-1);
  const gl=N.glands.map(k=>PIEZAS[k].cable),dmax=Math.max(...gl.map(g=>GLAND[g].d));
  const tu=8;   // sitio para la tuerca de los prensaestopas por dentro (pared de delante)
  let Li=Math.max(Lu+2*c.holg,gl.length*(dmax+12)+8),Wi=Wu+2*c.holg+tu,Hi=Math.max(Math.max(...ps.map(x=>x.H))+c.extra,dmax+12);
  Li=Math.ceil(Li);Wi=Math.ceil(Wi);Hi=Math.ceil(Hi);
  let y=-Wu/2+tu/2;const sit=[];for(const f of filas){for(const x of f.ps)sit.push({p:x.p,L:x.L,W:x.W,H:x.H,cx:-Lu/2+x.x0+x.L/2,cy:y+x.W/2});y+=f.W+gap}
  return {Li,Wi,Hi,sit,gl}}

/* ---------- Geometría: un árbol CSG pequeño que sirve para Manifold (STL) y para OpenSCAD (.scad) ---------- */
const cubo=(s,p)=>({t:'cube',s,p}),cil=(r,h,p,rot)=>({t:'cyl',r,h,p,rot:rot||[0,0,0]}),uni=(...c)=>({t:'uni',c:c.flat()}),dif=(a,...c)=>({t:'dif',c:[a,...c.flat()]});
const cajaC=(L,W,H,z)=>cubo([L,W,H],[-L/2,-W/2,z]);   // caja centrada en x,y que empieza en z
function geometria(d){const c=d.caja,D=distribuir(d),t=c.ranura?Math.max(c.pared,3.6):c.pared,{Li,Wi,Hi}=D,Lo=Li+2*t,Wo=Wi+2*t,Ho=c.suelo+Hi,R=5,off=2;
  const postes=[[1,1],[1,-1],[-1,1],[-1,-1]].map(([sx,sy])=>[sx*(Lo/2+off),sy*(Wo/2+off)]);
  const suma=[cajaC(Lo,Wo,Ho,0),...postes.map(([x,y])=>cil(R,Ho,[x,y,Ho/2]))];
  if(c.orejas)for(const sx of [1,-1])suma.push(cubo([16,20,3],[sx>0?Lo/2:-Lo/2-16,-10,0]));
  for(const s of D.sit){const x0=s.cx-s.L/2-0.6,x1=s.cx+s.L/2+0.6,y0=s.cy-s.W/2-0.6,y1=s.cy+s.W/2+0.6,k=1.2,l=6;   // escuadras en las esquinas de cada pieza
    for(const[x,y,dx,dy]of[[x0,y0,1,1],[x1,y0,-1,1],[x0,y1,1,-1],[x1,y1,-1,-1]]){suma.push(cubo([l,k,3],[dx>0?x-k:x-l+k,dy>0?y-k:y,c.suelo]),cubo([k,l,3],[dx>0?x-k:x,dy>0?y-k:y-l+k,c.suelo]))}}
  const resta=[cajaC(Li,Wi,Hi+1,c.suelo),...postes.map(([x,y])=>cil(1.3,13,[x,y,Ho-6.5+0.01]))];
  if(c.ranura){const g=2,a=Lo-t,b=Wo-t;resta.push(dif(cajaC(a+g,b+g,1.5+0.01,Ho-1.5),cajaC(a-g,b-g,2,Ho-1.6)))}
  const n=D.gl.length,paso=Li/(n+1),zc=c.suelo+Hi/2;D.gl.forEach((g,i)=>resta.push(cil(GLAND[g].d/2,t*3,[-Li/2+paso*(i+1),-Wo/2,zc],[90,0,0])));
  if(c.antena)resta.push(cil(3.25,t*3,[-Li/4,Wo/2,c.suelo+Hi*0.6],[90,0,0]));
  if(c.orejas)for(const sx of [1,-1])resta.push(cil(2.25,8,[sx*(Lo/2+10),0,1.5]));
  const base=dif(uni(suma),resta);
  const tl=2.5,lab=3,lip=1.6,lo=Li-0.6,wo=Wi-0.6;   // tapa: se imprime boca abajo (la cara plana sobre la cama)
  const tapa=dif(uni(cajaC(Lo,Wo,tl,0),...postes.map(([x,y])=>cil(R,tl,[x,y,tl/2])),dif(cajaC(lo,wo,lab,tl),cajaC(lo-2*lip,wo-2*lip,lab+1,tl-0.5))),postes.map(([x,y])=>cil(1.7,tl*3,[x,y,tl/2])));
  return {base,tapa,D,t,Lo,Wo,Ho,tl}}

/* Manifold (CSG de verdad) se carga la primera vez que hace falta */
let MF=null;
T.manifold=async()=>{if(MF)return MF;const m=await import('./manifold.js');const w=await m.default({locateFile:f=>new URL(f,document.baseURI).href});w.setup();MF=w;return w};
function aManifold(W,nd){const{Manifold}=W;
  if(nd.t==='cube')return Manifold.cube(nd.s,false).translate(nd.p);
  if(nd.t==='cyl'){const a=Manifold.cylinder(nd.h,nd.r,nd.r,48,true),b=a.rotate(nd.rot);a.delete();const c=b.translate(nd.p);b.delete();return c}
  const hs=nd.c.map(x=>aManifold(W,x));let r;
  if(nd.t==='uni')r=Manifold.union(hs);else{const[a,...rs]=hs;if(!rs.length)return a;const u=Manifold.union(rs);r=a.subtract(u);u.delete();}
  hs.forEach(h=>h.delete());return r}
T.mallas=async d=>{const W=await T.manifold(),g=geometria(d),out={};for(const k of ['base','tapa']){const m=aManifold(W,g[k]),me=m.getMesh();out[k]={v:Float32Array.from(me.vertProperties),np:me.numProp,f:Uint32Array.from(me.triVerts),vol:m.volume()};m.delete()}out.g=g;return out};
function stl(ms,nombre){const nt=ms.f.length/3,buf=new ArrayBuffer(84+nt*50),dv=new DataView(buf);const h=('Taller de sensores · '+nombre).slice(0,79);for(let i=0;i<h.length;i++)dv.setUint8(i,h.charCodeAt(i)&127);dv.setUint32(80,nt,true);
  const P=i=>[ms.v[i*ms.np],ms.v[i*ms.np+1],ms.v[i*ms.np+2]];
  for(let t=0;t<nt;t++){const a=P(ms.f[3*t]),b=P(ms.f[3*t+1]),c=P(ms.f[3*t+2]),u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    let nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];const l=Math.hypot(nx,ny,nz)||1;const o=84+t*50;
    [nx/l,ny/l,nz/l,...a,...b,...c].forEach((x,i)=>dv.setFloat32(o+i*4,x,true));dv.setUint16(o+48,0,true)}
  return buf}
T.stl=async(d,k)=>{const m=await T.mallas(d);return stl(m[k],d.nombre+' · '+k)};
function scadNodo(nd,ind){const f=x=>+x.toFixed(3),p=ind||'';
  if(nd.t==='cube')return `${p}translate([${nd.p.map(f)}]) cube([${nd.s.map(f)}]);`;
  if(nd.t==='cyl')return `${p}translate([${nd.p.map(f)}]) rotate([${nd.rot}]) cylinder(h=${f(nd.h)}, r=${f(nd.r)}, center=true);`;
  return `${p}${nd.t==='uni'?'union':'difference'}() {\n${nd.c.map(x=>scadNodo(x,p+'  ')).join('\n')}\n${p}}`}
T.scad=d=>{const g=geometria(d);return `// Taller de sensores · ${d.nombre} · ${NODOS[d.nodo].n}
// Generado por Agro FLY el ${new Date().toLocaleDateString('es-ES')}. Medidas en mm. Ábrelo en OpenSCAD o en el OpenSCAD Playground.
// Caja por fuera: ${n1(g.Lo)} × ${n1(g.Wo)} × ${n1(g.Ho)} mm · pared ${n1(g.t)} mm. Imprime en PETG o ASA (el PLA se deforma con el calor del invernadero).
$fn = 48;
pieza = "base";   // "base" o "tapa"
if (pieza == "base") base(); else tapa();
module base() {
${scadNodo(g.base,'  ')}
}
module tapa() {
${scadNodo(g.tapa,'  ')}
}
`};

/* ---------- Vista 3D (dibujada a mano en un canvas: sin librerías) ---------- */
function prismas(D,c){const out=[];for(const s of D.sit){const P=PIEZAS[s.p];out.push({x0:s.cx-s.L/2,x1:s.cx+s.L/2,y0:s.cy-s.W/2,y1:s.cy+s.W/2,z0:c.suelo,z1:c.suelo+s.H,col:P.color})}return out}
function tris(ms,col,tf){const out=[],P=i=>tf([ms.v[i*ms.np],ms.v[i*ms.np+1],ms.v[i*ms.np+2]]);for(let t=0;t<ms.f.length;t+=3)out.push([P(ms.f[t]),P(ms.f[t+1]),P(ms.f[t+2]),col]);return out}
function trisCaja(b){const{x0,x1,y0,y1,z0,z1,col}=b,v=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
  return [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]].map(([a,b,c])=>[v[a],v[b],v[c],col])}
T.dibujar=()=>{const s=S(),cv=document.getElementById('tl_cv');if(!cv||!s.m)return;const g=s.m.g,dpr=Math.min(2,window.devicePixelRatio||1),Wc=cv.clientWidth||320,Hc=cv.clientHeight||300;
  cv.width=Wc*dpr;cv.height=Hc*dpr;const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,Wc,Hc);
  const lift=g.Ho+8+18*s.expl,flip=p=>[p[0],-p[1],lift+g.tl-p[2]];   // la tapa, dada la vuelta y levantada
  let T3=[...tris(s.m.base,'#dfe6e2',p=>p),...tris(s.m.tapa,'#c9d6cf',flip)];for(const b of prismas(g.D,s.d.caja))T3.push(...trisCaja(b));
  const cy=Math.cos(s.yaw*Math.PI/180),sy=Math.sin(s.yaw*Math.PI/180),cp=Math.cos(s.pitch*Math.PI/180),sp=Math.sin(s.pitch*Math.PI/180),zc=(lift+g.tl)/2;
  const rot=p=>{const X=p[0]*cy-p[1]*sy,Y=p[0]*sy+p[1]*cy,Z=p[2]-zc;return [X,Y*sp+Z*cp,-Y*cp+Z*sp]};   // [x pantalla, y arriba, profundidad]
  const R=T3.map(([a,b,c,col])=>({A:rot(a),B:rot(b),C:rot(c),col}));
  const ext=Math.max(...R.flatMap(r=>[r.A,r.B,r.C]).map(p=>Math.max(Math.abs(p[0]),Math.abs(p[1])))),k=Math.min(Wc,Hc)/2/ext*0.92;
  // z-buffer píxel a píxel: así lo de dentro no se pinta encima de las paredes
  const w=cv.width,h=cv.height,img=x.getImageData(0,0,w,h),px=img.data,zb=new Float32Array(w*h).fill(-1e9),K=k*dpr,L=[0.35,0.75,0.55],ln=Math.hypot(...L);
  for(const r of R){const u=[r.B[0]-r.A[0],r.B[1]-r.A[1],r.B[2]-r.A[2]],v=[r.C[0]-r.A[0],r.C[1]-r.A[1],r.C[2]-r.A[2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],nl=Math.hypot(...n)||1;
    const sh=0.42+0.58*Math.abs((n[0]*L[0]+n[1]*L[1]+n[2]*L[2])/nl/ln),col=r.col.match(/\w\w/g).map(c=>Math.round(parseInt(c,16)*sh));
    const P=[r.A,r.B,r.C].map(q=>[w/2+q[0]*K,h/2-q[1]*K,q[2]]),ar=(P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[1][1]-P[0][1])*(P[2][0]-P[0][0]);if(Math.abs(ar)<1e-9)continue;
    const x0=Math.max(0,Math.floor(Math.min(P[0][0],P[1][0],P[2][0]))),x1=Math.min(w-1,Math.ceil(Math.max(P[0][0],P[1][0],P[2][0]))),y0=Math.max(0,Math.floor(Math.min(P[0][1],P[1][1],P[2][1]))),y1=Math.min(h-1,Math.ceil(Math.max(P[0][1],P[1][1],P[2][1])));
    for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const cx=xx+0.5,cy=yy+0.5;
      const a0=((P[1][0]-cx)*(P[2][1]-cy)-(P[1][1]-cy)*(P[2][0]-cx))/ar,a1=((P[2][0]-cx)*(P[0][1]-cy)-(P[2][1]-cy)*(P[0][0]-cx))/ar,a2=1-a0-a1;
      if(a0<-1e-6||a1<-1e-6||a2<-1e-6)continue;const z=a0*P[0][2]+a1*P[1][2]+a2*P[2][2],i=yy*w+xx;if(z<=zb[i])continue;zb[i]=z;const o=i*4;px[o]=col[0];px[o+1]=col[1];px[o+2]=col[2];px[o+3]=255}}
  x.putImageData(img,0,0)};
let arr=null,raf=0;
document.addEventListener('pointerdown',e=>{if(e.target.id==='tl_cv'){arr=[e.clientX,e.clientY];e.target.setPointerCapture&&e.target.setPointerCapture(e.pointerId)}});
document.addEventListener('pointermove',e=>{if(!arr)return;const s=S();s.yaw+=(e.clientX-arr[0])*0.6;s.pitch=Math.max(-10,Math.min(85,s.pitch+(e.clientY-arr[1])*0.4));arr=[e.clientX,e.clientY];if(!raf)raf=requestAnimationFrame(()=>{raf=0;T.dibujar()})});
document.addEventListener('pointerup',()=>{arr=null});

/* ---------- Esquema de conexiones (SVG) ---------- */
function esquema(d){const N=NODOS[d.nodo],otras=N.piezas.filter(p=>p!=='heltec'),hp=[],op={};
  const lbH=c=>c.a[1]==='GPIO'?'GPIO '+d.pines[c.var]:c.a[1];
  for(const c of N.con){if(c.a&&c.a[0]==='heltec'&&!hp.includes(lbH(c)))hp.push(lbH(c))}
  for(const c of N.con)for(const e of [c.de,c.a]){if(!e||e[0]==='heltec')continue;(op[e[0]]=op[e[0]]||[]);if(!op[e[0]].includes(e[1]))op[e[0]].push(e[1])}
  const fila=22,hx=8,hw=118,ox=262,ow=150,W=ox+ow+8,py={};let y=50;   // ancho 420: en el móvil se lee sin mover la pantalla
  const hy0=50,hh=Math.max(hp.length*fila+36,110);hp.forEach((l,i)=>py['heltec|'+l]=[hx+hw,hy0+30+i*fila]);
  const cajas=otras.map(p=>{const ps=op[p]||[],h=Math.max(ps.length*fila+36,50),b={p,y,h};ps.forEach((l,i)=>py[p+'|'+l]=[ox,y+30+i*fila]);y+=h+14;return b});
  const H=Math.max(hy0+hh,y)+12,pin=(p,l)=>py[p+'|'+l];
  const hw_=N.con.filter(c=>c.a&&c.a[0]==='heltec'),z0=hx+hw+16,z1=ox-44,mal=T.validar(d).filter(v=>v[0]==='bad').map(v=>v[1]);
  let s=`<svg viewBox="0 0 ${W} ${H}" class="tl-esq" role="img" aria-label="Esquema de conexiones de ${e_(N.n)}" font-family="system-ui,sans-serif">`;
  s+=`<text x="${hx}" y="26" font-size="14" font-weight="700" fill="#15222c">${e_(N.n)}</text>`;
  s+=`<rect x="${hx}" y="${hy0}" width="${hw}" height="${hh}" rx="8" fill="#e8f0fd" stroke="#2d6cdf" stroke-width="1.5"/><text x="${hx+8}" y="${hy0+17}" font-size="12" font-weight="700" fill="#15222c">Heltec V3</text>`;
  hp.forEach(l=>{const[x,yy]=py['heltec|'+l];s+=`<text x="${x-8}" y="${yy+4}" font-size="11.5" text-anchor="end" fill="#15222c">${e_(l.replace('Batería JST','Bat. JST'))}</text>`});
  for(const b of cajas){const P=PIEZAS[b.p];s+=`<rect x="${ox}" y="${b.y}" width="${ow}" height="${b.h}" rx="8" fill="#fff" stroke="${P.color}" stroke-width="1.5"/><text x="${ox+8}" y="${b.y+17}" font-size="12" font-weight="700" fill="#15222c">${e_(P.c)}</text>`;
    (op[b.p]||[]).forEach(l=>{const[x,yy]=py[b.p+'|'+l];s+=`<text x="${x+8}" y="${yy+4}" font-size="11.5" fill="#15222c">${e_(l)}</text>`})}
  let k2=0;N.con.forEach(c=>{const a=pin(c.de[0],c.de[1]),col=c.c==='#bbb'?'#9a9a9a':c.c;
    if(!c.a){s+=`<path d="M${a[0]} ${a[1]}h-22" stroke="${col}" stroke-width="3" stroke-dasharray="3 3"/><text x="${a[0]-26}" y="${a[1]+4}" font-size="10.5" text-anchor="end" fill="#5a6a70">sin conectar</text>`;return}
    let b,mx;if(c.a[0]==='heltec'){b=py['heltec|'+lbH(c)];const k=hw_.indexOf(c);mx=z0+(hw_.length>1?k*(z1-z0)/(hw_.length-1):0)}else{b=pin(c.a[0],c.a[1]);mx=ox-12-(k2++%4)*8}
    if(!a||!b)return;const err=c.var&&mal.some(t=>t.startsWith('GPIO '+d.pines[c.var]+' '));
    s+=`<path d="M${a[0]} ${a[1]}H${mx}V${b[1]}H${b[0]}" fill="none" stroke="${col}" stroke-width="${err?4:2.5}" ${err?'stroke-dasharray="6 4"':''} stroke-linejoin="round"/>`});
  for(const k of Object.keys(py)){const[x,yy]=py[k];s+=`<circle cx="${x}" cy="${yy}" r="3.5" fill="#15222c"/>`}
  return s+'</svg>'}

/* ---------- Código de partida ---------- */
const COD={};

/* ---------- Ficha de montaje y uso ---------- */
const COMUN_INI=['Ten delante el esquema de conexiones (pestaña Esquema) y esta ficha impresa.','Suelda los pines de la Heltec: soldador en su soporte, gafas, ventilación y nada de 230 V cerca.','Prueba la Heltec sola por USB: sube un ejemplo y mira que la pantalla se enciende.'];
const FICHA={
  N1:{pasos:[...COMUN_INI,'Con la placa DESENCHUFADA, conecta el A02YYUW: rojo a Ve, negro a GND, blanco al GPIO del esquema. El amarillo queda sin conectar.','Sube el código de partida y abre el monitor serie (115200): debe salir la distancia.','Comprueba con una regla a tres distancias (30, 80 y 150 cm). Apunta la diferencia.','Imprime la base y la tapa en PETG o ASA. Pon el cordón de junta en la ranura y los prensaestopas.','Monta la caja con los prensaestopas hacia ABAJO, arriba del depósito y lejos de los vapores.','Coloca la sonda mirando recta al agua, lejos de las paredes y de la entrada de llenado.','Una semana comparando lo que dice la app con la regla antes de fiarte.'],
    uso:['Primero en el depósito N-P-K. Nunca en el de ácido nítrico (los vapores corroen el sensor y la placa).','Si marca cosas raras: espuma o agua movida durante el llenado confunden al ultrasonido. Mira la lectura con el agua quieta.','Limpia la cara del sensor si se le hace costra.']},
  N2:{pasos:[...COMUN_INI,'Sella el borde de arriba del sensor capacitivo (barniz de uñas o termorretráctil) y déjalo secar.','Con la placa DESENCHUFADA, conecta el sensor: VCC a Ve, GND a GND, AOUT al GPIO del esquema.','Calibra: apunta el valor «raw» al aire (SECO) y en un vaso de agua hasta la raya (MOJADO). Ponlos en el código.','Antes de enchufar la batería: comprueba con el polímetro cuál es el + del conector JST de la Heltec.','Conecta panel, cargador y pila como en el esquema. Primero la pila al cargador, luego el panel.','Imprime base y tapa en PETG o ASA (al aire libre, ASA). Junta en la ranura, prensaestopas hacia abajo.','Clava el sensor en el saco de coco hasta la raya, siempre a la misma distancia del gotero.','Una semana comparando con lo que ves al apretar el sustrato y con el drenaje.'],
    uso:['El valor es relativo: sirve para ver si sube o baja, no es un % exacto de agua.','El panel, mirando al sur e inclinado. Si la pila baja cada día, falta sol o sobra consumo.','Si se moja la electrónica de arriba del sensor, las lecturas se vuelven locas: vuelve a sellarla.']},
  N3:{pasos:[...COMUN_INI,'NO conectes el sensor RS485 todavía: falta su hoja técnica (colores, tensión y dirección Modbus).','Ajusta el MT3608 a 12 V con el polímetro, SIN nada conectado a su salida.','Con la placa DESENCHUFADA, conecta el MAX3485: VCC a Ve, GND, RO, DI y DE+RE a los GPIO del esquema.','Cuando tengamos la hoja técnica: conecta A y B. Si no contesta, prueba a cambiar A por B (no se rompe nada).','Batería, cargador y panel igual que en el N2 (comprueba el + del JST con el polímetro).','Imprime en ASA. Junta en la ranura, prensaestopas hacia abajo.'],
    uso:['La CE del sustrato no es la misma que la CE del gotero o del drenaje: compárala siempre con la del drenaje del mismo día.','Limpia las varillas del sensor de vez en cuando: la cal falsea la CE.']},
  P:{pasos:[...COMUN_INI,'Busca un sitio con WiFi buena y enchufe, a la sombra, a ser posible alto (llega más lejos la radio).','Sube el código del receptor (lo preparamos en el hilo de sensores): recibe por LoRa y lo manda a la app.','Comprueba en la app que llegan los datos de los sensores.','Imprime base y tapa. Si va dentro de una caseta, vale PETG.'],
    uso:['Si dejan de llegar datos de todos los sensores a la vez, mira primero la pasarela: luz, WiFi y enchufe.']}
};

/* ---------- Nodos del catálogo (N4–N9): lo que se puede montar con la misma placa ----------
   I2C: SDA y SCL en GPIO 41 y 42 (libres en la Heltec V3; los 17 y 18 son de la pantalla). Varios sensores I2C comparten los dos cables (bus). */
Object.assign(PIEZAS,{
  sht40:{c:'SHT40',n:'Sensor de temperatura y humedad SHT40 (módulo I2C)',med:[0,0,0],dentro:false,color:'#0e7c86',v:[3.3,5],
    nota:'Fuera de la caja, dentro de una garita con lamas, a la sombra y a la altura de la planta. Sin garita, al sol, marca 5–6 °C de más.',cable:'PG7'},
  mlx:{c:'MLX90614 (3,3 V)',n:'Sensor de temperatura infrarrojo MLX90614 (GY-906, versión de 3,3 V)',med:[0,0,0],dentro:false,color:'#b03a2e',v:[3.3,3.3],
    nota:'Mira a las hojas de arriba a unos 20–30 cm, sin ver cielo ni suelo. Compra la versión de 3,3 V (MLX90614BAA); la de 5 V no vale aquí.',cable:'PG7'},
  ds18:{c:'DS18B20',n:'Sonda de temperatura DS18B20 sumergible (1 m de cable)',med:[0,0,0],dentro:false,color:'#1f77b4',v:[3,5.5],sale:'v',
    nota:'Para el sustrato (raíz) o el depósito de solución. Lleva una resistencia de 4,7 kΩ entre el cable de datos y 3,3 V.',cable:'PG7'},
  r47k:{c:'Resistencia 4,7 kΩ',n:'Resistencia de 4,7 kΩ (entre DATA y 3,3 V)',med:[12,4,4],dentro:true,color:'#8c564b'},
  reed:{c:'Emisor de pulsos',n:'Emisor de pulsos de contacto seco (contador de agua, pluviómetro de cazoletas o anemómetro)',med:[0,0,0],dentro:false,color:'#2ca02c',
    nota:'Contacto seco (reed): no lleva tensión. Si tu contador da pulsos con tensión (5–24 V, «open collector»), hace falta un optoacoplador: no lo conectes directo.',cable:'PG7'},
  c100n:{c:'Condensador 100 nF',n:'Condensador cerámico de 100 nF (antirrebote del contacto)',med:[6,3,6],dentro:true,color:'#bcbd22'},
  t420:{c:'Sensor 4–20 mA',n:'Transductor de 2 hilos 4–20 mA (presión 0–10 bar, nivel por radar, radiación…)',med:[0,0,0],dentro:false,color:'#9467bd',v:[12,24],
    nota:'Dos hilos: el + al elevador de 12 V y el − a la resistencia de 150 Ω. La corriente (4–20 mA) se lee como 0,6–3,0 V en la placa.',cable:'PG7'},
  r150:{c:'Resistencia 150 Ω',n:'Resistencia de 150 Ω, 1 %, 0,25 W (convierte los mA en voltios)',med:[12,4,4],dentro:true,color:'#8c564b'},
  scd41:{c:'SCD41',n:'Sensor de CO₂ SCD41 (módulo I2C; también da temperatura y humedad)',med:[0,0,0],dentro:false,color:'#17becf',v:[3.3,5],
    nota:'Necesita aire: en garita o en una cajita con rejilla, nunca dentro de la caja cerrada. Da picos de unos 200 mA al medir.',cable:'PG7'},
  sct:{c:'SCT-013-030',n:'Pinza de corriente SCT-013-030 (30 A → 1 V, con salida de jack)',med:[0,0,0],dentro:false,color:'#e377c2',
    nota:'Se abraza a UN solo cable de la bomba (la fase), nunca a la manguera entera. No hay que pelar ni tocar los 230 V. Si no lo ves claro, que la ponga el electricista.',cable:'PG7'},
  bias:{c:'Polarización',n:'Placa de polarización: 2 resistencias de 10 kΩ y condensador de 10 µF',med:[25,15,8],dentro:true,color:'#7f7f7f',
    nota:'Sube la señal de la pinza a la mitad (1,65 V) para que la placa pueda leer la parte negativa de la corriente alterna.'}
});
Object.assign(NODOS,{
  N4:{n:'N4 · Clima y hoja (aire, humedad y temperatura de la hoja)',corto:'Clima y hoja',solar:true,piezas:['heltec','sht40','mlx','bat','carg','panel'],
    con:[{de:['sht40','VCC'],a:['heltec','Ve'],c:'#d62728',alim:'sht40'},{de:['sht40','GND'],a:['heltec','GND'],c:'#222'},
      {de:['sht40','SDA'],a:['heltec','GPIO'],c:'#1f77b4',var:'sda',tipo:'gpio',def:41,nom:'SDA (datos I2C)'},{de:['sht40','SCL'],a:['heltec','GPIO'],c:'#ff7f0e',var:'scl',tipo:'gpio',def:42,nom:'SCL (reloj I2C)'},
      {de:['mlx','VIN'],a:['heltec','Ve'],c:'#d62728',alim:'mlx'},{de:['mlx','GND'],a:['heltec','GND'],c:'#222'},
      {de:['mlx','SDA'],a:['heltec','GPIO'],c:'#1f77b4',var:'sda',tipo:'gpio',def:41,nom:'SDA (datos I2C)'},{de:['mlx','SCL'],a:['heltec','GPIO'],c:'#ff7f0e',var:'scl',tipo:'gpio',def:42,nom:'SCL (reloj I2C)'}],
    glands:['sht40','mlx','panel']},
  N5:{n:'N5 · Temperatura de la raíz o del agua (DS18B20)',corto:'Temperatura de raíz',solar:true,piezas:['heltec','ds18','r47k','bat','carg','panel'],
    con:[{de:['ds18','Rojo (VCC)'],a:['heltec','Ve'],c:'#d62728',alim:'ds18'},{de:['ds18','Negro (GND)'],a:['heltec','GND'],c:'#222'},
      {de:['ds18','Amarillo (DATA)'],a:['heltec','GPIO'],c:'#e6c300',var:'ow',tipo:'gpio',def:6,nom:'Datos de la sonda (1-Wire)'},
      {de:['r47k','Pata 1'],a:['heltec','Ve'],c:'#d62728'},{de:['r47k','Pata 2'],a:['ds18','Amarillo (DATA)'],c:'#e6c300'}],
    glands:['ds18','panel']},
  N6:{n:'N6 · Pulsos: drenaje, contador de agua o viento',corto:'Contador de pulsos',solar:true,piezas:['heltec','reed','c100n','bat','carg','panel'],
    con:[{de:['reed','Hilo 1'],a:['heltec','GPIO'],c:'#2ca02c',var:'pul',tipo:'gpio',def:2,nom:'Entrada de pulsos'},{de:['reed','Hilo 2'],a:['heltec','GND'],c:'#222'},
      {de:['c100n','Pata 1'],a:['reed','Hilo 1'],c:'#2ca02c'},{de:['c100n','Pata 2'],a:['heltec','GND'],c:'#222',nota:'El condensador va entre la entrada de pulsos y GND, lo más cerca posible de la placa: evita que un rebote cuente doble'}],
    glands:['reed','panel']},
  N7:{n:'N7 · Sensor 4–20 mA (presión, nivel por radar, radiación…)',corto:'Sensor 4–20 mA',piezas:['heltec','t420','r150','mt3608','usb'],
    con:[{de:['mt3608','VIN+'],a:['heltec','Ve'],c:'#d62728'},{de:['mt3608','VIN−'],a:['heltec','GND'],c:'#222'},
      {de:['t420','+'],a:['mt3608','OUT+ (12 V)'],c:'#d62728',alim:'t420',v:12},{de:['t420','−'],a:['r150','Pata 1'],c:'#9467bd'},
      {de:['r150','Pata 1'],a:['heltec','GPIO'],c:'#1f77b4',var:'ana',tipo:'ana',def:7,nom:'Lectura de la corriente (tensión en la resistencia)'},
      {de:['r150','Pata 2'],a:['mt3608','OUT−'],c:'#222'},{de:['usb','USB-C'],a:['heltec','USB-C'],c:'#7f8c8d'}],
    glands:['t420','usb']},
  N8:{n:'N8 · CO₂ (SCD41)',corto:'CO₂',piezas:['heltec','scd41','usb'],
    con:[{de:['scd41','VCC'],a:['heltec','Ve'],c:'#d62728',alim:'scd41'},{de:['scd41','GND'],a:['heltec','GND'],c:'#222'},
      {de:['scd41','SDA'],a:['heltec','GPIO'],c:'#1f77b4',var:'sda',tipo:'gpio',def:41,nom:'SDA (datos I2C)'},{de:['scd41','SCL'],a:['heltec','GPIO'],c:'#ff7f0e',var:'scl',tipo:'gpio',def:42,nom:'SCL (reloj I2C)'},
      {de:['usb','USB-C'],a:['heltec','USB-C'],c:'#7f8c8d'}],
    glands:['scd41','usb']},
  N9:{n:'N9 · Consumo de la bomba (pinza de corriente)',corto:'Consumo de bomba',piezas:['heltec','sct','bias','usb'],
    con:[{de:['bias','Arriba (10 kΩ)'],a:['heltec','Ve'],c:'#d62728'},{de:['bias','Abajo (10 kΩ)'],a:['heltec','GND'],c:'#222'},
      {de:['sct','Cuerpo del jack'],a:['bias','Punto medio'],c:'#7f7f7f'},
      {de:['sct','Punta del jack'],a:['heltec','GPIO'],c:'#e377c2',var:'ana',tipo:'ana',def:5,nom:'Señal de la pinza'},{de:['usb','USB-C'],a:['heltec','USB-C'],c:'#7f8c8d'}],
    glands:['sct','usb']}
});
NODOS.N2.solar=NODOS.N3.solar=true;
for(const k of ['N4','N5','N6'])NODOS[k].con=NODOS[k].con.concat(SOLARF());
/* ---------- Código de los nodos (versión 1) ----------
   Todos comparten COMUN: el número de cada placa (sale del chip, no se repite), la batería de verdad, la autoprueba «#AF …» que lee la app
   por el cable USB (Taller → Comprobar en la mesa) y el modo cobertura (botón PRG apretado al encender: una señal cada 10 s durante 15 min).
   Los mensajes por radio: «N4;id=1A2B3C;ta=24.1;hr=71;th=22.8;bat=3.98». La pasarela casera (P) los sube al servidor puente.
   Se compilan solos en GitHub con cada publicación (firmware/), para instalarlos desde la app. Sin probar todavía en placas reales. */
const COMUN=`// ---- Común a todos los nodos Agro FLY (no hace falta tocarlo) ----
#define ADC_CTRL 37     // control de la lectura de batería de la Heltec V3
#define ADC_ON LOW      // si la batería marca 0 V, cambia a HIGH (placas V3.2)
#define VBAT_PIN 1
#define BOTON_PRG 0
SX1262 radio = new Module(8, 14, 12, 13);   // NSS, DIO1, RST, BUSY (fijos en la Heltec V3)
String ID;
String idNodo() { uint64_t m = ESP.getEfuseMac(); char b[7]; snprintf(b, sizeof b, "%06X", (unsigned)((m >> 24) & 0xFFFFFF)); return String(b); }
float batV() {
  pinMode(ADC_CTRL, OUTPUT); digitalWrite(ADC_CTRL, ADC_ON); delay(10);
  uint32_t mv = 0; for (int i = 0; i < 8; i++) mv += analogReadMilliVolts(VBAT_PIN);
  digitalWrite(ADC_CTRL, !ADC_ON);
  return mv / 8.0 * 4.9 / 1000.0;   // divisor de 390 kΩ y 100 kΩ
}
void af(const String& s) { Serial.println("#AF " + s); }   // autoprueba: la lee la app por el cable USB
bool radioIni() {
  SPI.begin(9, 11, 10, 8);
  int e = radio.begin(868.0, 125.0, 9, 7, RADIOLIB_SX126X_SYNC_WORD_PRIVATE, 14, 8, 1.8);
  af(e == RADIOLIB_ERR_NONE ? String("radio=ok") : "radio=err" + String(e));
  return e == RADIOLIB_ERR_NONE;
}
void enviar(String m) {      // por copia: RadioLib pide un String que pueda tocar
  Serial.println(m); af("dato=" + m);
  int e = radio.transmit(m);
  if (e != RADIOLIB_ERR_NONE) af("envio=err" + String(e));
}
void dormir(uint64_t minutos) {
  radio.sleep(); pinMode(36, OUTPUT); digitalWrite(36, HIGH);   // apaga la radio y los sensores (Vext)
  esp_sleep_enable_timer_wakeup(minutos * 60ULL * 1000000ULL);
  esp_deep_sleep_start();   // duerme y vuelve a empezar desde setup()
}
// Modo cobertura: con el botón PRG apretado al encender, una señal cada 10 s durante 15 minutos
void cobertura() {
  if (digitalRead(BOTON_PRG) != LOW) return;
  af("modo=cobertura");
  if (!radioIni()) return;
  for (int n = 1; n <= 90; n++) { enviar("PING;id=" + ID + ";n=" + String(n)); delay(10000); }
  ESP.restart();
}
void inicio(const char* nodo) {
  Serial.begin(115200); delay(300);
  pinMode(BOTON_PRG, INPUT_PULLUP);
  ID = idNodo();
  af(String("nodo=") + nodo); af("id=" + ID); af("version=1");
  cobertura();
}
// ---- Fin de lo común ----`;
Object.assign(COD,{
N1:`// N1 · Nivel del depósito · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib
#include <RadioLib.h>
#define VEXT 36
#define SENSOR_RX {rx}   // cable blanco (TX del A02YYUW)
${COMUN}
HardwareSerial Sensor(1);
const float FONDO_CM = 167;   // distancia del sensor al fondo: CÁMBIALA por la medida real
const float LLENO_CM = 20;    // distancia con el depósito lleno: CÁMBIALA

int leerMM() {                // el sensor manda 4 bytes: 0xFF, alto, bajo, suma
  unsigned long t0 = millis();
  while (millis() - t0 < 1000) {
    if (Sensor.available() >= 4 && Sensor.read() == 0xFF) {
      int h = Sensor.read(), l = Sensor.read(), s = Sensor.read();
      if (((0xFF + h + l) & 0xFF) == s) return h * 256 + l;
    }
  }
  return -1;
}
void setup() {
  inicio("N1");
  pinMode(VEXT, OUTPUT); digitalWrite(VEXT, LOW); delay(500);
  Sensor.begin(9600, SERIAL_8N1, SENSOR_RX, -1);
  af(leerMM() > 0 ? "a02=ok" : "a02=no");
  radioIni();
}
void loop() {
  int mm = leerMM();
  if (mm > 0) {
    float cm = mm / 10.0;
    int pct = constrain((int)round((FONDO_CM - cm) * 100 / (FONDO_CM - LLENO_CM)), 0, 100);
    enviar("N1;id=" + ID + ";cm=" + String(cm, 0) + ";pct=" + String(pct));
  } else af("a02=no");
  af("fin");
  delay(60000);               // una lectura por minuto
}
`,
N2:`// N2 · Humedad del sustrato (capacitivo) · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib
#include <RadioLib.h>
#define VEXT 36
#define AOUT {ana}       // salida analógica del sensor
${COMUN}
const int SECO = 3000;     // CALIBRA: valor con el sensor al aire
const int MOJADO = 1300;   // CALIBRA: valor con el sensor en un vaso de agua (hasta la raya)
const uint64_t DORMIR_MIN = 10;

void setup() {
  inicio("N2");
  pinMode(VEXT, OUTPUT); digitalWrite(VEXT, LOW); delay(800);
  analogReadResolution(12);
  long suma = 0; for (int i = 0; i < 16; i++) { suma += analogRead(AOUT); delay(20); }
  int raw = suma / 16;
  af(raw > 100 && raw < 4000 ? "cap=ok" : "cap=no");
  int hum = constrain(map(raw, SECO, MOJADO, 0, 100), 0, 100);
  float b = batV(); af("bat=" + String(b, 2));
  radioIni();
  enviar("N2;id=" + ID + ";hum=" + String(hum) + ";raw=" + String(raw) + ";bat=" + String(b, 2));
  af("fin");
  dormir(DORMIR_MIN);
}
void loop() {}
`,
N4:`// N4 · Clima y hoja · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librerías: RadioLib, Adafruit SHT4x, Adafruit MLX90614
#include <RadioLib.h>
#include <Wire.h>
#include <Adafruit_SHT4x.h>
#include <Adafruit_MLX90614.h>
#define VEXT 36
#define I2C_SDA {sda}
#define I2C_SCL {scl}
${COMUN}
Adafruit_SHT4x sht; Adafruit_MLX90614 mlx;
const uint64_t DORMIR_MIN = 10;

void setup() {
  inicio("N4");
  pinMode(VEXT, OUTPUT); digitalWrite(VEXT, LOW); delay(300);
  Wire.begin(I2C_SDA, I2C_SCL);
  float ta = NAN, hr = NAN, th = NAN;
  if (sht.begin(&Wire)) { sensors_event_t h, t; sht.getEvent(&h, &t); ta = t.temperature; hr = h.relative_humidity; af("sht40=ok"); }
  else af("sht40=no");
  if (mlx.begin(MLX90614_I2CADDR, &Wire)) { th = mlx.readObjectTempC(); af("mlx=ok"); }
  else af("mlx=no");
  float b = batV(); af("bat=" + String(b, 2));
  radioIni();
  enviar("N4;id=" + ID + ";ta=" + String(ta, 1) + ";hr=" + String(hr, 0) + ";th=" + String(th, 1) + ";bat=" + String(b, 2));
  af("fin");
  dormir(DORMIR_MIN);
}
void loop() {}
`,
N5:`// N5 · Temperatura de la raíz o del agua · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librerías: RadioLib, OneWire, DallasTemperature
#include <RadioLib.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#define VEXT 36
#define SONDA {ow}       // cable amarillo de la DS18B20
${COMUN}
OneWire ow(SONDA); DallasTemperature sondas(&ow);
const uint64_t DORMIR_MIN = 10;

void setup() {
  inicio("N5");
  pinMode(VEXT, OUTPUT); digitalWrite(VEXT, LOW); delay(300);
  sondas.begin(); sondas.requestTemperatures();
  float t = sondas.getTempCByIndex(0);
  af(t == DEVICE_DISCONNECTED_C ? "ds18=no" : "ds18=ok");
  float b = batV(); af("bat=" + String(b, 2));
  radioIni();
  enviar("N5;id=" + ID + ";t=" + String(t, 1) + ";bat=" + String(b, 2));
  af("fin");
  dormir(DORMIR_MIN);
}
void loop() {}
`,
N6:`// N6 · Contador de pulsos (drenaje, agua o viento) · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib
// Cuenta los pulsos todo el rato y manda la suma cada 10 minutos.
#include <RadioLib.h>
#define PULSOS {pul}
${COMUN}
const float POR_PULSO = 5.0;       // CALIBRA: ml por vuelco, litros por pulso o km/h por pulso/s
const unsigned long CADA_MS = 10UL * 60UL * 1000UL;
volatile unsigned long cuenta = 0, ultimo = 0;
void IRAM_ATTR pulso() { unsigned long t = millis(); if (t - ultimo > 30) { cuenta++; ultimo = t; } }   // 30 ms antirrebote

void setup() {
  inicio("N6");
  pinMode(PULSOS, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PULSOS), pulso, FALLING);
  af("pulsos=listo"); af("bat=" + String(batV(), 2));
  radioIni();
  af("fin");
}
void loop() {
  static unsigned long t0 = millis(), visto = 0;
  if (cuenta != visto) { visto = cuenta; af("pulso=" + String(visto)); }   // en la mesa: cada vuelco suma 1
  if (millis() - t0 >= CADA_MS) {
    t0 = millis();
    noInterrupts(); unsigned long n = cuenta; cuenta = 0; visto = 0; interrupts();
    enviar("N6;id=" + ID + ";pul=" + String(n) + ";valor=" + String(n * POR_PULSO, 1) + ";bat=" + String(batV(), 2));
    radio.sleep();
  }
  delay(50);
}
`,
N7:`// N7 · Sensor 4–20 mA · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib
#include <RadioLib.h>
#define VEXT 36
#define SENAL {ana}      // tensión en la resistencia de 150 Ω
${COMUN}
const float R_OHM = 150.0;
const float MIN_ESCALA = 0.0, MAX_ESCALA = 10.0;   // CAMBIA: lo que mide a 4 mA y a 20 mA (bar, cm, W/m²…)
const char* UNIDAD = "bar";

float leerMA() { long mv = 0; for (int i = 0; i < 32; i++) { mv += analogReadMilliVolts(SENAL); delay(5); } return (mv / 32.0) / R_OHM; }
void setup() {
  inicio("N7");
  pinMode(VEXT, OUTPUT); digitalWrite(VEXT, LOW); delay(1500);   // deja que el sensor arranque
  float ma = leerMA();
  af(ma >= 3.5 ? "lazo=ok" : "lazo=no"); af("ma=" + String(ma, 2));
  radioIni();
}
void loop() {
  float ma = leerMA();
  float valor = MIN_ESCALA + (ma - 4.0) * (MAX_ESCALA - MIN_ESCALA) / 16.0;
  if (ma < 3.5) af("lazo=no");
  enviar("N7;id=" + ID + ";ma=" + String(ma, 2) + ";valor=" + String(valor, 2) + ";u=" + UNIDAD);
  radio.sleep();
  af("fin");
  delay(60000);               // una lectura por minuto
}
`,
N8:`// N8 · CO₂ (SCD41) · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librerías: RadioLib, Sensirion I2C SCD4x
#include <RadioLib.h>
#include <Wire.h>
#include <SensirionI2cScd4x.h>
#define VEXT 36
#define I2C_SDA {sda}
#define I2C_SCL {scl}
${COMUN}
SensirionI2cScd4x scd;

void setup() {
  inicio("N8");
  pinMode(VEXT, OUTPUT); digitalWrite(VEXT, LOW); delay(300);
  Wire.begin(I2C_SDA, I2C_SCL);
  scd.begin(Wire, SCD41_I2C_ADDR_62);
  scd.stopPeriodicMeasurement(); delay(500);
  af(scd.startPeriodicMeasurement() == 0 ? "scd41=ok" : "scd41=no");   // una medida cada 5 s
  radioIni();
}
void loop() {
  static bool primera = true;
  delay(primera ? 10000 : 300000);              // la primera a los 10 s; después cada 5 minutos
  primera = false;
  uint16_t co2 = 0; float t = 0, hr = 0;
  if (scd.readMeasurement(co2, t, hr) == 0 && co2 > 0) {
    enviar("N8;id=" + ID + ";co2=" + String(co2) + ";ta=" + String(t, 1) + ";hr=" + String(hr, 0));
    radio.sleep();
  } else af("scd41=sin_medida");
  af("fin");
}
`,
N9:`// N9 · Consumo de la bomba (pinza SCT-013-030) · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib
#include <RadioLib.h>
#define PINZA {ana}
${COMUN}
const float AMP_POR_VOLTIO = 30.0;   // SCT-013-030: 30 A dan 1 V
const float UMBRAL_A = 1.0;          // por encima, la bomba está funcionando (CAMBIA tras mirar los valores)

float amperios() {                   // valor eficaz de unas 10 ondas de 50 Hz
  const int N = 2000; static float v[N]; long suma = 0;
  for (int i = 0; i < N; i++) { v[i] = analogReadMilliVolts(PINZA); suma += v[i]; delayMicroseconds(100); }
  float media = suma / (float)N, cuad = 0;
  for (int i = 0; i < N; i++) { float d = v[i] - media; cuad += d * d; }
  af("media_mv=" + String(media, 0));   // con la placa de polarización debe salir cerca de 1650
  return sqrt(cuad / N) / 1000.0 * AMP_POR_VOLTIO;
}
void setup() {
  inicio("N9");
  float a = amperios();
  af("pinza=ok"); af("amp=" + String(a, 1));
  radioIni();
}
void loop() {
  float a = amperios();
  enviar("N9;id=" + ID + ";amp=" + String(a, 1) + ";marcha=" + String(a > UMBRAL_A ? 1 : 0));
  radio.sleep();
  af("fin");
  delay(60000);
}
`,
P:`// P · Pasarela casera (LoRa → wifi → servidor puente) · versión 1 (sin probar todavía en la placa real)
// Placa: Heltec WiFi LoRa 32 V3 · Librería: RadioLib (WiFi, HTTPClient y Preferences vienen con la placa)
// La wifi, la dirección del servidor y la clave se le pasan desde la app por el cable USB (Taller → Comprobar en la mesa):
// la app manda «CFG wifi=…|clave=…|url=…|token=…» y la placa lo guarda y se reinicia.
#include <RadioLib.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
${COMUN}
Preferences cfg; String WIFI, CLAVE, URL, TOKEN;
volatile bool llega = false;
void IRAM_ATTR alRecibir() { llega = true; }
String cola[20]; int nCola = 0;

void leerCfg() {
  cfg.begin("af", true);
  WIFI = cfg.getString("wifi", ""); CLAVE = cfg.getString("clave", ""); URL = cfg.getString("url", ""); TOKEN = cfg.getString("token", "");
  cfg.end();
}
void mirarSerie() {
  if (!Serial.available()) return;
  String l = Serial.readStringUntil('\\n'); l.trim();
  if (!l.startsWith("CFG ")) return;
  l = l.substring(4);
  cfg.begin("af", false);
  while (l.length()) {
    int p = l.indexOf('|'); String kv = p < 0 ? l : l.substring(0, p); l = p < 0 ? "" : l.substring(p + 1);
    int e = kv.indexOf('='); if (e > 0) cfg.putString(kv.substring(0, e).c_str(), kv.substring(e + 1));
  }
  cfg.end();
  af("cfg=ok"); delay(300); ESP.restart();
}
bool conectar() {
  if (WiFi.status() == WL_CONNECTED) return true;
  if (!WIFI.length()) return false;
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI.c_str(), CLAVE.c_str());
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(250); mirarSerie(); }
  return WiFi.status() == WL_CONNECTED;
}
bool subir(const String& json) {
  if (!URL.length() || !conectar()) return false;
  HTTPClient h; h.begin(URL);
  h.addHeader("Content-Type", "application/json"); h.addHeader("Authorization", "Bearer " + TOKEN);
  int c = h.POST(json); h.end();
  return c >= 200 && c < 300;
}
void setup() {
  inicio("P");
  leerCfg();
  af(WIFI.length() ? "wifi_cfg=ok" : "wifi_cfg=falta");
  af(conectar() ? "wifi=ok" : "wifi=no");
  af(URL.length() ? "url=ok" : "url=falta");
  if (radioIni()) { radio.setPacketReceivedAction(alRecibir); radio.startReceive(); }
  af("fin");
}
void loop() {
  mirarSerie();
  if (llega) {
    llega = false;
    String m; int e = radio.readData(m);
    if (e == RADIOLIB_ERR_NONE) {
      String j = "{\\"raw\\":\\"" + m + "\\",\\"rssi\\":" + String(radio.getRSSI(), 0) + ",\\"snr\\":" + String(radio.getSNR(), 1) + ",\\"gw\\":\\"" + ID + "\\"}";
      af("recibido=" + m);
      if (!subir(j) && nCola < 20) cola[nCola++] = j;
    }
    radio.startReceive();
  }
  static unsigned long t0 = 0;
  if (millis() - t0 > 600000UL) {   // cada 10 minutos: «sigo viva» y lo que no se pudo subir
    t0 = millis();
    subir("{\\"raw\\":\\"P;id=" + ID + ";up=" + String(millis() / 60000) + "\\",\\"gw\\":\\"" + ID + "\\"}");
    int q = 0; for (int i = 0; i < nCola; i++) if (!subir(cola[i])) cola[q++] = cola[i];
    nCola = q;
  }
}
`});
const SOLAR_PASOS=['Antes de enchufar la batería: comprueba con el polímetro cuál es el + del conector JST de la Heltec.','Conecta panel, cargador y pila como en el esquema. Primero la pila al cargador, luego el panel.'];
Object.assign(FICHA,{
  N4:{pasos:[...COMUN_INI,'Con la placa DESENCHUFADA, conecta el SHT40 y el MLX90614 a los mismos dos cables: SDA con SDA y SCL con SCL (es un bus: comparten pines). VCC a Ve y GND a GND.','Sube el código y mira en el monitor serie las tres temperaturas: aire, humedad y hoja.','Comprueba: el aire con un termómetro de confianza a la sombra; la hoja con la pistola infrarroja apuntando a la misma hoja.',...SOLAR_PASOS,'Pon el SHT40 dentro de una garita con lamas (comprada o impresa en 3D), a la sombra y a la altura de la planta.','Sujeta el MLX90614 mirando a las hojas de arriba a 20–30 cm, sin que vea cielo ni suelo.','Imprime la caja en PETG o ASA. Junta en la ranura y prensaestopas hacia abajo.','Una semana comparando con lo que apuntas a mano en Clima y estrés antes de fiarte.'],
    uso:['Con estos tres datos la app calcula sola el DPV, la diferencia hoja–aire y el semáforo de estrés de esa nave.','Si la hoja marca igual que el aire todo el día, mira que el sensor no apunte a un tallo, al suelo o al cielo.','Limpia la ventanita del MLX90614 de polvo y gotas: falsea la medida.']},
  N5:{pasos:[...COMUN_INI,'Con la placa DESENCHUFADA, conecta la sonda: rojo a Ve, negro a GND, amarillo al GPIO del esquema.','Pon la resistencia de 4,7 kΩ entre el amarillo y Ve (sin ella, la sonda no contesta).','Sube el código y comprueba en el monitor serie que sale la temperatura. Métela en un vaso de agua con un termómetro al lado.',...SOLAR_PASOS,'Clava la sonda en el saco, a media altura y siempre a la misma distancia del gotero, o métela en el depósito de solución.','Imprime la caja en PETG o ASA. Junta y prensaestopas hacia abajo.'],
    uso:['En invierno, por debajo de unos 15 °C en la raíz la planta absorbe peor el agua y el abono.','En verano, la solución por encima de unos 25 °C lleva poco oxígeno a la raíz.']},
  N6:{pasos:[...COMUN_INI,'Comprueba que el emisor de pulsos es de contacto seco: con el polímetro en continuidad debe abrir y cerrar al girar o vaciarse. Si da tensión, PARA: hace falta optoacoplador.','Con la placa DESENCHUFADA, conecta un hilo del contacto al GPIO del esquema y el otro a GND. Pon el condensador de 100 nF entre ese GPIO y GND.','Sube el código y provoca pulsos a mano: cada vuelco o vuelta debe sumar 1 en el monitor serie, nunca 2.','Calibra POR_PULSO: echa 500 ml en la cazoleta y cuenta los vuelcos (o mira el contador de agua tras X litros).',...SOLAR_PASOS,'Imprime la caja en PETG o ASA. Junta y prensaestopas hacia abajo.'],
    uso:['Bajo la bandeja de drenaje: el drenaje de cada riego sale solo, sin probeta.','En el contador de agua: los m³ del cabezal y aviso de fugas u obstrucciones.','Limpia la cazoleta del pluviómetro de restos y cal cada pocas semanas.']},
  N7:{pasos:[...COMUN_INI,'Ajusta el MT3608 a 12 V con el polímetro, SIN nada conectado a su salida.','Con la placa DESENCHUFADA, monta el lazo: 12 V al + del sensor, el − del sensor a la resistencia de 150 Ω, y la otra pata de la resistencia a OUT− del elevador.','Del lado de la resistencia que va al sensor, un cable al GPIO del esquema (lee la tensión).','Sube el código: sin presión debe marcar unos 4 mA (0,6 V). Si marca menos de 3,5 mA, hay un cable suelto.','Pon en el código lo que mide el sensor a 4 y a 20 mA (por ejemplo 0 y 10 bar).','Imprime la caja en PETG. Prensaestopas hacia abajo, lejos de salpicaduras del cabezal.'],
    uso:['Dos sensores (antes y después del filtro) dan la pérdida de carga: la vista Instalación avisa de limpiar.','Una lectura de 4 mA fija con riego en marcha: sensor tapado o cable cortado.']},
  N8:{pasos:[...COMUN_INI,'Con la placa DESENCHUFADA, conecta el SCD41: VCC a Ve, GND, SDA y SCL a los GPIO del esquema.','Sube el código: la primera medida tarda unos segundos. Fuera, al aire libre, debe marcar unos 420 ppm.','Pon el sensor con aire: en garita o en una cajita con rejilla, a la altura de la planta, lejos de puertas.','Imprime la caja de la placa en PETG. El sensor va fuera de ella.'],
    uso:['Con ventanas cerradas en invierno, si baja de unos 300 ppm a mediodía la planta está «pasando hambre» de CO₂: ventilar un poco o enriquecer.','El SCD41 se recalibra solo si una vez por semana respira aire de fuera (unos 420 ppm).']},
  N9:{pasos:[...COMUN_INI,'Monta la placa de polarización: dos resistencias de 10 kΩ en serie entre Ve y GND, y el condensador de 10 µF entre el punto medio y GND.','Con la placa DESENCHUFADA, conecta el jack de la pinza: el cuerpo al punto medio y la punta al GPIO del esquema.','Con la bomba PARADA, la lectura debe ser casi 0 A. Arranca la bomba y mira el valor.','Abraza la pinza a UN solo cable (la fase) de la bomba. Si no lo ves claro, que lo haga el electricista: no se toca nada de 230 V.','Ajusta UMBRAL_A a la mitad de lo que marca con la bomba en marcha.','Imprime la caja en PETG y ponla dentro del cuadro o al lado, protegida del agua.'],
    uso:['Horas reales de bomba al día: si no cuadran con los riegos, hay un fallo.','Aviso si la bomba no arranca cuando toca regar, o si consume mucho más de lo normal (atasco, rodamientos).']}
});

PREG[0].ops.splice(PREG[0].ops.findIndex(o=>o[0]==='pasarela'),0,['clima','Clima y temperatura de la hoja'],['raiz','Temperatura de la raíz o del agua'],['pulsos','Pulsos: drenaje, contador de agua o viento'],['ma','Presión u otro sensor 4–20 mA'],['co2','CO₂'],['bomba','Consumo de la bomba']);

/* ---------- Batería y placa solar: ¿aguanta todo el año? ----------
   Consumo: dormido + cada envío (despertar, leer sensores y transmitir por LoRa). Valores medidos en placas parecidas, con margen:
   la Heltec V3 dormida con los sensores apagados gasta unos 20–60 µA, más el divisor de la batería; se toma 0,1 mA para no quedarse corto.
   Sol: radiación media diaria en Murcia sobre placa inclinada ~35° al sur (PVGIS, kWh/m²·día = horas de sol pico). */
const SOL_MURCIA=[4.6,5.3,6.0,6.2,6.4,6.6,6.9,6.7,6.2,5.4,4.7,4.3];
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const EN0={min:10,w:2,mah:3000};
/* Lo que hace el nodo en cada envío: segundos despierto y mA medios (sensores + placa), más la transmisión LoRa (SF9: ~0,25 s a ~120 mA) */
const ENVIO={N1:[2,90],N2:[1.5,70],N3:[3,110],N4:[1.5,80],N5:[1.5,75],N6:[0.4,60],N7:[2,110],N8:[6,90],N9:[1,80],P:[0,0]};
T.energia=d=>{const e={...EN0,...(d.en||{})},[as,am]=ENVIO[d.nodo]||[2,90],ciclos=24*60/e.min,sleep=0.1;
  const dia=sleep*24+ciclos*(as*am+0.25*120)/3600;   // mAh al día
  const dentro=d.lugar!=='fuera',fac=(dentro?0.6:1)*0.8*0.75;   // plástico y blanqueo · suciedad y sombras · cargador y pila
  const gen=SOL_MURCIA.map(h=>e.w*h*fac/3.7*1000);       // mAh al día que mete la placa
  const util=e.mah*0.8;return {e,dia,gen,util,dias:util/dia,peor:Math.min(...gen),dentro,ciclos}};
function vEnergia(d){const N=NODOS[d.nodo],E=T.energia(d),e=E.e,solar=d.energia==='solar';
  const sel=(k,ops,u)=>`<div class="field"><label for="tle_${k}">${{min:'Manda un dato cada',w:'Placa solar',mah:'Pila 18650'}[k]}</label><div class="inp"><select id="tle_${k}" data-tle="${k}">${ops.map(v=>`<option value="${v}" ${v==e[k]?'selected':''}>${v} ${u}</option>`).join('')}</select></div></div>`;
  let h=`<div><h3>Batería y placa solar</h3><div class="sub">¿Aguanta todo el año? Cálculo con el sol de Murcia y lo que gasta este nodo</div></div>
    <div class="row">${sel('min',[1,5,10,15,30,60],'min')}${solar?sel('w',[1,2,3,5],'W')+sel('mah',[2000,2500,3000,3500],'mAh'):''}</div>
    <div class="tl-av ok" style="text-transform:none">Gasta unos <b>${E.dia.toFixed(1).replace('.',',')} mAh al día</b> (${Math.round(E.ciclos)} envíos).</div>`;
  if(!solar)return h+`<div class="note" style="text-transform:none">Va enchufado: no depende del sol. Al día gasta unos ${(E.dia*5/1000).toFixed(2).replace('.',',')} Wh, nada en la factura.</div>`;
  const ok=E.peor>=E.dia*1.5,max=Math.max(...E.gen,E.dia);
  h+=`<div class="tl-av ${ok?'ok':'bad'}" style="text-transform:none">${ok?`<b>Aguanta todo el año.</b> En el peor mes (diciembre) la placa mete unas ${Math.round(E.peor/E.dia)} veces lo que gasta.`:`<b>Va justo en invierno.</b> En diciembre la placa mete menos de 1,5 veces lo que gasta: pon una placa más grande o manda menos a menudo.`}
    Sin nada de sol, la pila aguanta unos <b>${Math.round(E.dias)} días</b>.</div>
    <div class="tl-mes">${E.gen.map((g,i)=>`<div><i style="height:${(g/max*100).toFixed(0)}%" class="${g<E.dia*1.5?'bad':''}"></i><b style="bottom:${(E.dia/max*100).toFixed(0)}%"></b><span>${MES[i]}</span></div>`).join('')}</div>
    <div class="note" style="text-transform:none">Barras: lo que mete la placa cada día de media (${E.dentro?'dentro del invernadero, con plástico y blanqueo':'al aire libre'}, sucia a medias y con las pérdidas del cargador). Raya: lo que gasta el nodo. Son cuentas con margen, no medidas: la de verdad la dará el propio nodo cuando mande su batería.</div>`;
  return h}
const CSS_EN=`.tl-rev{display:grid;gap:8px;margin-top:10px;padding-top:12px;border-top:1px solid var(--line)}.tl-revl{display:grid;gap:5px}.tl-rev small{opacity:.85}
.tl-mes{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;height:130px;align-items:end;padding-top:6px}.tl-mes>div{position:relative;height:100%;display:flex;flex-direction:column;justify-content:flex-end}
.tl-mes i{display:block;background:#2e9e5b;border-radius:3px 3px 0 0;min-height:2px}.tl-mes i.bad{background:#e67e22}.tl-mes b{position:absolute;left:-2px;right:-2px;height:2px;background:#c0392b}.tl-mes span{position:absolute;bottom:-16px;left:0;right:0;text-align:center;font-size:9.5px;color:var(--muted)}
.tl-mes{margin-bottom:20px}`;
/* ---------- Instalar y probar: por el cable USB, desde Chrome o Edge en el ordenador (Web Serial) ----------
   Instalar: baja el firmware que compila GitHub (rama «firmware») y lo carga con esptool-js de Espressif.
   Comprobar: reinicia la placa y lee su autoprueba («#AF clave=valor») para ir marcando qué funciona. */
const FW='https://raw.githubusercontent.com/Abonado/fertirrigacion/firmware/';
const ESPERA={N1:[['a02','Sensor de ultrasonidos']],N2:[['cap','Sensor capacitivo']],N4:[['sht40','SHT40 (aire)'],['mlx','MLX90614 (hoja)']],N5:[['ds18','Sonda DS18B20']],N6:[['pulsos','Entrada de pulsos']],
  N7:[['lazo','Lazo 4–20 mA']],N8:[['scd41','SCD41 (CO₂)']],N9:[['pinza','Pinza de corriente']],P:[['wifi_cfg','Wifi configurada'],['wifi','Conectada a la wifi'],['url','Servidor puente']]};
const PISTA={a02:'Revisa el cable blanco (TX) al GPIO del esquema y que el sensor tiene 5 V o 3,3 V.',cap:'Revisa el cable AOUT y que el sensor está alimentado.',sht40:'Revisa SDA, SCL, VCC y GND del SHT40.',mlx:'Revisa SDA, SCL y que es la versión de 3,3 V.',ds18:'Falta la resistencia de 4,7 kΩ o el amarillo no está en su GPIO.',
  pulsos:'',lazo:'Menos de 4 mA: el elevador no da 12 V, el lazo está abierto o al revés.',scd41:'Revisa SDA, SCL y que el SCD41 tiene alimentación.',pinza:'',wifi_cfg:'Mándale la wifi con el formulario de abajo.',wifi:'Nombre o clave de la wifi mal, o la señal no llega.',url:'Pon la dirección del servidor puente en el formulario.',radio:'La radio no arranca: mira la antena y que la placa es la V3 de 868 MHz.'};
const PL={log:[],af:{},estado:'',prog:0,port:null};
const hayWebSerial=()=>typeof navigator!=='undefined'&&!!(navigator.serial&&navigator.serial.requestPort);
const dormirMs=ms=>new Promise(r=>setTimeout(r,ms));
async function abrirPuerto(){if(PL.port)return PL.port;PL.port=await navigator.serial.requestPort({filters:[{usbVendorId:0x10c4},{usbVendorId:0x1a86},{usbVendorId:0x303a}]});return PL.port}
T.instalar=async()=>{const s=S(),d=s.d;if(!d)return;if(!hayWebSerial()){toast('Hace falta Chrome o Edge en un ordenador');return}
  PL.estado='bajando';PL.prog=0;PL.log=[];PL.af={};repinta();let bin;
  try{const r=await fetch(FW+d.nodo+'.bin',{cache:'no-store'});if(!r.ok)throw new Error('no');bin=new Uint8Array(await r.arrayBuffer())}catch(e){PL.estado='';toast('No hay firmware compilado de '+d.nodo+' todavía');repinta();return}
  let tr=null;try{const port=await abrirPuerto();PL.estado='conectando';repinta();const m=await import('./esptool.js');tr=new m.Transport(port,false);
    const term={clean(){},writeLine(t){PL.log.push(String(t))},write(t){}};const ld=new m.ESPLoader({transport:tr,baudrate:460800,terminal:term});
    const chip=await ld.main();PL.log.push('Placa: '+chip);if(!/ESP32-S3/i.test(chip))throw new Error('No es una Heltec V3 (ESP32-S3): '+chip);
    PL.estado='instalando';repinta();
    await ld.writeFlash({fileArray:[{data:bin,address:0}],flashMode:'keep',flashFreq:'keep',flashSize:'keep',eraseAll:false,compress:true,reportProgress:(i,w,t)=>{PL.prog=Math.round(w/t*100);const o=document.getElementById('tl_prog');if(o)o.style.width=PL.prog+'%'}});
    await ld.after('hard_reset');await tr.disconnect();tr=null;PL.estado='instalado';toast('Instalado. Ahora la comprobación');repinta();await dormirMs(800);T.comprobar(true)}
  catch(e){PL.estado='';PL.log.push('Error: '+(e&&e.message||e));toast(e&&e.name==='NotFoundError'?'No has elegido la placa':'No se ha podido instalar: '+(e&&e.message||'mira el registro'));try{if(tr)await tr.disconnect()}catch(x){}repinta()}};
T.comprobar=async(sinPedir)=>{const s=S(),d=s.d;if(!d)return;if(!hayWebSerial()){toast('Hace falta Chrome o Edge en un ordenador');return}
  let port;try{port=sinPedir&&PL.port?PL.port:await abrirPuerto()}catch(e){return}
  PL.af={};PL.log=[];PL.estado='leyendo';repinta();
  try{await port.open({baudRate:115200})}catch(e){}
  try{await port.setSignals({dataTerminalReady:false,requestToSend:true});await dormirMs(120);await port.setSignals({dataTerminalReady:false,requestToSend:false})}catch(e){}
  const rd=port.readable.getReader(),dec=new TextDecoder();let buf='',fin=Date.now()+45000;PL.reader=rd;
  try{while(Date.now()<fin){const r=await Promise.race([rd.read(),dormirMs(1000).then(()=>({tic:true}))]);if(r.tic)continue;if(r.done)break;buf+=dec.decode(r.value,{stream:true});let i;
      while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i).replace(/\r$/,'');buf=buf.slice(i+1);if(!l)continue;PL.log.push(l);if(PL.log.length>200)PL.log.shift();const m=/^#AF (\w+)=(.*)$/.exec(l);
        if(m){PL.af[m[1]]=m[2];if(m[1]==='fin'||(m[1]==='dato'&&d.nodo!=='P'))fin=Math.min(fin,Date.now()+(m[1]==='fin'?600:3000))}const o=document.getElementById('tl_placa');if(o)o.innerHTML=placaRes(d)}}}
  catch(e){PL.log.push('Error: '+(e&&e.message||e))}
  try{rd.releaseLock()}catch(e){}PL.reader=null;PL.estado='hecho';repinta()};
T.mandarCfg=async()=>{const v=k=>(document.getElementById('tl_'+k)||{}).value||'';const c={wifi:v('wifi').trim(),clave:v('clave'),url:v('url').trim(),token:v('token').trim()};
  if(!c.wifi||!c.url){toast('Pon la wifi y la dirección del servidor');return}if(/[|\n]/.test(Object.values(c).join(''))){toast('Sin «|» en los datos');return}
  try{const port=PL.port||await abrirPuerto();try{await port.open({baudRate:115200})}catch(e){}const w=port.writable.getWriter();await w.write(new TextEncoder().encode('CFG wifi='+c.wifi+'|clave='+c.clave+'|url='+c.url+'|token='+c.token+'\n'));w.releaseLock();
    try{await port.close()}catch(e){}toast('Configuración enviada: la placa se reinicia');await dormirMs(1500);T.comprobar(true)}catch(e){toast('No se ha podido mandar: '+(e&&e.message||''))}};
function placaRes(d){const A=PL.af,E=[['nodo','Placa con el código de '+d.nodo],['id','Número de la placa'],['radio','Radio LoRa'],...(ESPERA[d.nodo]||[]),...(NODOS[d.nodo].solar?[['bat','Batería']]:[]),...(d.nodo==='P'?[]:[['dato','Dato enviado por radio']])];
  const est=k=>{const v=A[k];if(v==null)return PL.estado==='leyendo'?['…','wait']:['✗','bad'];if(k==='nodo')return v===d.nodo?['✓','ok']:['✗','bad'];if(k==='id'||k==='dato')return ['✓','ok'];
    if(k==='bat'){const b=parseFloat(v);return b>=3.3&&b<=4.3?['✓','ok']:['!','warn']}if(k==='pulsos')return ['✓','ok'];if(k==='pinza')return ['✓','ok'];return /^ok/.test(v)?['✓','ok']:['✗','bad']};
  return E.map(([k,n])=>{const [i,c]=est(k),v=A[k];return `<div class="tl-av ${c==='wait'?'':c}"><b>${i}</b> ${e_(n)}${v&&!/^ok$/.test(v)&&k!=='nodo'?` · <code>${e_(v.slice(0,60))}</code>`:''}${c==='bad'&&PL.estado!=='leyendo'&&PISTA[k]?`<br><small>${e_(PISTA[k])}</small>`:''}${k==='bat'&&v?'<br><small>Mide la pila con el polímetro: si no coincide (±0,1 V), en el código cambia ADC_ON a HIGH.</small>':''}${k==='nodo'&&v&&v!==d.nodo?`<br><small>Esta placa tiene el código de ${e_(v)}.</small>`:''}</div>`}).join('')+(A.pulso?`<div class="tl-av ok">Pulsos contados: ${e_(A.pulso)} (cada vuelco debe sumar 1)</div>`:'')}
function vPlaca(d){const pinesDef=JSON.stringify(T.pinesDefecto(d.nodo))===JSON.stringify(Object.fromEntries(Object.keys(T.pinesDefecto(d.nodo)).map(k=>[k,+d.pines[k]]))),A=PL.af;
  if(!COD[d.nodo])return `<div class="note">Este diseño todavía no tiene código.</div>`;
  let h=`<div><h3>Instalar y probar</h3><div class="sub" style="text-transform:none">Con la placa conectada por USB al ordenador, en Chrome o Edge. Sin Arduino.</div></div>`;
  if(!hayWebSerial())h+=`<div class="tl-av warn">Este navegador no puede usar el cable USB. Abre la app en Chrome o Edge en un ordenador (en el móvil y en el iPhone no se puede).</div>`;
  if(!pinesDef)h+=`<div class="tl-av warn" style="text-transform:none">Has cambiado pines: el firmware que se instala desde aquí lleva los de serie. Para tus pines, usa el código de la pestaña Ficha con Arduino. La comprobación sí funciona.</div>`;
  h+=`<div class="tl-av warn" style="text-transform:none">Antes de enchufar: la antena puesta. Sin antena la radio se puede estropear.</div>
    <div class="row"><button class="btn pri" type="button" data-tlx="instalar" ${!hayWebSerial()||!pinesDef||['bajando','conectando','instalando','leyendo'].includes(PL.estado)?'disabled':''}>Instalar en la placa</button><button class="btn" type="button" data-tlx="comprobar" ${!hayWebSerial()||PL.estado==='leyendo'||PL.estado==='instalando'?'disabled':''}>Comprobar en la mesa</button></div>`;
  if(['bajando','conectando','instalando'].includes(PL.estado))h+=`<div class="sub">${{bajando:'Bajando el firmware…',conectando:'Conectando con la placa… (si no conecta: mantén BOOT/PRG y pulsa RST)',instalando:'Instalando… no desenchufes'}[PL.estado]}</div><div class="tl-pbar"><i id="tl_prog" style="width:${PL.prog}%"></i></div>`;
  if(PL.estado==='leyendo'||Object.keys(A).length)h+=`<div class="sub">${PL.estado==='leyendo'?'Leyendo la autoprueba de la placa…':'Resultado de la comprobación'}</div><div id="tl_placa" class="tl-avisos">${placaRes(d)}</div>`;
  if(A.id&&PL.estado==='hecho')h+=`<div class="tl-av ok" style="text-transform:none">Número de esta placa: <b>${e_(A.id)}</b>. <button class="lnk" type="button" data-tlx="vincular">Ponerlo en Mis aparatos</button></div>`;
  if(d.nodo==='P'){const cs=(typeof st!=='undefined'&&st.cfg&&st.cfg.sens)||{};h+=`<div class="catsec"><h4>Configurar la pasarela</h4><div class="frm">
    <div class="field"><label for="tl_wifi">Wifi (nombre)</label><div class="inp"><input id="tl_wifi" autocomplete="off" style="text-transform:none;text-align:left"></div></div>
    <div class="field"><label for="tl_clave">Clave de la wifi</label><div class="inp"><input id="tl_clave" type="password" autocomplete="off" style="text-transform:none;text-align:left"></div></div>
    <div class="field"><label for="tl_url">Servidor puente</label><div class="inp"><input id="tl_url" value="${e_(cs.url?cs.url.replace(/\/+$/,'')+'/p':'')}" placeholder="https://…workers.dev/p" style="text-transform:none;text-align:left"></div></div>
    <div class="field"><label for="tl_token">Clave del puente</label><div class="inp"><input id="tl_token" type="password" value="${e_(cs.token||'')}" style="text-transform:none;text-align:left"></div></div></div>
    <div class="note" style="text-transform:none">La wifi y su clave no se guardan en la app: van directas a la placa por el cable.</div>
    <div class="row"><button class="btn" type="button" data-tlx="cfg" ${hayWebSerial()?'':'disabled'}>Mandar a la placa</button></div></div>`}
  if(PL.log.length)h+=`<details class="tl-log"><summary>Lo que dice la placa (${PL.log.length} líneas)</summary><pre>${e_(PL.log.slice(-80).join('\n'))}</pre></details>`;
  return h}
const CSS_PL=`.tl-pbar{height:8px;border-radius:4px;background:var(--line);overflow:hidden}.tl-pbar i{display:block;height:100%;background:var(--accent,#1a7f4b);transition:width .3s}.tl-log pre{white-space:pre-wrap;font-size:11.5px;max-height:240px;overflow:auto;background:#15222c;color:#d5e8d4;padding:8px;border-radius:8px;text-transform:none}.tl-av code{font-size:12px}`;
document.addEventListener('click',e=>{if(typeof st==='undefined'||st.tab!=='taller')return;const b=e.target.closest&&e.target.closest('[data-tlx]');if(!b)return;const a=b.dataset.tlx;
  if(a==='instalar')T.instalar();else if(a==='comprobar')T.comprobar(false);else if(a==='cfg')T.mandarCfg();
  else if(a==='vincular'){const s=S(),d=s.d;if(!d||!PL.af.id)return;if(typeof apVincular==='function')apVincular(d,PL.af.id)}});

/* ---------- Pantalla ---------- */
const CSS=`.tl-tabs{display:flex;gap:6px;flex-wrap:wrap}.tl-avisos{display:grid;gap:6px}.tl-av{border-radius:8px;padding:8px 10px;font-size:13.5px;text-transform:none}.tl-av.bad{background:var(--bad-bg);color:var(--bad)}.tl-av.warn{background:var(--warn-bg);color:var(--warn)}.tl-av.ok{background:var(--ok-bg);color:var(--ok)}
.tl-esq{width:100%;height:auto;background:#fff;border:1px solid var(--line);border-radius:10px}.tl-wrap{overflow-x:auto}
#tl_cv{width:100%;height:320px;touch-action:none;background:linear-gradient(#f6f8f6,#e7ede9);border-radius:10px;border:1px solid var(--line);cursor:grab}
.tl-pz{display:grid;gap:8px}.tl-pz>div{display:grid;grid-template-columns:14px 1fr;gap:8px;align-items:start;text-transform:none}.tl-pz i{width:14px;height:14px;border-radius:4px;margin-top:3px}.tl-pz small{display:block;color:var(--muted)}
.tl-code{white-space:pre;overflow:auto;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;background:#15222c;color:#e8eef0;border-radius:10px;padding:12px;text-transform:none;max-height:420px}
.tl-nom .inp{width:100%}#tl_nom.wide{width:100%;min-width:0}.tl-ck{display:grid;gap:6px}.tl-ck label{display:flex;gap:8px;align-items:flex-start;text-transform:none}.tl-ck input{margin-top:3px;width:18px;height:18px}.tl-ck label.hecho span{text-decoration:line-through;color:var(--muted)}
.tl-lst{display:grid;gap:6px}.tl-lst .r{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--line);border-radius:8px;padding:8px 10px;text-transform:none}
.tl-q{display:grid;gap:6px}.tl-q .row{flex-wrap:wrap}.tl-dim{font-size:13px;color:var(--muted);text-transform:none}`;
function estilos(){if(document.getElementById('tl_css'))return;const e=document.createElement('style');e.id='tl_css';e.textContent=CSS+CSS_EN+CSS_PL+CSS_AS;document.head.appendChild(e)}

function vAsistente(s){const q=s.q,listo=PREG.every(p=>q[p.k]),lista=cargar();if(!NB.ok)sincroniza();
  return `${vHablar()}<section class="card"><div><h3>Taller de sensores</h3><div class="sub">Dime qué quieres medir y te doy las piezas, el esquema de cables, la caja para imprimir en 3D y la ficha de montaje. Protegido con la contraseña del Taller.</div></div><div class="row"><button class="btn" data-tab="catalogo">Ver todo en el catálogo</button></div>
    ${PREG.map(p=>`<div class="tl-q"><b>${p.t}</b><div class="row">${p.ops.map(([k,t])=>`<button class="chip" data-tl="q" data-k="${p.k}" data-v="${k}" aria-pressed="${q[p.k]===k}">${t}</button>`).join('')}</div></div>`).join('')}
    <div class="row"><button class="btn pri" data-tl="crear" ${listo?'':'disabled'}>Diseñar el sensor</button></div></section>
  ${lista.length?`<section class="card"><div><h3>Mis diseños</h3><div class="sub">${NB.ok?'Guardados en la nube: los ves en cualquier móvil y en el ordenador':'Guardados en este móvil · conectando con la nube…'}</div></div><div class="tl-lst">${lista.map(d=>`<div class="r"><span><b>${e_(d.nombre)}</b><br><small>${e_(NODOS[d.nodo].n)}</small></span><span class="row"><button class="btn" data-tl="abrir" data-id="${d.id}">Abrir</button><button class="btn" data-tl="borrar" data-id="${d.id}">Borrar</button></span></div>`).join('')}</div></section>`:''}
  <section class="card"><div><h3>Lo que ya existe y usamos</h3></div><div class="note" style="text-transform:none">Las cajas se generan con <a href="https://github.com/elalish/manifold" target="_blank" rel="noopener">Manifold</a> (el mismo motor que usa OpenSCAD) y se pueden retocar en el <a href="https://ochafik.com/openscad2" target="_blank" rel="noopener">OpenSCAD Playground</a>. Para probar código sin piezas: <a href="https://wokwi.com" target="_blank" rel="noopener">Wokwi</a>. Cajas ya hechas para la Heltec: <a href="https://www.printables.com/model/1090297-heltec-wifi-lora-32-v3-case-dual-18650" target="_blank" rel="noopener">Printables</a> y <a href="https://meshtastic.org/docs/community/enclosures/heltec-enclosures" target="_blank" rel="noopener">Meshtastic</a> (casi todas de interior).</div></section>`}

function vPiezas(d){const N=NODOS[d.nodo],g=distribuir(d);
  return `<div class="tl-pz">${N.piezas.map(p=>{const P=PIEZAS[p];return `<div><i style="background:${P.color}"></i><div><b>${e_(P.n)}</b>${P.dentro?` <span class="tl-dim">· ${P.med.join(' × ')} mm aprox.</span>`:' <span class="tl-dim">· fuera de la caja</span>'}${P.nota?`<small>${e_(P.nota)}</small>`:''}</div></div>`}).join('')}
    ${N.glands.map(k=>{const c=PIEZAS[k].cable;return `<div><i style="background:#95a5a6"></i><div><b>Prensaestopas ${c}</b> <span class="tl-dim">· agujero de ${n1(GLAND[c].d)} mm, ${GLAND[c].cab}</span><small>Para el cable de: ${e_(PIEZAS[k].n)}</small></div></div>`}).join('')}
    <div><i style="background:#95a5a6"></i><div><b>Cordón de goma (EPDM) o silicona de Ø 2 mm</b><small>Para la junta de la tapa. Y 4 tornillos M3 × 12 autorroscantes.</small></div></div></div>
    <div class="note" style="text-transform:none">Precios y tiendas: en el PDF de compra del sensor que ya tienes. Las medidas son aproximadas: mídelas con calibre cuando lleguen y ajusta la holgura de la caja.</div>`}

function vEsquema(d){const N=NODOS[d.nodo],av=T.validar(d),vars=N.con.filter((c,i,a)=>c.var&&a.findIndex(x=>x.var===c.var)===i);
  return `<div class="tl-avisos">${av.length?av.map(([k,t])=>`<div class="tl-av ${k}">${k==='bad'?'✗':'!'} ${e_(t)}</div>`).join(''):'<div class="tl-av ok">✓ Sin errores: pines libres, tensiones correctas y masa común.</div>'}</div>
    <div class="tl-wrap">${esquema(d)}</div>
    ${vars.length?`<div class="frm">${vars.map(c=>`<div class="field"><label for="tl_p_${c.var}">${e_(c.nom)}</label><div class="inp"><select id="tl_p_${c.var}" data-tlp="${c.var}">${HPINES.map(g=>`<option value="${g}" ${+d.pines[c.var]===g?'selected':''}>GPIO ${g}${RESERV[g]?' (ocupado)':''}</option>`).join('')}</select></div></div>`).join('')}</div>`:''}
    ${Object.keys(d.alim||{}).length?`<div class="frm">${Object.entries(d.alim).map(([p,v])=>`<div class="field"><label for="tl_a_${p}">Alimentación de ${e_(PIEZAS[p].n.split(' (')[0])}</label><div class="inp"><select id="tl_a_${p}" data-tla="${p}">${[3.3,5,12].map(x=>`<option value="${x}" ${+v===x?'selected':''}>${n1(x)} V${x===3.3?' (Ve)':x===5?' (5V)':' (MT3608)'}</option>`).join('')}</select></div></div>`).join('')}</div>`:''}
    <div class="note" style="text-transform:none">Cambia un pin para ver cómo avisa la app. Los pines que vienen puestos son los que ya decidimos en el dossier de sensores.</div>
    ${N.con.filter(c=>c.nota).map(c=>`<div class="tl-av warn">! ${e_(c.nota)}</div>`).join('')}
    ${vRevFoto(d)}`}
/* ---------- Revisar el montaje con una foto: la IA compara la foto del cableado con este esquema ----------
   Es una segunda mirada: no ve soldaduras frías ni tensiones. El polímetro sigue siendo lo que manda. */
const COLN={'#d62728':'rojo','#222':'negro','#bbb':'blanco','#e6c300':'amarillo','#1f77b4':'azul','#ff7f0e':'naranja','#2ca02c':'verde','#9467bd':'morado','#17becf':'celeste','#7f8c8d':'gris','#e377c2':'rosa','#7f7f7f':'gris'};
const conTxt=(d,c)=>{const N=NODOS[d.nodo],ph=c.a&&c.a[0]==='heltec'&&c.a[1]==='GPIO'?'GPIO '+d.pines[c.var]:c.a&&c.a[1];return c.a?`cable ${COLN[c.c]||''}: ${PIEZAS[c.de[0]].c} «${c.de[1]}» → ${c.a[0]==='heltec'?'Heltec V3':PIEZAS[c.a[0]].c} «${ph}»`:`${PIEZAS[c.de[0]].c} «${c.de[1]}»: sin conectar (aislado)`};
T.promptFoto=d=>{const N=NODOS[d.nodo];return `Eres un técnico de electrónica revisando el montaje de un sensor casero para un invernadero. En la foto debería verse una placa Heltec WiFi LoRa 32 V3 (placa azul con pantalla) cableada así:
${N.con.map((c,i)=>(i+1)+'. '+conTxt(d,c)).join('\n')}
Para cada conexión de la lista, di si en la foto se ve bien hecha, dudosa, mal o si no se ve. Fíjate en el color del cable, en qué pin acaba (los pines de la Heltec van rotulados en la serigrafía) y en si hay puentes de estaño, cables pelados tocándose o la antena sin poner.
Responde SOLO con JSON: {"conexiones":[{"n":1,"estado":"bien|dudoso|mal|no_se_ve","nota":"frase corta en español"}],"otros":["problemas que veas fuera de la lista, en español"],"resumen":"una frase en español"}. No inventes: si no se distingue, «no_se_ve».`};
function vRevFoto(d){const s=S(),R=s.rev&&s.rev.id===d.id?s.rev:null,N=NODOS[d.nodo],EST={bien:['ok','✓ Bien'],dudoso:['warn','? Dudoso'],mal:['bad','✗ Mal'],no_se_ve:['warn','· No se ve']};
  let h=`<div class="tl-rev"><div><b>Revisar el montaje con una foto</b><div class="sub" style="text-transform:none">Haz una foto de cerca y con buena luz de la placa con los cables puestos. La IA la compara con este esquema, cable a cable. Es una segunda mirada: no sustituye al polímetro.</div></div>
    <label class="btn ${R&&R.busy?'':'pri'}" style="align-self:start">${R&&R.busy?'Revisando…':'Hacer o elegir foto'}<input type="file" accept="image/*" capture="environment" data-tlfoto="1" hidden ${R&&R.busy?'disabled':''}></label>`;
  if(R&&R.err)h+=`<div class="tl-av bad">${e_(R.err)}</div>`;
  if(R&&R.res){const C=R.res.conexiones||[],mal=C.filter(x=>x.estado==='mal').length,dud=C.filter(x=>x.estado!=='bien').length;
    h+=`<div class="tl-av ${mal?'bad':dud?'warn':'ok'}">${e_(R.res.resumen||'')}</div><div class="tl-revl">${N.con.map((c,i)=>{const x=C.find(y=>+y.n===i+1)||{estado:'no_se_ve',nota:''},E=EST[x.estado]||EST.no_se_ve;return `<div class="tl-av ${E[0]}"><b>${E[1]}</b> · ${i+1}. ${e_(conTxt(d,c))}${x.nota?`<br><small>${e_(x.nota)}</small>`:''}</div>`}).join('')}</div>
      ${(R.res.otros||[]).length?`<div class="tl-av warn"><b>Además:</b> ${(R.res.otros||[]).map(e_).join(' · ')}</div>`:''}`}
  return h+'</div>'}
T.revFoto=async(file)=>{const s=S(),d=s.d;if(!d||!file)return;s.rev={id:d.id,busy:true};repinta();let b=file;try{b=await compressImg(file)}catch(e){}
  try{const r=await iaFotoJson(T.promptFoto(d),[b]);s.rev={id:d.id,res:{conexiones:Array.isArray(r&&r.conexiones)?r.conexiones:[],otros:Array.isArray(r&&r.otros)?r.otros.map(String):[],resumen:String(r&&r.resumen||'')}}}
  catch(e){s.rev={id:d.id,err:e&&e.code==='sin_ia'?'La IA no está activada: actívala en Ajustes.':'No se ha podido revisar la foto. Prueba otra vez con más luz.'}}repinta()};

function vCaja(d,s){const c=d.caja,g=geometria(d);
  const num=(k,t,min,max,st)=>`<div class="field"><label for="tl_c_${k}">${t}</label><div class="inp"><input id="tl_c_${k}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${st}" value="${c[k]}" data-tlc="${k}"></div></div>`;
  const chk=(k,t)=>`<label class="row" style="text-transform:none"><input type="checkbox" data-tlc="${k}" ${c[k]?'checked':''}> ${t}</label>`;
  return `<canvas id="tl_cv" aria-label="Vista 3D de la caja con las piezas dentro"></canvas>
    <div class="tl-dim" id="tl_estado">${s.m?'Arrastra con el dedo para girarla. La tapa está levantada para ver las piezas.':'Preparando la caja 3D…'}</div>
    <div class="tl-dim">Por fuera: <b>${n1(g.Lo)} × ${n1(g.Wo)} × ${n1(g.Ho)} mm</b> (sin contar postes ni orejetas) · por dentro ${g.D.Li} × ${g.D.Wi} × ${g.D.Hi} mm · pared ${n1(g.t)} mm</div>
    <div class="frm">${num('pared','Pared (mm)',2,6,0.2)}${num('holg','Holgura alrededor (mm)',1,15,0.5)}${num('extra','Alto extra para cables (mm)',4,40,1)}</div>
    <div class="row">${chk('ranura','Ranura para junta de goma')}${chk('orejas','Orejetas para atornillar')}${chk('antena','Agujero para antena SMA (Ø 6,5)')}</div>
    <div class="row"><button class="btn pri" data-tl="stl" data-k="base">Descargar base (STL)</button><button class="btn pri" data-tl="stl" data-k="tapa">Descargar tapa (STL)</button><button class="btn" data-tl="scad">Descargar .scad</button></div>
    <div class="note" style="text-transform:none">Imprime en <b>PETG</b> dentro del invernadero o <b>ASA</b> al aire libre: el PLA se deforma con el calor. 4 paredes, 25 % de relleno, sin soportes (la tapa, con la cara plana en la cama). Una caja impresa no es estanca por sí sola: pon el cordón en la ranura, prensaestopas y móntala con ellos hacia abajo. Mete una bolsita de gel de sílice.</div>`}

function vFicha(d){const F=FICHA[d.nodo],cod=COD[d.nodo];
  return `<div class="tl-ck">${F.pasos.map((p,i)=>`<label class="${d.hecho.includes(i)?'hecho':''}"><input type="checkbox" data-tlh="${i}" ${d.hecho.includes(i)?'checked':''}><span>${i+1}. ${e_(p)}</span></label>`).join('')}</div>
    <div><b>Uso del día a día</b><ul style="text-transform:none;margin:6px 0 0;padding-left:20px">${F.uso.map(u=>`<li>${e_(u)}</li>`).join('')}</ul></div>
    ${cod?`<div><b>Código de partida</b><div class="tl-dim">Con los pines de tu esquema. Sin probar todavía en la placa real: lo revisamos juntos cuando lleguen las piezas.</div></div><pre class="tl-code" id="tl_cod">${e_(codigo(d))}</pre><div class="row"><button class="btn" data-tl="copiar">Copiar código</button></div>`:'<div class="note" style="text-transform:none">El código de este nodo lo preparamos cuando tengamos la hoja técnica del sensor o en el hilo de desarrollo de sensores.</div>'}
    <div class="row"><button class="btn pri" data-tl="imprimir">Imprimir ficha</button></div>`}
const codigo=d=>(COD[d.nodo]||'').replace(/\{(\w+)\}/g,(m,k)=>d.pines[k]!=null?d.pines[k]:m);

function vDiseno(s){const d=s.d,N=NODOS[d.nodo],err=hayError(d);
  const tabs=[...(d.spec?[['spec','Especificación']]:[]),['piezas','Piezas'],['esquema','Esquema'+(err?' ✗':'')],['caja','Caja 3D'],['energia','Batería'],['placa','Instalar y probar'],['ficha','Ficha']];
  if(s.v==='spec'&&!d.spec)s.v='piezas';
  const cuerpo={spec:vSpec,piezas:vPiezas,esquema:vEsquema,caja:x=>vCaja(x,s),energia:vEnergia,placa:vPlaca,ficha:vFicha}[s.v](d);
  return `<section class="card"><div class="row" style="justify-content:space-between"><button class="btn" data-tl="volver">‹ Mis diseños</button><span class="row"><button class="btn" data-tlinst="${e_(d.id)}">Lo he instalado</button><button class="btn" data-tl="guardar">Guardar</button></span></div>
    <div class="field tl-nom"><label for="tl_nom">Nombre del diseño</label><div class="inp"><input id="tl_nom" class="wide" data-tln="1" value="${e_(d.nombre)}" style="text-transform:none"></div></div>
    <div class="sub">${e_(N.n)}${d.unidades>1?' · '+d.unidades+' unidades':''} · ${d.energia==='solar'?'batería y placa solar':'enchufe'} · ${d.lugar==='fuera'?'al aire libre':'dentro del invernadero'}</div>
    <div class="tl-tabs">${tabs.map(([k,t])=>`<button class="chip" data-tl="v" data-v="${k}" aria-pressed="${s.v===k}">${t}</button>`).join('')}</div></section>
  <section class="card">${cuerpo}</section>`}

/* ---------- Diseñar hablando ----------
   Un asistente que pregunta como un ingeniero (qué medir y para qué, dónde, distancia, corriente, cada cuánto) y, cuando lo tiene claro,
   escribe la especificación del prototipo y monta los diseños con los nodos del Taller. Solo elige nodos que existen: lo que no esté en el
   catálogo lo dice en «Lo que falta». La conversación se recuerda en este móvil hasta que se crea el diseño o se empieza de nuevo. */
const LSA='abono.tlasis';
const asCargar=()=>{try{const a=JSON.parse(localStorage.getItem(LSA)||'null');return a&&Array.isArray(a.msgs)?a:{msgs:[]}}catch(e){return {msgs:[]}}};
const asGuardar=a=>{try{localStorage.setItem(LSA,JSON.stringify({msgs:a.msgs.slice(-40),res:a.res||null}))}catch(e){}};
const AS=()=>{const s=S();if(!s.as)s.as={...asCargar(),busy:false,err:'',sel:{}};return s.as};
const IDEAS=['Un sensor de humedad del suelo para la finca','Saber el nivel del depósito desde el móvil','Que me avise si la bomba se para','La temperatura de la hoja en el invernadero'];
const conSol=n=>NODOS[n].piezas.includes('panel');
const SPEC=[['objetivo','Objetivo'],['alcance','Alcance de la primera versión'],['arquitectura','Arquitectura funcional'],['parametros','Parámetros'],['interfaz','Interfaz con la aplicación'],
  ['comportamiento','Comportamiento de la aplicación'],['ambiente','Requisitos ambientales'],['validacion','Criterios de validación'],['riesgos','Riesgos y dudas'],['supuestos','Lo que he supuesto'],['fuera','Fuera de alcance en esta versión']];
T.promptAsis=msgs=>`Eres el ingeniero de electrónica del Taller de sensores de la app Agro FLY (fertirrigación). Hablas con un agricultor de Murcia (invernaderos de tomate en sustrato de coco y también parcelas al aire libre) que quiere montar su propio sensor. Tu trabajo: entender qué necesita y diseñárselo con los nodos que el Taller ya sabe montar.

CÓMO FUNCIONA EL SISTEMA (no lo cambies):
- Todos los nodos llevan una placa Heltec WiFi LoRa 32 V3 (ESP32-S3 con radio LoRa de 868 MHz y pantalla).
- Los nodos mandan por radio a una PASARELA (nodo P), enchufada y con WiFi. La pasarela lo sube a un servidor y el dato aparece en la app (Taller → Mis aparatos) en el móvil y en el ordenador: gráficas, batería y aviso si deja de mandar. Nada se conecta al PC por cable.
- Alcance orientativo de la radio: 1–3 km en campo abierto con vista directa; 200–800 m entre invernaderos, naves o arbolado. Si queda más lejos: pasarela más cerca o antena exterior en alto.
- Los nodos con batería llevan una pila 18650 de 3000 mAh y una placa solar de 2 W. Mandan cada 10 min por defecto (se puede de 1 a 60 min).
- Caja impresa en 3D (PETG o ASA) con junta y prensaestopas.

CATÁLOGO DE NODOS (usa SOLO estos códigos):
${Object.entries(NODOS).map(([k,N])=>`- ${k}: ${N.n}. Piezas: ${N.piezas.map(p=>PIEZAS[p].n).join('; ')}. ${conSol(k)?'Batería y placa solar.':'Enchufado por USB (necesita corriente a menos de 3 m).'}${N.borrador?' BORRADOR: aún sin código; evítalo si otro sirve.':''}`).join('\n')}

CONVERSACIÓN HASTA AHORA:
${msgs.map(m=>(m.r==='yo'?'Agricultor: ':'Tú: ')+m.t+(m.preg&&m.preg.length?' ['+m.preg.map(p=>p.t+' ('+p.ops.join(' / ')+')').join(' · ')+']':'')).join('\n')}

INSTRUCCIONES:
1. Español de España, tuteo, frases cortas y claras. Nada de jerga si no hace falta.
2. Lo que necesitas saber: qué quiere medir y PARA QUÉ decisión; dónde va (invernadero o aire libre; suelo o sustrato y a qué profundidad, si aplica; cultivo); a qué distancia queda la pasarela o la caseta con WiFi; si hay enchufe a menos de 3 m; cada cuánto quiere el dato; cuántos puntos; si ya tiene pasarela.
3. Como mucho 2 preguntas por turno, cada una con 2 a 5 opciones cortas para pulsar. No preguntes lo que ya ha dicho. Lo que se pueda suponer con sentido, supónlo y apúntalo en «supuestos».
4. Cuando lo tengas claro (normalmente 2–4 turnos) o te pida que lo hagas ya, responde con listo:true.
5. Si lo que pide no lo cubre ningún nodo, usa el más cercano solo si de verdad sirve y explica en «falta» qué pieza o nodo haría falta. Si no sirve ninguno, «nodos» vacío.
6. Si no tiene pasarela o no lo ha dicho, añade un nodo P.
7. Sé sincero: si la idea tiene un problema (alcance, poco sol, precisión del sensor, sustrato salino que engaña al capacitivo, etc.), dilo en «riesgos».

Responde SOLO con JSON, de una de estas dos formas:
{"listo":false,"mensaje":"frase corta","preguntas":[{"t":"pregunta","ops":["opción","opción"]}]}
{"listo":true,"mensaje":"frase corta","nodos":[{"nodo":"N2","nombre":"nombre corto del aparato","min":10,"lugar":"inv|fuera","unidades":1}],"spec":{"objetivo":"un párrafo","alcance":["…"],"arquitectura":["…"],"interfaz":["…"],"comportamiento":["…"],"ambiente":["…"],"validacion":["…"],"fuera":["…"],"riesgos":["…"],"supuestos":["…"]},"falta":""}`;
const lst=x=>(Array.isArray(x)?x:x?[x]:[]).map(v=>String(v).trim()).filter(Boolean).slice(0,12);
T.asNorm=r=>{r=r&&typeof r==='object'?r:{};const preg=(Array.isArray(r.preguntas)?r.preguntas:[]).map(p=>({t:String(p&&p.t||'').trim(),ops:lst(p&&p.ops).slice(0,6)})).filter(p=>p.t).slice(0,3);
  const out={mensaje:String(r.mensaje||'').trim(),preg,listo:!!r.listo};if(!out.listo)return out;
  const MINS=[1,5,10,15,30,60];
  out.nodos=(Array.isArray(r.nodos)?r.nodos:[]).filter(x=>x&&NODOS[x.nodo]).map(x=>{const m=+x.min||10;return {nodo:x.nodo,nombre:String(x.nombre||NODOS[x.nodo].corto).trim().slice(0,60),
    min:MINS.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a),lugar:x.lugar==='fuera'?'fuera':'inv',unidades:Math.max(1,Math.min(50,Math.round(+x.unidades||1)))}}).slice(0,6);
  const sp=r.spec&&typeof r.spec==='object'?r.spec:{};out.spec={objetivo:String(sp.objetivo||'').trim()};for(const [k] of SPEC)if(k!=='objetivo'&&k!=='parametros')out.spec[k]=lst(sp[k]);
  out.falta=String(r.falta||'').trim();return out};
const dEn=x=>({nodo:x.nodo,lugar:x.lugar,energia:conSol(x.nodo)?'solar':'enchufe',en:{min:x.min}});
function autonomia(x){const E=T.energia(dEn(x));if(!conSol(x.nodo))return x.nodo==='P'?'Enchufada siempre':'Enchufado';const ok=E.peor>=E.dia*1.5;return `${ok?'Aguanta todo el año':'Justo en invierno'} · ${Math.round(E.dias)} días sin sol`}
/* La especificación: lo que ha escrito la IA más lo que sale del propio Taller (piezas, cadena de datos, batería), que no se inventa */
function specHTML(sp,nodos){const ul=a=>a&&a.length?`<ul>${a.map(v=>`<li>${e_(v)}</li>`).join('')}</ul>`:'';const sens=nodos.filter(x=>x.nodo!=='P'),hayP=nodos.some(x=>x.nodo==='P');
  const fijo={arquitectura:[`${sens.map(x=>NODOS[x.nodo].corto).join(' + ')||'Nodo'} con placa Heltec V3 → radio LoRa 868 MHz → pasarela con WiFi${hayP?' (incluida)':' (la que ya tienes)'} → servidor puente → app.`],
    interfaz:['Los datos salen en Taller → Mis aparatos: última lectura, gráfica, batería y aviso al móvil si deja de mandar. Para enlazarlo: «Lo he instalado» y el número de la placa.'],
    ambiente:['Caja impresa en PETG o ASA (no PLA al sol), junta de goma en la tapa y prensaestopas hacia abajo.']};
  let h=sp.objetivo?`<h4>Objetivo</h4><p>${e_(sp.objetivo)}</p>`:'';
  for(const [k,t] of SPEC){if(k==='objetivo')continue;
    if(k==='parametros'){h+=`<h4>${t}</h4><table class="tl-spt"><tr><th>Aparato</th><th>Nodo</th><th>Uds.</th><th>Corriente</th><th>Dato cada</th></tr>${nodos.map(x=>`<tr><td>${e_(x.nombre)}</td><td>${e_(NODOS[x.nodo].corto)}</td><td>${x.unidades}</td><td>${e_(autonomia(x))}</td><td>${x.nodo==='P'?'—':x.min+' min'}</td></tr>`).join('')}</table>
      ${nodos.map(x=>`<div class="tl-dim"><b>${e_(NODOS[x.nodo].corto)}:</b> ${NODOS[x.nodo].piezas.map(p=>e_(PIEZAS[p].n)).join(' · ')}</div>`).join('')}`;continue}
    const a=[...(fijo[k]||[]),...(sp[k]||[])];if(a.length)h+=`<h4>${t}</h4>${k==='riesgos'?`<div class="tl-av warn">${ul(a)}</div>`:ul(a)}`}
  return h}
const specTexto=(sp,nodos)=>{const d=document.createElement('div');d.innerHTML=specHTML(sp,nodos);return [...d.querySelectorAll('h4,p,li,tr,div.tl-dim')].map(n=>n.tagName==='H4'?'\n'+n.textContent.toUpperCase():n.tagName==='LI'?'- '+n.textContent:n.tagName==='TR'?[...n.children].map(c=>c.textContent).join(' | '):n.textContent).join('\n').trim()};
function vHablar(){const a=AS(),ia=typeof iaModo==='function'&&!!iaModo(),ult=a.msgs[a.msgs.length-1],preg=!a.busy&&!a.res&&ult&&ult.r==='ia'?ult.preg||[]:[];
  let h=`<section class="card tl-as"><div><h3>Diseña hablando</h3><div class="sub">Cuéntame qué quieres medir y para qué. Te pregunto lo que haga falta y te monto el diseño completo: especificación, piezas, cables, caja, batería y código.</div></div>`;
  if(!ia)return h+`<div class="note" style="text-transform:none">Para diseñar hablando hace falta la IA: actívala en Ajustes. Mientras tanto puedes usar las preguntas rápidas de abajo.</div></section>`;
  if(a.msgs.length)h+=`<div class="tl-chat">${a.msgs.map(m=>`<div class="tl-msg ${m.r==='yo'?'yo':'ia'}">${e_(m.t)}</div>`).join('')}${a.busy?'<div class="tl-msg ia tl-pens">Pensando…</div>':''}</div>`;
  else h+=`<div class="tl-q"><b>Por ejemplo</b><div class="row">${IDEAS.map(t=>`<button class="chip" data-tlas="di" data-t="${e_(t)}">${e_(t)}</button>`).join('')}</div></div>`;
  if(a.err)h+=`<div class="tl-av bad">${e_(a.err)}</div>`;
  if(preg.length)h+=preg.map((p,i)=>`<div class="tl-q"><b>${e_(p.t)}</b><div class="row">${p.ops.map(o=>`<button class="chip" data-tlas="op" data-i="${i}" data-t="${e_(o)}" aria-pressed="${a.sel[i]===o}">${e_(o)}</button>`).join('')}</div></div>`).join('');
  if(a.res){const R=a.res;h+=`<div class="tl-spec"><h3>Especificación del prototipo</h3>${specHTML(R.spec,R.nodos)}${R.falta?`<h4>Lo que falta en el Taller</h4><div class="tl-av warn">${e_(R.falta)}</div>`:''}</div>
    <div class="row">${R.nodos.length?`<button class="btn pri" data-tlas="crear">Crear ${R.nodos.length>1?'los '+R.nodos.length+' diseños':'el diseño'}</button>`:''}<button class="btn" data-tlas="copiar">Copiar especificación</button><button class="btn" data-tlas="seguir">Cambiar algo</button></div>`}
  if(!a.res||a.seguir)h+=`<div class="field"><label for="tl_asin">${a.msgs.length?'Tu respuesta (o pulsa las opciones)':'Qué quieres montar'}</label><div class="inp"><textarea id="tl_asin" rows="2" style="text-transform:none;width:100%" placeholder="${a.msgs.length?'Escribe aquí si quieres matizar…':'Ej.: un sensor de humedad del suelo para una parcela a 400 m de la caseta'}" ${a.busy?'disabled':''}></textarea></div></div>`;
  h+=`<div class="row">${!a.res||a.seguir?`<button class="btn ${a.res?'':'pri'}" data-tlas="env" ${a.busy?'disabled':''}>${preg.length>1?'Enviar respuestas':'Enviar'}</button>`:''}${a.msgs.length&&!a.busy?`${a.res?'':'<button class="btn" data-tlas="hazlo">Hazlo ya con lo que sabes</button>'}<button class="btn" data-tlas="reset">Empezar de nuevo</button>`:''}</div></section>`;
  return h}
async function asEnviar(t){const a=AS();t=String(t||'').trim();if(!t||a.busy)return;a.msgs.push({r:'yo',t});a.sel={};a.err='';a.busy=true;a.seguir=false;if(a.res)a.res=null;asGuardar(a);repinta();
  try{const r=T.asNorm(await iaFotoJson(T.promptAsis(a.msgs),[]));a.msgs.push({r:'ia',t:r.mensaje||(r.listo?'Hecho: aquí tienes la especificación.':'Necesito saber un poco más.'),preg:r.preg});if(r.listo)a.res={nodos:r.nodos,spec:r.spec,falta:r.falta}}
  catch(e){a.msgs.pop();a.err=e&&e.code==='sin_ia'?'La IA no está activada: actívala en Ajustes.':'No he podido contestar. Revisa la conexión y prueba otra vez.';a.borr=t}
  a.busy=false;asGuardar(a);repinta();if(a.borr){const i=document.getElementById('tl_asin');if(i)i.value=a.borr;a.borr=''}
  const c=document.querySelector('.tl-as');if(c&&c.scrollIntoView)c.scrollIntoView({block:'end',behavior:'smooth'})}
T.asEnviar=asEnviar;
function asCrear(){const s=S(),a=AS(),R=a.res;if(!R||!R.nodos.length)return;const g='g'+Date.now().toString(36),spec={...R.spec,nodos:R.nodos,falta:R.falta,grupo:g,charla:a.msgs.map(m=>({r:m.r,t:m.t}))};
  const ds=R.nodos.map((x,i)=>{const d=nuevo({nodo:x.nodo,energia:conSol(x.nodo)?'solar':'enchufe',lugar:x.lugar});d.id+=i;d.nombre=x.nombre;d.en={...EN0,min:x.min};d.unidades=x.unidades;d.spec=spec;return d});
  Promise.all(ds.map(guardar)).then(r=>toast(r.every(Boolean)?(ds.length>1?ds.length+' diseños guardados en la nube':'Diseño guardado en la nube'):'Guardado en este móvil: se subirá a la nube al volver la conexión'));
  s.d=ds.find(d=>d.nodo!=='P')||ds[0];s.v='spec';s.m=null;s.as={msgs:[],busy:false,err:'',sel:{}};asGuardar(s.as);repinta();window.scrollTo&&window.scrollTo(0,0)}
function vSpec(d){const sp=d.spec,otros=cargar().filter(x=>x.id!==d.id&&x.spec&&x.spec.grupo===sp.grupo);
  return `<div class="tl-spec"><h3>Especificación del prototipo</h3>${specHTML(sp,sp.nodos||[])}${sp.falta?`<h4>Lo que falta en el Taller</h4><div class="tl-av warn">${e_(sp.falta)}</div>`:''}
    ${otros.length?`<h4>Del mismo proyecto</h4><div class="row">${otros.map(x=>`<button class="btn" data-tl="abrir" data-id="${e_(x.id)}">${e_(x.nombre)}</button>`).join('')}</div>`:''}
    ${sp.charla&&sp.charla.length?`<details><summary>La conversación</summary><div class="tl-chat">${sp.charla.map(m=>`<div class="tl-msg ${m.r==='yo'?'yo':'ia'}">${e_(m.t)}</div>`).join('')}</div></details>`:''}</div>
    <div class="row"><button class="btn" data-tlas="copiard">Copiar especificación</button></div>`}
T.specTexto=specTexto;
document.addEventListener('click',async e=>{if(st.tab!=='taller')return;const b=e.target.closest&&e.target.closest('[data-tlas]');if(!b)return;const a=AS(),k=b.dataset.tlas,inp=()=>{const i=document.getElementById('tl_asin');return i?i.value.trim():''};
  if(k==='di')asEnviar(b.dataset.t);
  else if(k==='op'){const ult=a.msgs[a.msgs.length-1],P=(ult&&ult.preg)||[],i=+b.dataset.i;a.sel[i]=b.dataset.t;
    if(P.length===1||P.every((_,j)=>a.sel[j]))asEnviar(P.map((p,j)=>P.length>1?p.t+' → '+a.sel[j]:a.sel[j]).join('. ')+(inp()?'. '+inp():''));else repinta()}
  else if(k==='env'){const ult=a.msgs[a.msgs.length-1],P=(ult&&ult.preg)||[],sel=P.map((p,j)=>a.sel[j]?p.t+' → '+a.sel[j]:'').filter(Boolean);const t=[...sel,inp()].filter(Boolean).join('. ');if(!t){toast('Escribe algo o pulsa una opción');return}asEnviar(t)}
  else if(k==='hazlo')asEnviar('Con lo que sabes, házmelo ya: supón lo que falte y dímelo.');
  else if(k==='reset'){if(a.msgs.length>2&&!confirm('¿Borrar esta conversación y empezar de nuevo?'))return;S().as={msgs:[],busy:false,err:'',sel:{}};asGuardar(S().as);repinta()}
  else if(k==='seguir'){a.seguir=true;repinta();const i=document.getElementById('tl_asin');if(i)i.focus()}
  else if(k==='crear')asCrear();
  else if(k==='copiar'||k==='copiard'){const sp=k==='copiar'?a.res&&a.res.spec:S().d&&S().d.spec,nd=k==='copiar'?a.res&&a.res.nodos:sp&&sp.nodos;if(!sp)return;
    try{await navigator.clipboard.writeText('ESPECIFICACIÓN DEL PROTOTIPO\n'+specTexto(sp,nd||[]));toast('Especificación copiada')}catch(_){toast('No se ha podido copiar')}}});
document.addEventListener('keydown',e=>{if(st.tab!=='taller'||e.key!=='Enter'||e.shiftKey||!(e.target&&e.target.id==='tl_asin'))return;e.preventDefault();const b=document.querySelector('[data-tlas="env"]');if(b)b.click()});
const CSS_AS=`.tl-chat{display:grid;gap:6px;margin:4px 0}.tl-msg{max-width:88%;padding:8px 11px;border-radius:12px;font-size:14px;line-height:1.4;text-transform:none;white-space:pre-wrap}
.tl-msg.ia{justify-self:start;background:var(--surface-2,var(--line));border-bottom-left-radius:4px}.tl-msg.yo{justify-self:end;background:var(--ok-bg);color:var(--ink);border-bottom-right-radius:4px}
.tl-pens{opacity:.7;font-style:italic}.tl-spec{display:grid;gap:6px;text-transform:none;border-top:1px solid var(--line);padding-top:10px}.tl-spec h3,.tl-spec h4{text-transform:uppercase}.tl-spec h4{margin:8px 0 0;font-size:14.5px}.tl-spec p{margin:0}.tl-spec ul{margin:0;padding-left:20px}.tl-spec li{margin:2px 0}
.tl-spec .tl-av ul{padding-left:16px}.tl-spt{width:100%;border-collapse:collapse;font-size:13px}.tl-spt th,.tl-spt td{border-bottom:1px solid var(--line);padding:5px 4px;text-align:left;vertical-align:top}.tl-spec details summary{cursor:pointer;font-weight:600;margin-top:6px}`;

/* Desde el catálogo: abre directamente el diseño de un nodo */
T.crearNodo=n=>{if(!NODOS[n])return;const s=S();s.d=nuevo({nodo:n,energia:NODOS[n].solar?'solar':'enchufe',lugar:'inv'});s.v='piezas';s.m=null};
T.vista=()=>{estilos();const s=S();if(st.tlNuevo){const n=st.tlNuevo;st.tlNuevo=null;T.crearNodo(n)}return s.d?vDiseno(s):vAsistente(s)};
T.tras=()=>{const s=S();if(!s.d||s.v!=='caja')return;if(s.m&&s.mk===JSON.stringify([s.d.nodo,s.d.caja])){T.dibujar();return}
  const k=JSON.stringify([s.d.nodo,s.d.caja]);s.mk=k;T.mallas(s.d).then(m=>{if(s.mk!==k)return;s.m=m;const e=document.getElementById('tl_estado');if(e)e.textContent='Arrastra con el dedo para girarla. La tapa está levantada para ver las piezas.';T.dibujar()})
    .catch(err=>{console.warn(err);const e=document.getElementById('tl_estado');if(e)e.textContent='No se ha podido preparar la caja 3D en este móvil. Prueba a recargar la app.'})};

function guardar(d){d.mod=new Date().toISOString();const c=JSON.parse(JSON.stringify({...d,nube:false})),l=cargar().filter(x=>x.id!==d.id);l.unshift(c);guardarTodo(l.slice(0,200));
  if(typeof Store!=='undefined'&&Store.setCol)return Store.setCol(COL,d.id,aNube(d)).then(()=>{const m=cargar();const x=m.find(y=>y.id===d.id);if(x&&x.mod===d.mod){x.nube=true;guardarTodo(m)}return true},()=>false);return Promise.resolve(false)}
function bajar(blob,nombre){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nombre;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
const archivo=d=>d.nombre.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'sensor';
function imprimir(d){const N=NODOS[d.nodo],F=FICHA[d.nodo],w=window.open('','_blank');if(!w){toast('Deja que la app abra ventanas para imprimir');return}
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${e_(d.nombre)}</title><style>body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#15222c}h1{font-size:20px}h2{font-size:16px;margin-top:20px}li{margin:4px 0}.ck{list-style:none;padding:0}.ck li:before{content:"☐ ";font-size:16px}pre{font-size:10.5px;white-space:pre-wrap;border:1px solid #ccc;padding:8px}svg{max-width:100%;height:auto}</style></head><body>
    <h1>${e_(d.nombre)}</h1><div>${e_(N.n)} · ${new Date().toLocaleDateString('es-ES')}</div>${d.spec?`<h2>Especificación del prototipo</h2>${specHTML(d.spec,d.spec.nodos||[])}`:''}
    <h2>Piezas</h2><ul>${N.piezas.map(p=>`<li>${e_(PIEZAS[p].n)}</li>`).join('')}${N.glands.map(k=>`<li>Prensaestopas ${PIEZAS[k].cable}</li>`).join('')}<li>Cordón de junta Ø 2 mm y 4 tornillos M3 × 12</li></ul>
    <h2>Esquema</h2>${esquema(d)}<ul>${T.validar(d).map(([k,t])=>`<li>${k==='bad'?'✗':'!'} ${e_(t)}</li>`).join('')}</ul>
    <h2>Montaje</h2><ul class="ck">${F.pasos.map(p=>`<li>${e_(p)}</li>`).join('')}</ul><h2>Uso</h2><ul>${F.uso.map(u=>`<li>${e_(u)}</li>`).join('')}</ul>
    ${COD[d.nodo]?`<h2>Código de partida</h2><pre>${e_(codigo(d))}</pre>`:''}</body></html>`);w.document.close();setTimeout(()=>{try{w.print()}catch(_){}},400)}

const repinta=()=>renderMain();
document.addEventListener('click',async e=>{if(st.tab!=='taller')return;const b=e.target.closest&&e.target.closest('[data-tl]');if(!b)return;const s=S(),a=b.dataset.tl;
  if(a==='q'){s.q[b.dataset.k]=b.dataset.v;if(b.dataset.k==='medir'&&!s.q.energia)s.q.energia=(NODOS[nodoDe({medir:b.dataset.v})]||{}).solar?'solar':'enchufe';repinta()}
  else if(a==='crear'){s.d=nuevo(s.q);s.v='piezas';s.m=null;repinta()}
  else if(a==='abrir'){const d=cargar().find(x=>x.id===b.dataset.id);if(d){s.d={...d,caja:{...CAJA0,...d.caja},hecho:d.hecho||[]};s.v=d.spec?'spec':'piezas';s.m=null;repinta()}}
  else if(a==='borrar'){if(!confirm('¿Borrar este diseño?'))return;const id=b.dataset.id;guardarTodo(cargar().filter(x=>x.id!==id));repinta();if(typeof Store!=='undefined'&&Store.delCol)Store.delCol(COL,id).catch(()=>toast('Borrado en este móvil; en la nube se borrará al volver la conexión'))}
  else if(a==='volver'){s.d=null;s.m=null;repinta()}
  else if(a==='guardar'){guardar(s.d).then(ok=>toast(ok?'Diseño guardado en la nube':'Guardado en este móvil: se subirá a la nube al volver la conexión'))}
  else if(a==='v'){s.v=b.dataset.v;repinta()}
  else if(a==='stl'){const k=b.dataset.k;b.disabled=true;try{const buf=await T.stl(s.d,k);bajar(new Blob([buf],{type:'model/stl'}),archivo(s.d)+'-'+k+'.stl');toast('STL de la '+k+' descargado')}catch(err){console.warn(err);toast('No se ha podido generar el STL')}b.disabled=false}
  else if(a==='scad'){bajar(new Blob([T.scad(s.d)],{type:'text/plain'}),archivo(s.d)+'.scad');toast('Archivo .scad descargado')}
  else if(a==='copiar'){try{await navigator.clipboard.writeText(codigo(s.d));toast('Código copiado')}catch(_){toast('No se ha podido copiar: selecciónalo a mano')}}
  else if(a==='imprimir')imprimir(s.d)});
document.addEventListener('change',e=>{if(st.tab!=='taller')return;const t=e.target,s=S();if(!s.d)return;
  if(t.dataset.tlfoto&&t.files&&t.files[0]){T.revFoto(t.files[0]);t.value='';return}
  if(t.dataset.tlp){s.d.pines[t.dataset.tlp]=+t.value;repinta()}
  else if(t.dataset.tla){s.d.alim[t.dataset.tla]=+t.value;repinta()}
  else if(t.dataset.tle){s.d.en={...EN0,...(s.d.en||{}),[t.dataset.tle]:+t.value};repinta()}
  else if(t.dataset.tlc){const k=t.dataset.tlc;if(t.type==='checkbox')s.d.caja[k]=t.checked;else{const v=parseFloat(String(t.value).replace(',','.'));if(!isFinite(v))return;const lim={pared:[2,6],holg:[1,15],extra:[4,40]}[k];s.d.caja[k]=Math.min(lim[1],Math.max(lim[0],v))}repinta()}
  else if(t.dataset.tlh!=null){const i=+t.dataset.tlh;s.d.hecho=t.checked?[...new Set([...s.d.hecho,i])]:s.d.hecho.filter(x=>x!==i);guardar(s.d);repinta()}
  else if(t.dataset.tln){s.d.nombre=t.value.trim()||s.d.nombre}});
window.addEventListener('resize',()=>{if(st.tab==='taller')T.dibujar()});
T._={PIEZAS,NODOS,geometria,distribuir};
/* Código con los pines de serie (el que se compila en GitHub para instalar desde la app) */
T.pinesDefecto=n=>{const p={};for(const c of NODOS[n].con)if(c.var)p[c.var]=c.def;return p};
T.codigoDefecto=n=>COD[n]?codigo({nodo:n,pines:T.pinesDefecto(n)}):'';
T.nodosConCodigo=()=>Object.keys(NODOS).filter(n=>COD[n]);
})();

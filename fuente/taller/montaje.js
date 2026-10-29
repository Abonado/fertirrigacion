/* Guías de montaje · solo el administrador (Catálogo → Detalles).
   Cada guía: herramientas, materiales con su enlace de compra, montaje detallado paso a paso con un dibujo animado por paso
   (la pieza nueva entra y se une con las anteriores) y una imagen realista orientativa de cómo queda.
   Las guías de los aparatos del Taller (N1–N9 y P) se generan con el diseño real: las mismas piezas, cables y caja.
   Se carga solo al abrir una ficha del catálogo. */
(()=>{'use strict';
const M=window.MONTAJE={};
const e_=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const enc=encodeURIComponent;

/* ---------- Enlaces de compra ----------
   Búsquedas del modelo exacto (no un anuncio concreto, que cambia de precio o desaparece). pro: distribuidor o presupuesto. */
M.enlaces=(b,pro)=>{if(!b)return '';const L=pro?[['Distribuidor','https://www.google.com/search?q='+enc(b+' distribuidor España')]]
  :[['Amazon','https://www.amazon.es/s?k='+enc(b)],['AliExpress','https://es.aliexpress.com/wholesale?SearchText='+enc(b)]];
  return `<span class="mj-lk">${L.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${t} ↗</a>`).join('')}</span>`};

/* ---------- Herramientas (las mismas para todas las guías) ---------- */
const HERR={
  soldador:{n:'Soldador de estaño de 60 W con temperatura regulable y soporte',b:'soldador estaño 60W temperatura regulable',p:'20–35 €',por:'Para soldar pines y cables. Con temperatura regulable (unos 330 °C) no quemas las placas.'},
  estano:{n:'Estaño con flux de 0,8 mm y pasta de flux',b:'estaño 0,8 mm flux',p:'8–12 €',por:'El fino (0,8 mm) es el bueno para pines pequeños.'},
  tercera:{n:'Tercera mano con lupa y pinzas',b:'tercera mano lupa soldar',p:'10–20 €',por:'Sujeta la placa y el cable mientras sueldas.'},
  polimetro:{n:'Polímetro digital',b:'polímetro digital',p:'15–30 €',por:'Comprobar tensiones (12 V del elevador, + de la batería) y que no hay cortocircuitos.'},
  pelacables:{n:'Pelacables automático',b:'pelacables automático',p:'10–20 €',por:'Pela el cable sin cortar los hilos de dentro.'},
  alicates:{n:'Alicates de corte y de punta',b:'alicates corte punta electrónica',p:'10–15 €',por:'Cortar cables, patas de componentes y bridas.'},
  termo:{n:'Termorretráctil surtido y pistola de calor (o mechero)',b:'kit termorretráctil surtido',p:'8–25 €',por:'Aislar cada soldadura: nada de cinta aislante en la humedad del invernadero.'},
  destorn:{n:'Juego de destornilladores de precisión',b:'destornilladores precisión',p:'10–15 €',por:'Tornillos de la caja y del potenciómetro del elevador.'},
  impresora:{n:'Impresora 3D (filamento PETG o ASA)',b:'filamento PETG blanco 1kg',p:'Filamento 20–25 € el kg',por:'Imprimir la caja del Taller. Si no tienes, cualquier tienda de impresión 3D te la imprime con el archivo STL.'},
  usbc:{n:'Cable USB-C de datos (no solo de carga)',b:'cable USB-C datos',p:'5–8 €',por:'Subir el código a la placa desde el ordenador.'},
  ordenador:{n:'Ordenador con Arduino IDE (gratis)',u:'https://www.arduino.cc/en/software',p:'Gratis',por:'Programa para cargar el código en la placa.'},
  taladro:{n:'Taladro con brocas y broca escalonada',b:'broca escalonada 4-20 mm',p:'Broca escalonada 8–15 €',por:'Agujeros limpios en tapas de depósito, cajas y soportes.'},
  llaves:{n:'Llave inglesa o llaves fijas',b:'llave inglesa',p:'8–15 €',por:'Apretar racores, transductores y prensaestopas grandes.'},
  teflon:{n:'Cinta de teflón',b:'cinta teflón fontanería',p:'1–3 €',por:'Sellar las roscas de agua.'},
  bridas:{n:'Bridas negras resistentes al sol (UV)',b:'bridas negras UV',p:'5–8 €',por:'Las blancas se rompen al sol en un verano.'},
  nivel:{n:'Nivel de burbuja pequeño',b:'nivel de burbuja pequeño',p:'5–10 €',por:'Sensores que tienen que quedar horizontales (radiación, pluviómetro).'},
  metro:{n:'Cinta métrica y regla',b:'cinta métrica 5 m',p:'5–10 €',por:'Medir alturas y comprobar los sensores de nivel.'},
  gafas:{n:'Gafas de protección',b:'gafas protección',p:'5 €',por:'Al soldar y al cortar patas de componentes saltan trocitos.'},
  silicona:{n:'Silicona neutra transparente',b:'silicona neutra transparente',p:'5 €',por:'Sellar pasos de cable y juntas que no lleven prensaestopas.'},
  movil:{n:'El móvil con la app',p:'—',por:'Dar de alta, comprobar los datos y apuntar.'},
  probeta:{n:'Probeta graduada de 1 L o jarra medidora',b:'probeta graduada 1000 ml',p:'5–10 €',por:'Calibrar pluviómetros y cazoletas de drenaje.'},
  sierra:{n:'Arco de sierra o sierra de calar',b:'arco de sierra',p:'10–20 €',por:'Cortar perfiles, tubos y tableros.'},
  allen:{n:'Juego de llaves Allen y llave de vaso',b:'juego llaves allen',p:'8–15 €',por:'Tornillería de chasis y perfiles de aluminio.'},
  escalera:{n:'Escalera',p:'—',por:'Llegar arriba del poste o de la estructura.'}
};
M.HERR=HERR;

/* ---------- Dibujos: piezas que se reutilizan en todas las guías ----------
   Cada icono se dibuja en su sitio con translate y escala. Coordenadas del escenario: 360 × 220. */
const IC={
  mesa:()=>`<rect x="0" y="0" width="340" height="14" rx="3" fill="#c9a26b"/><rect x="10" y="14" width="8" height="40" fill="#a37b45"/><rect x="322" y="14" width="8" height="40" fill="#a37b45"/>`,
  heltec:o=>{let s=`<rect x="0" y="0" width="96" height="44" rx="4" fill="#2a64c9" stroke="#163e86"/><rect x="26" y="9" width="34" height="22" rx="2" fill="#10161b"/><rect x="28" y="11" width="30" height="18" fill="#123"/>`
    +`<rect x="-6" y="16" width="9" height="12" rx="2" fill="#9aa4ad" stroke="#5b6670"/><circle cx="86" cy="9" r="3" fill="#d9b04a" stroke="#8a6d1d"/><rect x="70" y="30" width="8" height="5" rx="1" fill="#eee"/><rect x="80" y="30" width="8" height="5" rx="1" fill="#eee"/>`;
    if(o&&o.pines)for(let i=0;i<18;i++){s+=`<rect x="${5+i*5}" y="40" width="3" height="${o.pines===2?10:4}" fill="#222"/><rect x="${5+i*5}" y="${o.pines===2?-6:0}" width="3" height="${o.pines===2?10:4}" fill="#222"/>`}
    return o&&o.lb===0?s:s+`<text x="48" y="${o&&o.pines===2?63:56}" text-anchor="middle" font-size="9" font-weight="700" fill="#163e86">Heltec V3</text>`},
  pines:()=>{let s=`<rect x="0" y="0" width="90" height="5" fill="#111"/>`;for(let i=0;i<18;i++)s+=`<rect x="${1.5+i*5}" y="-6" width="2" height="17" fill="#d4af37"/>`;return s},
  antena:()=>`<path d="M0 0c6-4 6 4 12 0s6 4 12 0 6 4 12 0 6 4 12 0" fill="none" stroke="#b8860b" stroke-width="2.4"/><path d="M48 0h14" stroke="#555" stroke-width="2"/><circle cx="64" cy="0" r="3.5" fill="#d9b04a" stroke="#8a6d1d"/><text x="22" y="-8" font-size="8.5" fill="#555">antena 868</text>`,
  modulo:o=>{const w=(o&&o.w)||40,h=(o&&o.h)||26,c=(o&&o.c)||'#0e7c86';let s=`<rect x="0" y="0" width="${w}" height="${h}" rx="3" fill="${c}" stroke="#0004"/>`;
    const n=(o&&o.np)||4;for(let i=0;i<n;i++)s+=`<rect x="${w/2-(n*6)/2+i*6+1}" y="${h-4}" width="3" height="9" fill="#d4af37"/>`;
    if(o&&o.lata)s+=`<circle cx="${w/2}" cy="${h/2-3}" r="7" fill="#c0c6cc" stroke="#7c858d"/><circle cx="${w/2}" cy="${h/2-3}" r="3" fill="#333"/>`;
    else s+=`<rect x="${w/2-5}" y="${h/2-8}" width="10" height="10" rx="1.5" fill="#1d2329"/>`;return s+`<text x="${w/2}" y="-4" text-anchor="middle" font-size="9" font-weight="700" fill="#15222c">${e_(o&&o.t||'')}</text>`},
  bat:()=>`<rect x="0" y="0" width="80" height="22" rx="10" fill="#2e9e5b" stroke="#1b6b3c"/><rect x="80" y="6" width="5" height="10" rx="2" fill="#bbb"/><text x="40" y="15" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">18650</text><text x="88" y="-2" font-size="10" font-weight="700" fill="#c0392b">+</text>`,
  portapilas:()=>`<rect x="-4" y="-4" width="94" height="30" rx="3" fill="#222"/><rect x="0" y="0" width="86" height="22" rx="2" fill="#333"/>`,
  panel:()=>{let s=`<rect x="0" y="0" width="70" height="50" rx="2" fill="#1f3b63" stroke="#0d1d33" stroke-width="2"/>`;for(let i=1;i<4;i++)s+=`<path d="M${i*17.5} 2v46" stroke="#5b7ba8" stroke-width=".8"/>`;for(let j=1;j<3;j++)s+=`<path d="M2 ${j*16.6}h66" stroke="#5b7ba8" stroke-width=".8"/>`;return s+`<text x="35" y="-4" text-anchor="middle" font-size="9" font-weight="700" fill="#15222c">placa 6 V</text>`},
  enchufe:()=>`<rect x="0" y="0" width="30" height="36" rx="6" fill="#f2f2f2" stroke="#999"/><rect x="8" y="36" width="3" height="10" fill="#aaa"/><rect x="19" y="36" width="3" height="10" fill="#aaa"/><path d="M15 0v-14q0-8 10-8h20" fill="none" stroke="#555" stroke-width="3"/><text x="15" y="22" text-anchor="middle" font-size="8" fill="#555">5 V</text>`,
  usbcable:()=>`<rect x="0" y="-4" width="14" height="8" rx="2" fill="#666"/><path d="M14 0h40" stroke="#555" stroke-width="3"/>`,
  soldador:()=>`<path d="M0 0l46 0" stroke="#999" stroke-width="3"/><path d="M-10 0l10 0" stroke="#666" stroke-width="2"/><rect x="46" y="-6" width="44" height="12" rx="6" fill="#d35400"/><path d="M90 0h22" stroke="#333" stroke-width="3"/>`,
  polimetro:()=>`<rect x="0" y="0" width="38" height="60" rx="5" fill="#f1c40f" stroke="#b7950b"/><rect x="5" y="6" width="28" height="14" rx="2" fill="#b7d4b0"/><text x="19" y="17" text-anchor="middle" font-size="8" font-family="monospace" fill="#123">12.0</text><circle cx="19" cy="38" r="8" fill="#333"/><path d="M10 60l-14 26M28 60l14 26" stroke="#c0392b" stroke-width="2"/><path d="M28 60l14 26" stroke="#222" stroke-width="2"/>`,
  alicates:()=>`<path d="M0 0l30 8M0 16l30 8" stroke="#c0392b" stroke-width="6" stroke-linecap="round"/><path d="M30 8l20 6M30 24l20-10" stroke="#7f8c8d" stroke-width="4"/>`,
  destorn:()=>`<rect x="0" y="-5" width="30" height="10" rx="4" fill="#e67e22"/><path d="M30 0h30" stroke="#95a5a6" stroke-width="3"/>`,
  portatil:o=>`<rect x="8" y="0" width="74" height="46" rx="3" fill="#2c3e50"/><rect x="12" y="4" width="66" height="38" fill="#ecf0f1"/><text x="16" y="16" font-size="7" font-family="monospace" fill="#2c3e50">${e_((o&&o.a)||'navegador')}</text><text x="16" y="26" font-size="7" font-family="monospace" fill="#2c3e50">${e_((o&&o.b)||'')}</text><rect x="0" y="46" width="90" height="6" rx="2" fill="#7f8c8d"/>`,
  movil:o=>`<rect x="0" y="0" width="40" height="72" rx="6" fill="#222"/><rect x="3" y="6" width="34" height="58" rx="2" fill="#eef4f2"/><text x="20" y="22" text-anchor="middle" font-size="${String(o&&o.t1||'').length>9?5:6.5}" font-weight="700" fill="#15222c">${e_(o&&o.t1||'APP')}</text><text x="20" y="36" text-anchor="middle" font-size="${String(o&&o.t2||'').length>7?5.5:9}" font-weight="700" fill="#1a7f4b">${e_(o&&o.t2||'')}</text><text x="20" y="48" text-anchor="middle" font-size="6" fill="#555">${e_(o&&o.t3||'')}</text>`,
  impresora:()=>`<rect x="0" y="0" width="70" height="70" rx="4" fill="none" stroke="#34495e" stroke-width="4"/><rect x="10" y="56" width="50" height="6" fill="#7f8c8d"/><rect x="28" y="20" width="14" height="12" fill="#e74c3c"/><path d="M4 26h62" stroke="#34495e" stroke-width="2"/><rect x="22" y="44" width="26" height="12" rx="1" fill="#ecf0f1" stroke="#95a5a6"/>`,
  cajaB:o=>{const w=(o&&o.w)||120,h=(o&&o.h)||46;return `<path d="M0 0v${h}h${w}v-${h}" fill="#f4f6f7" stroke="#7f8c8d" stroke-width="3"/><path d="M4 2h${w-8}" stroke="#bfc6cb" stroke-width="2" stroke-dasharray="4 3"/><rect x="-8" y="${h-10}" width="8" height="8" fill="#bdc3c7"/><rect x="${w}" y="${h-10}" width="8" height="8" fill="#bdc3c7"/>`},
  tapa:o=>{const w=(o&&o.w)||120;return `<rect x="-2" y="0" width="${w+4}" height="8" rx="2" fill="#ecf0f1" stroke="#7f8c8d" stroke-width="2"/>`},
  junta:o=>{const w=(o&&o.w)||116;return `<rect x="0" y="0" width="${w}" height="4" rx="2" fill="#2c2c2c"/>`},
  gland:()=>`<rect x="-7" y="0" width="14" height="6" fill="#555"/><path d="M-6 6h12l-2 10h-8z" fill="#333"/><rect x="-9" y="-6" width="18" height="6" rx="1" fill="#444"/>`,
  tornillo:()=>`<rect x="-4" y="-3" width="8" height="3" rx="1" fill="#7f8c8d"/><path d="M-1.5 0h3v14h-3z" fill="#95a5a6"/><path d="M-1.5 3h3M-1.5 6h3M-1.5 9h3" stroke="#555" stroke-width=".6"/>`,
  poste:o=>`<rect x="0" y="0" width="10" height="${(o&&o.h)||200}" fill="#9aa5ad" stroke="#6b767e"/>`,
  garita:()=>{let s='';for(let i=0;i<6;i++)s+=`<path d="M0 ${i*8}l8 -4h44l8 4z" fill="#fdfdfd" stroke="#9aa4ad"/>`;return s+`<rect x="22" y="2" width="16" height="38" fill="none" stroke="#bbb" stroke-dasharray="2 2"/>`},
  planta:o=>{const h=(o&&o.h)||120;let s=`<path d="M10 ${h}V0" stroke="#3c7a2f" stroke-width="3"/>`;for(let i=0;i<5;i++){const y=10+i*h/5;s+=`<path d="M10 ${y}q-18 -6 -26 4q12 6 26 -4zM10 ${y+10}q18 -6 26 4q-12 6 -26 -4z" fill="#4f9a3a"/>`}
    s+=`<circle cx="-2" cy="${h*0.55}" r="6" fill="#d63a2f"/><circle cx="20" cy="${h*0.62}" r="6" fill="#e6a23c"/><circle cx="6" cy="${h*0.68}" r="5.5" fill="#d63a2f"/>`;return s},
  saco:()=>`<rect x="0" y="0" width="120" height="22" rx="8" fill="#e8e3d6" stroke="#b9ad92"/><path d="M8 4h104" stroke="#8b6d4a" stroke-width="3" opacity=".5"/>`,
  gotero:()=>`<path d="M0 0h50" stroke="#222" stroke-width="2"/><path d="M40 0v18" stroke="#222" stroke-width="2"/><circle cx="40" cy="20" r="2.5" fill="#3498db"/>`,
  sonda:o=>`<path d="M0 0v${(o&&o.l)||46}" stroke="#7f8c8d" stroke-width="5" stroke-linecap="round"/><path d="M0 0q0 -20 ${(o&&o.cx)||40} -24" fill="none" stroke="#222" stroke-width="2"/>`,
  capacitivo:()=>`<path d="M0 0h18v60l-9 10l-9-10z" fill="#1a1a1a" stroke="#000"/><rect x="0" y="0" width="18" height="16" fill="#c0392b"/><path d="M3 24h12" stroke="#555"/><text x="22" y="10" font-size="8.5" font-weight="700" fill="#15222c">capacitivo</text>`,
  deposito:o=>{const w=(o&&o.w)||110,h=(o&&o.h)||120,n=(o&&o.n)==null?0.6:o.n;return `<rect x="0" y="0" width="${w}" height="${h}" rx="6" fill="#ecf0f1" stroke="#7f8c8d" stroke-width="2"/><rect x="2" y="${h*(1-n)}" width="${w-4}" height="${h*n-2}" rx="4" fill="#5dade2" opacity=".7"/><rect x="${w/2-18}" y="-6" width="36" height="8" rx="2" fill="#bdc3c7" stroke="#7f8c8d"/>`},
  ultrason:()=>`<rect x="0" y="0" width="34" height="22" rx="4" fill="#222"/><circle cx="17" cy="22" r="8" fill="#444" stroke="#111"/><path d="M5 34q12 8 24 0M1 42q16 12 32 0" fill="none" stroke="#5dade2" stroke-width="1.5" stroke-dasharray="3 2"/>`,
  tuberia:o=>`<rect x="0" y="0" width="${(o&&o.w)||300}" height="22" rx="4" fill="#d5d8dc" stroke="#808b96"/><path d="M4 11h${((o&&o.w)||300)-8}" stroke="#5dade2" stroke-width="5" opacity=".5" stroke-dasharray="10 8"/>`,
  te:()=>`<rect x="0" y="0" width="34" height="26" rx="3" fill="#bdc3c7" stroke="#808b96"/><rect x="9" y="-14" width="16" height="16" fill="#bdc3c7" stroke="#808b96"/>`,
  transductor:()=>`<rect x="0" y="0" width="22" height="40" rx="4" fill="#c0c6cc" stroke="#7c858d"/><rect x="5" y="40" width="12" height="10" fill="#9aa4ad"/><path d="M11 0v-20q0-10 30-12" fill="none" stroke="#222" stroke-width="2.5"/><text x="11" y="24" text-anchor="middle" font-size="7" fill="#333">bar</text>`,
  manometro:()=>`<circle cx="16" cy="16" r="16" fill="#fff" stroke="#555" stroke-width="2"/><path d="M16 16l8-8" stroke="#c0392b" stroke-width="2"/><rect x="11" y="32" width="10" height="10" fill="#9aa4ad"/>`,
  filtro:()=>`<rect x="0" y="0" width="40" height="70" rx="8" fill="#e74c3c" stroke="#922b21"/><text x="20" y="40" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">FILTRO</text>`,
  contador:()=>`<rect x="0" y="0" width="60" height="30" rx="6" fill="#2471a3" stroke="#154360"/><circle cx="30" cy="15" r="11" fill="#fdfefe" stroke="#154360"/><text x="30" y="18" text-anchor="middle" font-size="7" font-family="monospace" fill="#154360">0123</text>`,
  emisor:()=>`<rect x="0" y="0" width="24" height="14" rx="3" fill="#111"/><path d="M12 0v-18q0-8 30-10" fill="none" stroke="#222" stroke-width="2"/>`,
  pluvio:()=>`<path d="M0 0h50l-10 24h-30z" fill="#ecf0f1" stroke="#7f8c8d" stroke-width="2"/><rect x="8" y="24" width="34" height="40" rx="3" fill="#fdfefe" stroke="#7f8c8d" stroke-width="2"/><path d="M14 46l22-10" stroke="#e67e22" stroke-width="4"/><circle cx="25" cy="41" r="2" fill="#333"/>`,
  anemo:()=>`<path d="M25 30V0" stroke="#7f8c8d" stroke-width="3"/><path d="M0 0h50" stroke="#7f8c8d" stroke-width="2"/><circle cx="0" cy="0" r="6" fill="#ecf0f1" stroke="#7f8c8d"/><circle cx="50" cy="0" r="6" fill="#ecf0f1" stroke="#7f8c8d"/><circle cx="25" cy="-6" r="6" fill="#ecf0f1" stroke="#7f8c8d"/>`,
  cuadro:()=>`<rect x="0" y="0" width="90" height="110" rx="4" fill="#ecf0f1" stroke="#7f8c8d" stroke-width="2"/><rect x="10" y="12" width="70" height="20" fill="#d5d8dc"/>`+[0,1,2,3].map(i=>`<rect x="${14+i*17}" y="14" width="12" height="16" fill="#fff" stroke="#999"/>`).join('')+`<path d="M30 32v80M44 32v80M58 32v80" stroke="#8e5a2a" stroke-width="3"/><path d="M44 32v80" stroke="#2471a3" stroke-width="3"/><path d="M58 32v80" stroke="#555" stroke-width="3"/><text x="45" y="-4" text-anchor="middle" font-size="9" font-weight="700" fill="#15222c">cuadro de la bomba</text>`,
  pinza:()=>`<path d="M0 10a12 12 0 1 1 24 0a12 12 0 1 1 -24 0" fill="none" stroke="#2c3e50" stroke-width="7"/><path d="M12 22v20q0 10 30 10" fill="none" stroke="#222" stroke-width="2"/>`,
  router:()=>`<rect x="0" y="0" width="60" height="20" rx="4" fill="#fdfefe" stroke="#7f8c8d"/><path d="M10 0v-16M50 0v-16" stroke="#7f8c8d" stroke-width="2"/><circle cx="14" cy="10" r="2" fill="#2ecc71"/><circle cx="22" cy="10" r="2" fill="#2ecc71"/><text x="30" y="34" text-anchor="middle" font-size="8.5" fill="#555">router wifi</text>`,
  pasarela:()=>`<rect x="0" y="0" width="56" height="70" rx="6" fill="#fdfefe" stroke="#7f8c8d" stroke-width="2"/><path d="M28 0v-34" stroke="#333" stroke-width="3"/><circle cx="14" cy="16" r="2.5" fill="#2ecc71"/><circle cx="24" cy="16" r="2.5" fill="#2ecc71"/><text x="28" y="44" text-anchor="middle" font-size="8" font-weight="700" fill="#555">LoRa</text><text x="28" y="56" text-anchor="middle" font-size="8" font-weight="700" fill="#555">4G</text>`,
  sensorlora:()=>`<rect x="0" y="0" width="30" height="50" rx="6" fill="#fdfefe" stroke="#7f8c8d" stroke-width="2"/><circle cx="15" cy="12" r="3" fill="#2ecc71"/><rect x="7" y="22" width="16" height="6" rx="2" fill="#bdc3c7"/><path d="M15 50v24q0 10 20 12" fill="none" stroke="#222" stroke-width="2"/>`,
  sim:()=>`<path d="M0 0h22l6 6v28h-28z" fill="#f1c40f" stroke="#b7950b"/><rect x="5" y="10" width="16" height="14" rx="2" fill="#d4ac0d"/>`,
  camara:()=>`<rect x="0" y="0" width="56" height="26" rx="10" fill="#fdfefe" stroke="#7f8c8d" stroke-width="2"/><circle cx="46" cy="13" r="8" fill="#1d2329"/><circle cx="46" cy="13" r="3" fill="#5dade2"/><path d="M18 26v14h-14" stroke="#7f8c8d" stroke-width="4" fill="none"/>`,
  esp32cam:()=>`<rect x="0" y="0" width="27" height="40" rx="2" fill="#1d1d1d"/><rect x="6" y="6" width="15" height="15" rx="2" fill="#333"/><circle cx="13.5" cy="13.5" r="5" fill="#111" stroke="#666"/><rect x="9" y="30" width="9" height="6" fill="#ccc"/><text x="13" y="-4" text-anchor="middle" font-size="8.5" font-weight="700" fill="#15222c">ESP32-CAM</text>`,
  placaAdh:()=>`<rect x="0" y="0" width="60" height="80" fill="#f4d03f" stroke="#b7950b"/>`+[[12,14],[40,22],[25,40],[46,58],[14,64],[30,28]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2" fill="#222"/>`).join(''),
  trampa:()=>`<path d="M0 30l30-30l30 30z" fill="#e74c3c" stroke="#922b21"/><rect x="8" y="26" width="44" height="4" fill="#fdfefe"/><path d="M30 0v-14" stroke="#555"/>`,
  rueda:()=>`<circle cx="0" cy="0" r="16" fill="#222"/><circle cx="0" cy="0" r="6" fill="#999"/>`,
  motor:()=>`<rect x="0" y="0" width="34" height="16" rx="4" fill="#f1c40f" stroke="#b7950b"/><rect x="34" y="5" width="8" height="6" fill="#999"/>`,
  chasis:o=>`<rect x="0" y="0" width="${(o&&o.w)||170}" height="14" rx="3" fill="#7f8c8d" stroke="#566573"/>`,
  rpi:()=>`<rect x="0" y="0" width="64" height="42" rx="3" fill="#2e8b57" stroke="#1d5e3a"/><rect x="6" y="6" width="18" height="18" fill="#222"/><rect x="40" y="4" width="20" height="12" fill="#bbb"/><rect x="40" y="22" width="20" height="12" fill="#bbb"/><text x="32" y="-4" text-anchor="middle" font-size="8.5" font-weight="700" fill="#15222c">Raspberry Pi</text>`,
  driver:()=>`<rect x="0" y="0" width="44" height="30" rx="2" fill="#c0392b" stroke="#7b241c"/><rect x="12" y="6" width="20" height="16" fill="#222"/><text x="22" y="-4" text-anchor="middle" font-size="8.5" font-weight="700" fill="#15222c">driver motores</text>`,
  batgrande:o=>`<rect x="0" y="0" width="70" height="34" rx="4" fill="#34495e" stroke="#1b2631"/><rect x="8" y="-5" width="10" height="5" fill="#c0392b"/><rect x="52" y="-5" width="10" height="5" fill="#222"/><text x="35" y="22" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">${e_((o&&o.t)||'12 V')}</text>`,
  celula:()=>`<rect x="0" y="0" width="50" height="12" rx="2" fill="#bdc3c7" stroke="#7f8c8d"/><rect x="18" y="2" width="14" height="8" fill="#f4f6f7"/><path d="M50 6q12 0 16 12" fill="none" stroke="#c0392b" stroke-width="1.5"/>`,
  tablero:o=>`<rect x="0" y="0" width="${(o&&o.w)||200}" height="10" fill="#c9a26b" stroke="#a37b45"/>`,
  cazoleta:()=>`<path d="M0 0l20 10l20-10v6l-20 10l-20-10z" fill="#e67e22" stroke="#a04000"/><circle cx="20" cy="10" r="2.5" fill="#333"/>`,
  embudo:()=>`<path d="M0 0h60l-22 26v14h-16v-14z" fill="#d6eaf8" stroke="#2e86c1" stroke-width="1.5"/>`,
  bandeja:o=>`<path d="M0 0h${(o&&o.w)||170}l-8 14h-${((o&&o.w)||170)-16}z" fill="#bfc9ca" stroke="#7f8c8d"/>`,
  pistolaIR:()=>`<path d="M0 0h50v18h-20l-6 26h-14l4-26h-14z" fill="#f39c12" stroke="#a04000"/><rect x="34" y="4" width="12" height="9" fill="#b7d4b0"/><path d="M50 9h40" stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="3 2"/>`,
  termohigro:()=>`<rect x="0" y="0" width="40" height="48" rx="5" fill="#fdfefe" stroke="#7f8c8d" stroke-width="2"/><rect x="5" y="6" width="30" height="22" rx="2" fill="#d6eaf8"/><text x="20" y="15" text-anchor="middle" font-size="7" font-family="monospace" fill="#123">24.6°</text><text x="20" y="25" text-anchor="middle" font-size="7" font-family="monospace" fill="#123">72%</text>`,
  qr:()=>{let s=`<rect x="0" y="0" width="40" height="40" fill="#fff" stroke="#333"/>`;const b=[[3,3],[27,3],[3,27]];for(const[x,y]of b)s+=`<rect x="${x}" y="${y}" width="10" height="10" fill="none" stroke="#111" stroke-width="2.5"/>`;
    for(const[x,y]of[[18,6],[20,14],[15,20],[24,24],[30,18],[18,30],[30,32]])s+=`<rect x="${x}" y="${y}" width="4" height="4" fill="#111"/>`;return s},
  nave:()=>`<path d="M0 120V40l60-36l60 36l60-36l60 36v80" fill="none" stroke="#9aa5ad" stroke-width="2"/><path d="M0 120h240" stroke="#8b6d4a" stroke-width="3"/>`,
  dron:()=>`<rect x="30" y="8" width="30" height="12" rx="4" fill="#5d6d7e"/><path d="M30 12l-22-8M60 12l22-8M30 16l-22 8M60 16l22 8" stroke="#5d6d7e" stroke-width="3"/>`+[[6,4],[84,4],[6,24],[84,24]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="12" ry="2.5" fill="#aab7b8"/>`).join('')+`<circle cx="45" cy="24" r="4" fill="#1d2329"/>`,
  valvula:()=>`<rect x="0" y="0" width="40" height="22" rx="3" fill="#2e86c1" stroke="#1b4f72"/><rect x="10" y="-22" width="20" height="22" rx="3" fill="#1d2329"/><path d="M20 -22v-12q0-8 26-10" fill="none" stroke="#c0392b" stroke-width="2"/>`,
  rele:()=>`<rect x="0" y="0" width="50" height="34" rx="3" fill="#2e86c1" stroke="#1b4f72"/><rect x="6" y="6" width="16" height="22" fill="#1d2329"/><rect x="28" y="6" width="16" height="22" fill="#1d2329"/><text x="25" y="-4" text-anchor="middle" font-size="8.5" font-weight="700" fill="#15222c">relés LoRa</text>`,
  contactor:()=>`<rect x="0" y="0" width="30" height="44" rx="2" fill="#ecf0f1" stroke="#7f8c8d"/><rect x="6" y="14" width="18" height="10" fill="#7f8c8d"/><text x="15" y="-4" text-anchor="middle" font-size="8" fill="#15222c">contactor</text>`,
  ok:()=>`<circle cx="0" cy="0" r="14" fill="#1a7f4b"/><path d="M-6 0l4 5l9-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  mal:()=>`<circle cx="0" cy="0" r="14" fill="#c0392b"/><path d="M-6-6l12 12M6-6l-12 12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  sol:()=>`<circle cx="0" cy="0" r="12" fill="#f5b041"/>`+[0,45,90,135,180,225,270,315].map(a=>{const r=a*Math.PI/180;return `<path d="M${(16*Math.cos(r)).toFixed(1)} ${(16*Math.sin(r)).toFixed(1)}L${(22*Math.cos(r)).toFixed(1)} ${(22*Math.sin(r)).toFixed(1)}" stroke="#f5b041" stroke-width="2.5"/>`}).join(''),
  regla:()=>`<rect x="0" y="0" width="8" height="120" fill="#f9e79f" stroke="#b7950b"/>`+Array.from({length:12},(_,i)=>`<path d="M0 ${i*10}h${i%5?3:6}" stroke="#7d6608"/>`).join(''),
  refracto:()=>`<rect x="0" y="0" width="70" height="22" rx="10" fill="#1d2329"/><rect x="8" y="5" width="22" height="12" rx="2" fill="#b7d4b0"/><text x="19" y="14" text-anchor="middle" font-size="7" font-family="monospace" fill="#123">6.2</text><circle cx="52" cy="11" r="6" fill="#aab7b8"/>`,
  medidor:o=>`<rect x="0" y="0" width="26" height="70" rx="6" fill="#ecf0f1" stroke="#7f8c8d"/><rect x="4" y="6" width="18" height="14" rx="2" fill="#b7d4b0"/><text x="13" y="16" text-anchor="middle" font-size="6.5" font-family="monospace" fill="#123">${e_((o&&o.v)||'2.1')}</text><path d="M13 70v18" stroke="#7f8c8d" stroke-width="4"/>`,
  estacion:()=>`<path d="M20 0v130" stroke="#9aa5ad" stroke-width="5"/><path d="M0 10h40" stroke="#7f8c8d" stroke-width="2"/><circle cx="0" cy="10" r="5" fill="#ecf0f1" stroke="#7f8c8d"/><circle cx="40" cy="10" r="5" fill="#ecf0f1" stroke="#7f8c8d"/><path d="M20 40l-24 0" stroke="#7f8c8d" stroke-width="2"/>`+[0,1,2,3].map(i=>`<path d="M-30 ${36+i*6}l6-3h18l6 3z" fill="#fdfefe" stroke="#9aa4ad"/>`).join('')+`<rect x="24" y="56" width="26" height="20" fill="#1f3b63"/>`,
  tractor:()=>`<rect x="20" y="10" width="50" height="24" rx="3" fill="#c0392b"/><rect x="40" y="-10" width="22" height="22" fill="none" stroke="#7b241c" stroke-width="3"/><circle cx="28" cy="38" r="14" fill="#222"/><circle cx="64" cy="40" r="10" fill="#222"/>`,
  bascula:()=>`<rect x="0" y="0" width="90" height="12" rx="3" fill="#95a5a6" stroke="#566573"/><rect x="60" y="-28" width="26" height="20" rx="3" fill="#fdfefe" stroke="#566573"/><text x="73" y="-14" text-anchor="middle" font-size="7.5" font-family="monospace" fill="#123">12.4</text><path d="M73 -8v8" stroke="#566573" stroke-width="2"/>`,
  etiqueta:()=>`<rect x="0" y="0" width="54" height="34" rx="2" fill="#fff" stroke="#999"/><rect x="4" y="4" width="22" height="22" fill="#111" opacity=".85"/><path d="M30 8h20M30 14h16M30 20h20" stroke="#555"/>`,
  palet:()=>`<rect x="0" y="0" width="100" height="60" fill="#e59866" stroke="#a04000"/><path d="M0 20h100M0 40h100" stroke="#a04000"/><rect x="0" y="60" width="100" height="10" fill="#c9a26b"/>`,
  puerta:()=>`<rect x="0" y="0" width="60" height="110" fill="#d5d8dc" stroke="#7f8c8d" stroke-width="2"/><circle cx="50" cy="56" r="3" fill="#555"/>`,
  sensorpuerta:()=>`<rect x="0" y="0" width="14" height="34" rx="3" fill="#fdfefe" stroke="#7f8c8d"/><rect x="18" y="4" width="8" height="24" rx="2" fill="#fdfefe" stroke="#7f8c8d"/>`,
  ventilador:()=>`<circle cx="0" cy="0" r="20" fill="none" stroke="#7f8c8d" stroke-width="2"/><path d="M0 0q10-18 4-18M0 0q18 10 18 4M0 0q-10 18-4 18M0 0q-18-10-18-4" fill="#aab7b8" stroke="#7f8c8d"/>`,
  tubo:o=>`<rect x="0" y="0" width="${(o&&o.w)||120}" height="10" rx="5" fill="#ecf0f1" stroke="#95a5a6"/>`,
  cable:o=>`<path d="${(o&&o.d)||'M0 0h60'}" fill="none" stroke="${(o&&o.c)||'#222'}" stroke-width="2.5"/>`
};
M.IC=IC;

/* ---------- Escenario de un paso ----------
   Elemento: {id, k:'i' icono | 'r' rectángulo | 'l' línea o cable | 'a' flecha | 't' texto | 'p' trazo, …}
   Un paso añade elementos (add), los quita (del) o los mueve (mv: {id:[x,y]}). Lo nuevo del paso entra animado (de: [dx,dy] desde donde
   viene; los cables se dibujan solos) y queda resaltado; lo de pasos anteriores sigue, un poco apagado. */
function estado(G,i){const E=new Map(),nuevo=new Set(),desde={};
  for(let k=0;k<=i;k++){const P=G.pasos[k];for(const id of P.del||[])E.delete(id);
    for(const el of P.add||[]){E.set(el.id,{...el});if(k===i){nuevo.add(el.id);if(el.de)desde[el.id]=el.de}}
    for(const [id,xy] of Object.entries(P.mv||{})){const el=E.get(id);if(!el)continue;if(k===i){nuevo.add(id);desde[id]=[el.x-xy[0],el.y-xy[1]]}E.set(id,{...el,x:xy[0],y:xy[1]})}}
  return {E,nuevo,desde}}
function pinta(el){switch(el.k){
  case 'i':return `<g transform="translate(${el.x||0} ${el.y||0})${el.r?` rotate(${el.r})`:''}${el.s?` scale(${el.s})`:''}">${(IC[el.ic]||(()=>''))(el.o)}</g>`;
  case 'r':return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${el.rx==null?6:el.rx}" fill="${el.f||'#fff'}" stroke="${el.c||'#7f8c8d'}" stroke-width="${el.sw||1.5}"/>${el.t?`<text x="${el.x+(el.ta==='m'?el.w/2:7)}" y="${el.y+14}" ${el.ta==='m'?'text-anchor="middle"':''} font-size="${el.fs||10}" font-weight="700" fill="#15222c">${e_(el.t)}</text>`:''}`;
  case 'l':{const p=el.p.map((q,j)=>(j?'L':'M')+q[0]+' '+q[1]).join('');return `<path d="${p}" pathLength="1" fill="none" stroke="${el.c||'#222'}" stroke-width="${el.w||2.5}" stroke-linejoin="round" stroke-linecap="round" ${el.d?`stroke-dasharray="${el.d}"`:''}/>`}
  case 'a':{const[[x1,y1],[x2,y2]]=el.p,a=Math.atan2(y2-y1,x2-x1),h=8;return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${el.c||'#e67e22'}" stroke-width="2.5" stroke-dasharray="5 4"/><path d="M${x2} ${y2}L${(x2-h*Math.cos(a-0.45)).toFixed(1)} ${(y2-h*Math.sin(a-0.45)).toFixed(1)}L${(x2-h*Math.cos(a+0.45)).toFixed(1)} ${(y2-h*Math.sin(a+0.45)).toFixed(1)}z" fill="${el.c||'#e67e22'}"/>`}
  case 't':return `<text x="${el.x}" y="${el.y}" font-size="${el.fs||10}" ${el.ta?`text-anchor="${el.ta==='m'?'middle':el.ta}"`:''} font-weight="${el.b?700:400}" fill="${el.c||'#15222c'}">${e_(el.t)}</text>`;
  case 'p':return `<path d="${el.d}" fill="${el.f||'none'}" stroke="${el.c||'#555'}" stroke-width="${el.w||2}"/>`;
  case 'svg':return el.h;}return ''}
M.escena=(G,i)=>{const {E,nuevo,desde}=estado(G,i);let s=`<svg viewBox="0 0 360 230" class="mj-svg" role="img" aria-label="Paso ${i+1}: ${e_(G.pasos[i].t)}" font-family="system-ui,sans-serif">`;
  const orden=[...E.values()].sort((a,b)=>(a.z||0)-(b.z||0));
  for(const el of orden){const n=nuevo.has(el.id),d=desde[el.id]||(n&&el.k!=='l'&&el.k!=='a'?[0,-18]:null),cl=n?(el.k==='l'?'mj-new mj-draw':'mj-new mj-in'):'mj-old';
    s+=`<g class="${cl}" ${d?`style="--dx:${d[0]}px;--dy:${d[1]}px"`:''}>${pinta(el)}</g>`}
  return s+'</svg>'};

/* ---------- Pantalla de la guía ---------- */
const CSS=`.mj{display:grid;gap:14px}.mj h3{margin:0}.mj-img{position:relative;border-radius:12px;overflow:hidden;background:#e9eef0}.mj-img img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover}
.mj-img figcaption{font-size:11.5px;padding:6px 10px;color:var(--muted);text-transform:none;display:flex;justify-content:space-between;gap:8px;align-items:center}
.mj-vis{border:1.5px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface)}.mj-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline;padding:10px 12px 0}.mj-top b{font-size:15px}
.mj-num{font-size:12px;font-weight:700;color:var(--muted);white-space:nowrap}.mj-st{background:#fbfcfc;margin:8px 10px;border-radius:10px;border:1px solid #e3e8ea;touch-action:pan-y}.mj-svg{display:block;width:100%;height:auto}
.mj-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px 10px}.mj-nav .btn{min-width:0}.mj-dots{flex:1;height:6px;border-radius:3px;background:#dfe6e9;overflow:hidden}.mj-dots i{display:block;height:100%;background:var(--accent,#1a7f4b);transition:width .4s}
.mj-txt{padding:0 12px 12px;display:grid;gap:8px;font-size:14.5px;line-height:1.45}.mj-txt p,.mj-todo p{margin:0;white-space:pre-line}.mj-txt .mj-ojo{padding:8px 10px;border-radius:8px;background:color-mix(in srgb,#e67e22 12%,var(--surface));font-size:13.5px}
.mj-old{opacity:.5}.mj-in{animation:mjIn .9s cubic-bezier(.2,.8,.2,1) both}.mj-draw path{stroke-dasharray:1;stroke-dashoffset:1;animation:mjDraw 1.1s .15s ease forwards}.mj-new{filter:drop-shadow(0 0 3px #f5b04199)}
@keyframes mjIn{from{transform:translate(var(--dx,0),var(--dy,-18px));opacity:0}to{transform:none;opacity:1}}@keyframes mjDraw{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.mj-in,.mj-draw path{animation:none;stroke-dashoffset:0}}
.mj-tab{width:100%;border-collapse:collapse;font-size:13.5px}.mj-tab td{padding:7px 4px;border-top:1px solid var(--line);vertical-align:top;text-align:left}.mj-tab td:first-child{white-space:nowrap;font-weight:700;width:2.5em}.mj-tab small{display:block;color:var(--muted);text-transform:none}
.mj-tab .mj-pr{white-space:nowrap;text-align:right}.mj-lk{display:inline-flex;gap:10px;flex-wrap:wrap;margin-top:3px}.mj-lk a{font-size:12.5px;font-weight:700;color:var(--accent,#1a7f4b);text-decoration:none}
.mj-tot{display:flex;justify-content:space-between;font-weight:700;padding-top:8px;border-top:2px solid var(--line)}.mj-todo ol{margin:0;padding-left:22px;display:grid;gap:10px}.mj-todo li p{margin:4px 0 0}
.mj-pro{padding:10px 12px;border-radius:10px;background:color-mix(in srgb,var(--navy,#1b2e45) 6%,var(--surface))}`;
M.estilos=()=>estilos();
function estilos(){if(document.getElementById('mj_css'))return;const e=document.createElement('style');e.id='mj_css';e.textContent=CSS;document.head.appendChild(e)}

const par=t=>String(t||'').split(/\n\n+/).map(x=>`<p>${e_(x)}</p>`).join('');
function pasoHTML(G,i){const P=G.pasos[i];return {st:M.escena(G,i),top:`<b>${e_(P.t)}</b><span class="mj-num">Paso ${i+1} de ${G.pasos.length}</span>`,
  txt:par(P.x)+(P.ojo?`<div class="mj-ojo"><b>Ojo:</b> ${e_(P.ojo)}</div>`:''),dots:`<i style="width:${((i+1)/G.pasos.length*100).toFixed(1)}%"></i>`}}
const precioN=p=>{const m=String(p||'').replace(/\./g,'').match(/(\d+(?:,\d+)?)(?:\s*[–-]\s*(\d+(?:,\d+)?))?/);if(!m)return null;const a=+m[1].replace(',','.'),b=m[2]?+m[2].replace(',','.'):a;return [a,b]};
M.total=G=>{let a=0,b=0,falta=0;for(const m of G.mat||[]){const p=precioN(m.p);if(!p){falta++;continue}const c=m.c||1;a+=p[0]*(m.pc?1:c);b+=p[1]*(m.pc?1:c)}return {a:Math.round(a),b:Math.round(b),falta}};

/* Guía completa dentro de la página de Detalles. k = clave de la ficha; img = imagen realista (si no está oculta) */
M.html=(it,k,o)=>{estilos();const G=M.guia(it);if(!G)return '';o=o||{};
  if(G.pro)return `<section class="card mj"><h3>Montaje e instalación</h3><div class="mj-pro">${par(G.pro)}</div>${G.pedir?`<div class="catsec"><h4>Qué pedir y qué revisar</h4><ol>${G.pedir.map(x=>`<li>${e_(x)}</li>`).join('')}</ol></div>`:''}</section>`;
  const i=Math.min(o.paso||0,G.pasos.length-1),P=pasoHTML(G,i),T=M.total(G);
  const imgU=(M.IMG||{})[it.n]||G.img;const img=imgU&&!o.sinImg?`<figure class="mj-img"><img src="${e_(imgU)}" alt="Así queda: ${e_(it.n)}" loading="lazy" onerror="this.closest('figure').hidden=true"><figcaption><span>Imagen orientativa generada con IA: para montarlo, sigue los dibujos.</span>${o.admin?`<button class="lnk" type="button" data-mjoculta="${k}">Ocultar</button>`:''}</figcaption></figure>`:'';
  const herr=(G.herr||[]).map(h=>{const H=HERR[h];if(!H)return '';return `<tr><td>·</td><td>${e_(H.n)}<small>${e_(H.por)}</small>${H.u?`<span class="mj-lk"><a href="${H.u}" target="_blank" rel="noopener">Descargar ↗</a></span>`:M.enlaces(H.b)}</td><td class="mj-pr">${e_(H.p)}</td></tr>`}).join('');
  const tg=n=>window.cajonTengo?window.cajonTengo(n):null;
  const mat=(G.mat||[]).map(m=>{const t=tg(m.n);return `<tr><td>${e_(m.c||1)}×</td><td>${e_(m.n)}${t?` <span class="pill ok">tienes ${t}</span>`:''}${m.por?`<small>${e_(m.por)}</small>`:''}${M.enlaces(m.b,m.pro)}</td><td class="mj-pr">${e_(m.p||'')}</td></tr>`}).join('');
  return `<section class="card mj" data-mjg="${k}"><div><h3>Guía de montaje</h3><div class="sub">${G.pasos.length} pasos · ${e_(G.tiempo||'')}${G.nivel?' · '+e_(G.nivel):''}</div></div>${img}
    ${G.intro?`<div class="catsec">${par(G.intro)}</div>`:''}
    <div class="mj-vis" data-mjv="${k}" data-i="${i}"><div class="mj-top" data-mjo="top">${P.top}</div><div class="mj-st" data-mjo="st">${P.st}</div>
      <div class="mj-nav"><button class="btn" type="button" data-mjp="-1" ${i?'':'disabled'}>◀ Anterior</button><span class="mj-dots" data-mjo="dots">${P.dots}</span><button class="btn pri" type="button" data-mjp="1" ${i<G.pasos.length-1?'':'disabled'}>Siguiente ▶</button></div>
      <div class="mj-txt" data-mjo="txt">${P.txt}</div></div>
    <div class="catsec"><h4>Materiales (todo lo que hace falta)</h4><table class="mj-tab">${mat}</table><div class="mj-tot"><span>Total orientativo</span><span>${T.a===T.b?T.a:T.a+'–'+T.b} €${T.falta?' + lo que ya tengas':''}</span></div></div>
    <div class="catsec"><h4>Herramientas</h4><table class="mj-tab">${herr}</table></div>
    <details class="catsec mj-todo"><summary><b>Ver todos los pasos seguidos (para leer o imprimir)</b></summary><ol>${G.pasos.map(p=>`<li><b>${e_(p.t)}</b>${par(p.x)}${p.ojo?`<p><b>Ojo:</b> ${e_(p.ojo)}</p>`:''}</li>`).join('')}</ol></details></section>`};

/* Cambiar de paso sin repintar la página: así la animación arranca y no se pierde la posición */
M.ir=(v,d)=>{const G=M.guia(M._it(v.dataset.mjv));if(!G)return;let i=+v.dataset.i+d;i=Math.max(0,Math.min(G.pasos.length-1,i));if(i===+v.dataset.i)return;v.dataset.i=i;
  const P=pasoHTML(G,i);for(const k of ['top','st','dots','txt'])v.querySelector(`[data-mjo="${k}"]`).innerHTML=P[k];
  v.querySelector('[data-mjp="-1"]').disabled=!i;v.querySelector('[data-mjp="1"]').disabled=i>=G.pasos.length-1;return i};
M.texto=it=>{const G=M.guia(it);if(!G||G.pro)return '';const T=M.total(G);
  return ['Materiales:',...(G.mat||[]).map(m=>`- ${m.c||1}× ${m.n}${m.p?' ('+m.p+')':''}`),`Total orientativo: ${T.a===T.b?T.a:T.a+'–'+T.b} €`,'','Herramientas:',...(G.herr||[]).map(h=>'- '+HERR[h].n)].join('\n')};

/* ---------- Registro de guías ---------- */
const GUIAS={};M.GUIAS=GUIAS;
M.add=(n,g)=>{GUIAS[n]=g};
M.guia=it=>{if(!it)return null;const g=GUIAS[it.n];if(typeof g==='function'){GUIAS[it.n]=g();return GUIAS[it.n]}if(g)return g;
  if(it.taller&&M.guiaNodo){const r=M.guiaNodo(it.taller,M.VAR_TALLER[it.n]);if(r)GUIAS[it.n]=r;return r}return null};
M.necesitaTaller=it=>!!(it&&it.taller&&!GUIAS[it.n]&&!(window.TALLER&&window.TALLER._));
})();

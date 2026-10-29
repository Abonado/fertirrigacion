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
  const mat=(G.mat||[]).map(m=>`<tr><td>${e_(m.c||1)}×</td><td>${e_(m.n)}${m.por?`<small>${e_(m.por)}</small>`:''}${M.enlaces(m.b,m.pro)}</td><td class="mj-pr">${e_(m.p||'')}</td></tr>`).join('');
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
/* Guías de los aparatos del Taller (N1–N9 y P): salen del diseño real del Taller (mismas piezas, mismos cables, misma caja).
   Necesita taller.js cargado (window.TALLER._). Primero se monta y se prueba en la mesa con cables Dupont; después, la caja y el sitio. */
(()=>{'use strict';
const M=window.MONTAJE,e_=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* Qué comprar de cada pieza del Taller */
const COMPRA={
  heltec:{p:'20–25 €',b:'Heltec WiFi LoRa 32 V3 868MHz',por:'El cerebro: lee los sensores y manda los datos por radio LoRa. Elige la de 868 MHz (Europa); trae antena de muelle y pines sin soldar.'},
  a02:{p:'15–25 €',b:'A02YYUW sensor ultrasonidos estanco',por:'Mide la distancia hasta el líquido. Es estanco (IP67) y trae 1 m de cable.'},
  cap:{p:'2–5 €',b:'sensor humedad capacitivo v1.2 TLC555',por:'Mira que lleve el chip TLC555 (no NE555). Compra 2–3: son baratos y así tienes repuesto.'},
  max3485:{p:'2–4 €',b:'módulo MAX3485 RS485 3.3V',por:'Traduce la señal RS485 del sensor a la placa (3,3 V).'},
  mt3608:{p:'1–3 €',b:'MT3608 elevador tensión',por:'Sube los 3,3–5 V de la placa a los 12 V que pide el sensor.'},
  rs485s:{p:'30–80 €',b:'sensor suelo RS485 humedad temperatura EC',por:'Pide la hoja técnica al vendedor ANTES de comprar: colores de cables, tensión y dirección Modbus.'},
  bat:{p:'6–10 €',b:'pila 18650 protegida Samsung LG',por:'De marca y protegida (con circuito). Las que prometen 9.900 mAh son falsas.'},
  carg:{p:'3–6 €',b:'CN3791 cargador solar 6V 18650',por:'Carga la pila con la placa solar aprovechando bien el sol flojo.'},
  panel:{p:'6–12 €',b:'placa solar 6V 2W',por:'2–3 W bastan para un nodo que manda cada 10 minutos.'},
  usb:{p:'8–12 €',b:'cargador USB 5V 1A con cable USB-C',por:'Para los nodos con enchufe: cargador de calidad (los muy baratos meten ruido en las lecturas).'},
  sht40:{p:'4–8 €',b:'SHT40 módulo sensor temperatura humedad',por:'Temperatura y humedad del aire, muy preciso. Va dentro de la garita.'},
  mlx:{p:'8–15 €',b:'MLX90614 GY-906 3.3V',por:'Temperatura de la hoja por infrarrojos. Compra la versión de 3,3 V (MLX90614BAA).'},
  ds18:{p:'2–4 €',b:'DS18B20 sonda sumergible',por:'Sonda de acero estanca con 1 m de cable.'},
  r47k:{p:'5–8 € el surtido',b:'kit resistencias surtido',por:'Del surtido sacas la de 4,7 kΩ (y las de 150 Ω y 10 kΩ de otros nodos).',pc:1},
  reed:{p:'15–60 €',b:'pluviómetro balancín reed',por:'Pluviómetro, anemómetro o el emisor de pulsos de tu contador (de la misma marca del contador).'},
  c100n:{p:'5–8 € el surtido',b:'kit condensadores cerámicos surtido',por:'Del surtido sacas el de 100 nF (código «104»).',pc:1},
  t420:{p:'15–40 €',b:'transductor presión 4-20mA 10 bar acero inoxidable',por:'El sensor 4–20 mA (presión, nivel por radar, radiación…). Mira la rosca de tu toma.'},
  r150:{p:'5–8 € el surtido',b:'kit resistencias 1% surtido',por:'La de 150 Ω, mejor al 1 %.',pc:1},
  scd41:{p:'25–45 €',b:'SCD41 sensor CO2',por:'CO₂ real (fotoacústico). Los «eCO2» baratos no valen.'},
  sct:{p:'6–10 €',b:'SCT-013-030',por:'La -030 (30 A, salida en voltios). Trae su jack de 3,5 mm.'},
  bias:{p:'2–3 €',b:'placa perforada pequeña',por:'Un trocito de placa perforada con dos resistencias de 10 kΩ y un condensador de 10 µF (del surtido).'}
};
const COLOR={'#d62728':'rojo','#222':'negro','#bbb':'blanco','#e6c300':'amarillo','#1f77b4':'azul','#ff7f0e':'naranja','#2ca02c':'verde','#9467bd':'morado','#17becf':'celeste','#7f8c8d':'USB','#e377c2':'rosa','#7f7f7f':'gris','#9a9a9a':'blanco'};

/* Constructor de pasos: cada paso describe la escena entera y aquí se calcula qué entra nuevo (animado) y qué se va */
function crea(){const pasos=[];let prev=new Map();const sinDe=e=>{const {de,...r}=e;return JSON.stringify(r)};
  return {pasos,paso(t,x,els,o){const cur=new Map(els.filter(Boolean).map(e=>[e.id,e])),add=[],del=[];
    for(const [id,e] of cur){const p=prev.get(id);if(!p||sinDe(p)!==sinDe(e))add.push(e)}for(const id of prev.keys())if(!cur.has(id))del.push(id);
    prev=cur;pasos.push({t,x,add,del,...(o||{})})}}}
const I=(id,ic,x,y,o,ex)=>({id,k:'i',ic,x,y,o,...(ex||{})});
const TX=(id,x,y,t,ex)=>({id,k:'t',x,y,t,...(ex||{})});
const MESA=I('mesa','mesa',10,200);

/* Caja con sus pines (para los pasos de cables) */
function cajaPines(id,titulo,pines,lado,x,y,w,col){const h=28+pines.length*20;let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#fff" stroke="${col}" stroke-width="2"/><text x="${x+8}" y="${y+16}" font-size="11" font-weight="700" fill="#15222c">${e_(titulo)}</text>`;
  const pos={};pines.forEach((p,i)=>{const py=y+34+i*20,px=lado==='d'?x+w:x;pos[p]=[px,py];
    s+=`<text x="${lado==='d'?px-8:px+8}" y="${py+4}" font-size="10.5" ${lado==='d'?'text-anchor="end"':''} fill="#15222c">${e_(p.replace('Batería JST','Bat. JST'))}</text><circle cx="${px}" cy="${py}" r="4" fill="#15222c"/>`});
  return {el:{id,k:'svg',h:s},pos,h}}

/* Instalación en su sitio de cada nodo: escena y texto */
const SITIO={
  N1:{t:'Instálalo en el depósito',x:'Sube a la tapa del depósito. Haz un agujero en la tapa con la broca escalonada justo del diámetro del cuerpo del A02YYUW (unos 3 cm), lejos de la pared (al menos 15 cm) y lejos de la boca por donde entra el agua o del agitador: si el eco rebota en la pared o en el chorro, la lectura salta.\n\nMete el sensor desde arriba con la cara redonda mirando recta al agua y fíjalo con silicona neutra o con una brida a un listón. Tiene que quedar perfectamente vertical.\n\nLa caja va al lado, en la pared o en un poste, con los prensaestopas hacia abajo y lejos de los vapores. Enchufa el cargador USB a un enchufe protegido del agua.',
    ojo:'Nunca en el depósito de ácido nítrico: los vapores se comen el sensor y la placa. Para el ácido, el sensor de radar (N7).',
    esc:()=>[I('dep','deposito',40,70,{w:120,h:140,n:.55}),I('us','ultrason',83,40,null,{de:[0,-40]}),{id:'cab1',k:'l',p:[[100,40],[100,24],[230,24],[230,60]],c:'#222'},I('caja','cajaB',200,60,{w:70,h:40}),I('ench','enchufe',300,100),TX('t1',170,200,'15 cm de la pared, vertical',{fs:9.5})]},
  N2:{t:'Instálalo en el saco',x:'Elige un saco representativo de la nave (ni el primero de la línea ni el que está junto a la puerta). Clava el sensor capacitivo en el sustrato hasta la raya que marca el fabricante (la parte de la electrónica NUNCA dentro del sustrato), entre dos goteros y siempre a la misma distancia del gotero: si un día lo cambias de sitio, las lecturas cambian.\n\nLa caja va en el poste o en el alambre de la espaldera a la altura del pecho, con los prensaestopas hacia abajo. La placa solar, por encima de la planta, mirando al sur e inclinada unos 35°: si queda a la sombra de la planta, la pila no se carga.',
    esc:()=>[I('saco','saco',40,170),I('pl1','planta',60,40,{h:130}),I('pl2','planta',120,50,{h:120}),I('got','gotero',70,150),I('cap','capacitivo',100,130,null,{de:[0,-50]}),{id:'cab1',k:'l',p:[[109,130],[109,110],[240,110],[240,128]],c:'#222'},I('poste','poste',290,20,{h:200}),I('caja','cajaB',230,128,{w:60,h:40}),I('pan','panel',260,10,null,{s:.8})]},
  N3:{t:'Instálalo en el saco',x:'Clava la sonda RS485 entera dentro del sustrato, entre dos goteros, apretando el sustrato alrededor con los dedos para que no queden huecos de aire (un hueco de aire alrededor de las varillas falsea la humedad y la CE).\n\nLa caja va en el poste con los prensaestopas hacia abajo y la placa solar arriba, al sur. Recuerda: el sensor no se conecta hasta tener su hoja técnica.',
    esc:()=>[I('saco','saco',40,170),I('pl1','planta',60,40,{h:130}),I('got','gotero',70,150),I('son','sonda',112,140,{l:40,cx:120},{de:[0,-50]}),I('poste','poste',290,20,{h:200}),I('caja','cajaB',230,110,{w:60,h:40}),I('pan','panel',260,10,null,{s:.8})]},
  N4:{t:'Instálalo en la nave',x:'Busca el centro de la nave (ni junto a la puerta ni junto a la ventana cenital) y un poste o alambre a la altura de la cabeza de la planta. Cuelga la garita y mete dentro el SHT40, sin que toque los platos: así mide el aire a la sombra.\n\nEl MLX90614 va fuera de la garita, sujeto con una brida o un soporte impreso, mirando hacia abajo a las hojas de arriba a 20–30 cm. Comprueba que en su campo de visión solo hay hojas: ni cielo, ni suelo, ni tallos, ni plástico.\n\nLa caja va en el poste con los prensaestopas hacia abajo y la placa solar arriba, al sur. Sube las garitas y el MLX a medida que crece la planta.',
    ojo:'El MLX90614 ve un cono ancho: a 30 cm mide un círculo de unos 30 cm. Si ve suelo o cielo, la temperatura de hoja sale mal y el semáforo de estrés se equivoca.',
    esc:()=>[I('pl1','planta',190,60,{h:150}),I('pl2','planta',250,70,{h:140}),I('poste','poste',100,40,{h:180}),I('gar','garita',34,90,null,{de:[-40,0]}),I('mlx','modulo',150,70,{t:'MLX90614',w:30,h:20,c:'#b03a2e',lata:1},{de:[0,-30]}),{id:'cono',k:'p',d:'M165 90L140 160L230 160z',c:'#e74c3c',f:'#e74c3c22',w:1},{id:'brazo',k:'l',p:[[110,80],[150,80]],c:'#9aa5ad',w:4},I('caja','cajaB',76,160,{w:56,h:34}),I('pan','panel',80,4,null,{s:.6,r:-10}),TX('t1',200,50,'hojas a 20–30 cm',{fs:9.5}),TX('t2',30,82,'garita',{fs:9.5})]},
  N5:{t:'Instálalo en el saco o en el depósito',x:'Para la temperatura de la raíz: clava la sonda en el saco, a media altura del sustrato (unos 5–10 cm) y lejos del gotero, para que mida el sustrato y no el agua que cae. Para la de la solución: mete la sonda en el depósito de solución o en una vaina en la tubería, siempre sumergida y a la sombra.\n\nLa caja en el poste con prensaestopas hacia abajo y la placa solar arriba, al sur.',
    esc:()=>[I('saco','saco',40,170),I('pl1','planta',60,40,{h:130}),I('got','gotero',70,150),I('son','sonda',120,150,{l:28,cx:120},{de:[0,-50]}),I('poste','poste',290,20,{h:200}),I('caja','cajaB',230,110,{w:60,h:40}),I('pan','panel',260,10,null,{s:.8})]},
  N6:{t:'Conéctalo en su sitio',x:'Lleva el cable de dos hilos del emisor de pulsos (pluviómetro, anemómetro, cazoleta de drenaje o contador) hasta la caja. Si es largo (más de 5 m), usa cable apantallado y conecta la malla a GND solo en el lado de la placa.\n\nEl pluviómetro o la cazoleta tienen que quedar perfectamente nivelados (con el nivel de burbuja), si no cuentan de más o de menos. La caja en el poste con prensaestopas hacia abajo y la placa solar arriba, al sur.',
    esc:()=>[I('pluv','pluvio',60,90,null,{de:[0,-40]}),I('poste','poste',290,20,{h:200}),{id:'cab1',k:'l',p:[[85,154],[85,180],[260,180],[260,150]],c:'#222'},I('caja','cajaB',230,110,{w:60,h:40}),I('pan','panel',260,10,null,{s:.8}),I('niv','ok',85,70)]},
  N7:{t:'Instálalo en la tubería',x:'Con la instalación SIN presión (bomba parada y grifo de purga abierto), quita el tapón de la toma o pon una T en la tubería. Envuelve la rosca del transductor con 8–10 vueltas de teflón en el sentido de la rosca y enróscalo a mano; después apriétalo con la llave inglesa sujetando por el hexágono, nunca girando por el cuerpo.\n\nAbre el agua y mira que no gotea. Lleva el cable hasta la caja (en la pared del cabezal, lejos de salpicaduras) y enchufa el cargador USB.\n\nPara los filtros: un transductor antes y otro después; la diferencia es lo sucio que está el filtro.',
    ojo:'Nunca lo aprietes girando por la carcasa: se rompe el sello y entra agua al sensor.',
    esc:()=>[I('tub','tuberia',20,150,{w:320}),I('te','te',110,148),I('tr','transductor',116,84,null,{de:[0,-40]}),I('fil','filtro',220,110),I('caja','cajaB',260,40,{w:60,h:36}),I('ench','enchufe',300,100,null,{s:.8})]},
  N8:{t:'Instálalo en la nave',x:'El SCD41 necesita respirar el aire de la nave: ponlo dentro de una garita o de una cajita con rejilla, a la altura de la planta, en el centro de la nave, lejos de puertas, de la calefacción y de donde se para la gente (al respirar le das picos de CO₂).\n\nLa caja de la placa va cerca, en el poste, y se enchufa a un enchufe protegido del agua.',
    esc:()=>[I('nave','nave',60,90,null,{s:1}),I('pl1','planta',120,110,{h:100}),I('pl2','planta',220,110,{h:100}),I('poste','poste',170,90,{h:120}),I('gar','garita',110,120,null,{s:.7,de:[-40,0]}),I('caja','cajaB',184,160,{w:50,h:30}),I('ench','enchufe',260,170,null,{s:.7})]},
  N9:{t:'Pon la pinza en el cable de la bomba',x:'Con el cuadro SIN tensión (diferencial y magnetotérmico de la bomba bajados y comprobado con el polímetro), abre la tapa del cuadro. Localiza la manguera que va a la bomba y, dentro del cuadro, UNO solo de sus cables: la fase (marrón, negro o gris). Abre la pinza, abrázala alrededor de ese único cable y ciérrala hasta oír el clic.\n\nSaca el cable de la pinza por un pasacables sin pellizcarlo y cierra el cuadro. La caja va al lado del cuadro, protegida del agua, y se enchufa con el cargador USB.',
    ojo:'Si la abrazas a la manguera entera (fase y neutro juntos) marca 0. Si no lo ves claro, que lo haga el electricista: dentro del cuadro hay 230 V o 400 V.',
    esc:()=>[I('cua','cuadro',40,60),I('pinza','pinza',58,120,null,{de:[60,0]}),I('caja','cajaB',220,90,{w:60,h:40}),{id:'cab1',k:'l',p:[[70,172],[70,200],[250,200],[250,130]],c:'#222'},I('ench','enchufe',300,140,null,{s:.8})]},
  P:{t:'Ponla junto al router',x:'La pasarela necesita wifi y enchufe: ponla en el almacén o la caseta, a ser posible alta (en una pared o una estantería alta) y sin metal alrededor, porque así la radio llega más lejos a los nodos de las naves.\n\nEnchúfala con el cargador USB y comprueba que la luz se enciende. Si los nodos más lejanos no llegan, súbela más o pon una antena externa por el agujero SMA de la caja.',
    esc:()=>[I('rou','router',40,120),I('caja','cajaB',170,100,{w:70,h:40},{de:[40,0]}),I('ant','antena',230,90,null,{r:-90,s:.6}),I('ench','enchufe',280,150,null,{s:.8})]}
};
/* Comprobaciones antes de cerrar (lo que hay que ver en el monitor serie) */
const PRUEBA={
  N1:['Sube el código y abre el monitor serie (115200 baudios): tiene que salir la distancia cada pocos segundos.','Pon una regla y un objeto plano (una tabla) a 30, 80 y 150 cm del sensor: apunta lo que marca. Si se desvía más de 1 cm, revisa que el sensor está recto.','dist: 82 cm'],
  N2:['Sube el código y mira en el monitor serie el valor «raw» del sensor.','Calibra: con el sensor al aire apunta el valor SECO; mételo en un vaso de agua hasta la raya (sin mojar la electrónica) y apunta el valor MOJADO. Pon los dos números en el código y vuelve a subirlo.','raw: 2310'],
  N3:['Con el sensor todavía sin conectar, sube el código: tiene que decir que no contesta (es normal).','Cuando tengas la hoja técnica, conecta A y B y comprueba que salen humedad, temperatura y CE. Si no contesta, cambia A por B: no se rompe nada.','sin respuesta'],
  N4:['Sube el código y mira en el monitor serie las tres medidas: temperatura del aire, humedad y temperatura de la hoja.','Compara el aire con un termómetro de confianza a la sombra y la hoja con la pistola de infrarrojos apuntando a la misma hoja. Deben coincidir en ±1 °C.','T 24.1 HR 71 hoja 22.8'],
  N5:['Sube el código: tiene que salir la temperatura de la sonda.','Mete la sonda en un vaso de agua con un termómetro de confianza al lado: deben coincidir en ±0,5 °C.','T: 18.4'],
  N6:['Sube el código y provoca pulsos a mano (vuelca la cazoleta o gira el anemómetro despacio): cada vuelco suma 1, nunca 2.','Calibra: echa 500 ml con la probeta en el pluviómetro o la cazoleta y cuenta los vuelcos; pon los ml por pulso en el código.','pulsos: 37'],
  N7:['Sube el código: sin presión tiene que marcar unos 4 mA (0,6 V en la resistencia). Si marca menos de 3,5 mA hay un cable suelto o el lazo está al revés.','Pon en el código lo que mide el sensor a 4 mA y a 20 mA (por ejemplo 0 y 10 bar). Con presión, compara con el manómetro.','4.02 mA 0.0 bar'],
  N8:['Sube el código: la primera medida tarda unos segundos.','Sácalo al aire libre 10 minutos: debe marcar unos 420 ppm. Dentro de una habitación con gente subirá a 800–1.500: es normal.','CO2: 421 ppm'],
  N9:['Sube el código con la pinza abierta y sin abrazar nada: tiene que marcar casi 0 A.','En el paso de instalación, con la bomba en marcha, apunta lo que marca y pon UMBRAL_A a la mitad de ese valor.','0.02 A'],
  P:['Sube el código del receptor y abre el monitor serie: cada vez que un nodo manda, tiene que salir una línea con su número y sus datos.','Enciende un nodo cerca y comprueba que llega; luego aléjalo hasta donde vaya a ir de verdad.','N4 > 24.1 71 22.8']
};
/* Pasos propios de algunos nodos antes de los cables */
const PREP={
  N2:[{t:'Sella la electrónica del sensor capacitivo',x:'El sensor capacitivo lleva la electrónica al aire en la parte de arriba: con la humedad del sustrato se estropea en semanas. Pinta los bordes cortados de la placa y los componentes de arriba con barniz de uñas transparente o barniz para circuitos, dos manos, y deja secar una hora entre manos.\n\nCuando esté seco, pon un trozo de termorretráctil ancho cubriendo toda la parte de arriba (desde el conector hasta la raya) y caliéntalo con la pistola de calor sin pasarte.',
    esc:[I('cap','capacitivo',150,60),{id:'tr',k:'r',x:146,y:52,w:26,h:30,f:'#2c2c2c55',c:'#2c2c2c',de:[0,-40]},TX('t1',190,90,'barniz + termorretráctil',{fs:10})]}],
  N3:[{t:'Ajusta el elevador a 12 V',x:'El MT3608 viene de fábrica con una tensión de salida que no sabes cuál es (puede pasar de 20 V y quemar el sensor). Conecta SOLO su entrada a la placa (VIN+ a Ve y VIN− a GND) y alimenta la placa por USB.\n\nPon el polímetro en voltios de continua (20 V) en la salida OUT+ y OUT−. Gira el tornillito del potenciómetro azul con el destornillador de precisión: muchas vueltas hacia la izquierda bajan la tensión. Para cuando marque 12,0 V.',
    ojo:'Hazlo SIN nada conectado a la salida. Gira despacio: hacen falta varias vueltas para que empiece a cambiar.',
    esc:[I('mt','modulo',100,90,{t:'MT3608',w:44,h:22,c:'#d35400',np:4}),I('pol','polimetro',230,60,null,{de:[40,0]}),{id:'pp',k:'l',p:[[144,100],[200,100],[226,146]],c:'#c0392b'},I('des','destorn',40,60,null,{r:20,de:[-30,0]})]},
    {t:'Deja el sensor RS485 sin conectar',x:'Este diseño está en borrador: cada fabricante de sondas RS485 usa colores de cable, tensiones y direcciones Modbus distintos. Monta y prueba todo lo demás, pero el sensor no se conecta hasta tener su hoja técnica: pídesela al vendedor y pásamela, y te digo exactamente qué cable va a cada sitio.',
    esc:[I('son','sonda',180,70,{l:60,cx:-60}),I('mal','mal',230,80),TX('t1',180,170,'esperar la hoja técnica',{ta:'m',fs:10,b:1})]}],
  N6:[{t:'Comprueba que el emisor es de contacto seco',x:'Pon el polímetro en continuidad (el símbolo del pitido) y toca los dos hilos del emisor. Vuelca la cazoleta o gira el contador despacio: el polímetro tiene que pitar y dejar de pitar. Eso es contacto seco (un interruptor), y se conecta directo.\n\nSi en vez de pitar mide tensión (5–24 V) en voltios, es una salida con tensión (open collector u otra): NO lo conectes a la placa, hace falta un optoacoplador. Pásame el modelo.',
    esc:[I('pluv','pluvio',90,60),I('pol','polimetro',230,60,null,{de:[40,0]}),{id:'pp',k:'l',p:[[115,124],[115,160],[226,160],[226,146]],c:'#222'}]}],
  N7:[{t:'Ajusta el elevador a 12 V',x:'El MT3608 viene de fábrica con una tensión de salida desconocida. Conecta SOLO su entrada a la placa (VIN+ a Ve y VIN− a GND), alimenta la placa por USB y pon el polímetro en voltios de continua en OUT+ y OUT−. Gira el potenciómetro con el destornillador de precisión hasta que marque 12,0 V.',
    ojo:'SIN el sensor conectado a la salida mientras ajustas.',
    esc:[I('mt','modulo',100,90,{t:'MT3608',w:44,h:22,c:'#d35400',np:4}),I('pol','polimetro',230,60,null,{de:[40,0]}),{id:'pp',k:'l',p:[[144,100],[200,100],[226,146]],c:'#c0392b'},I('des','destorn',40,60,null,{r:20,de:[-30,0]})]}],
  N9:[{t:'Monta la placa de polarización',x:'La pinza da una señal de corriente alterna que baja de 0 V, y la placa no puede leer tensiones negativas. Por eso se «sube» la señal a la mitad (1,65 V) con un divisor.\n\nEn un trocito de placa perforada suelda dos resistencias de 10 kΩ en serie (una detrás de otra). El punto donde se unen es el «punto medio». Suelda el condensador de 10 µF entre el punto medio y el extremo que irá a GND, con su pata negativa (la marcada con la raya) a GND. Corta las patas sobrantes con los alicates.',
    esc:[{id:'pb',k:'r',x:120,y:70,w:120,h:70,f:'#e8d5a8',c:'#a37b45',t:'placa perforada'},{id:'r1',k:'r',x:140,y:95,w:30,h:10,rx:5,f:'#d2b48c',c:'#8b5a2b',de:[0,-40]},{id:'r2',k:'r',x:180,y:95,w:30,h:10,rx:5,f:'#d2b48c',c:'#8b5a2b',de:[0,-40]},{id:'cap',k:'r',x:172,y:112,w:14,h:20,rx:6,f:'#2c3e50',c:'#1b2631',de:[0,40]},TX('t1',180,160,'punto medio = entre las dos',{ta:'m',fs:9.5})]}]
};
const EXTERIOR=['a02','cap','rs485s','panel','usb','sht40','mlx','ds18','reed','t420','scd41','sct'];

function guiaNodo(cod,v){const T=window.TALLER;if(!T||!T._)return null;const {PIEZAS,NODOS,distribuir}=T._,N=NODOS[cod];if(!N)return null;v=v||{};
  const pines={};for(const c of N.con)if(c.var)pines[c.var]=c.def;const d={nodo:cod,pines,caja:{pared:3.6,suelo:2.4,holg:3,extra:12,ranura:true,orejas:true}};
  const lbH=c=>c.a[1]==='GPIO'?'GPIO '+pines[c.var]:c.a[1],solar=!!N.solar,B=crea();
  const pinsDe=p=>{const L=[];for(const c of N.con)for(const e of [c.de,c.a]){if(!e||e[0]!==p)continue;const l=p==='heltec'&&e===c.a?lbH(c):e[1];if(!L.includes(l))L.push(l)}return L};
  /* 1 · Mesa y herramientas */
  B.paso('Prepara la mesa',`Busca una mesa con buena luz, lejos del agua y de los 230 V, y ventila (el humo del flux irrita). Pon el soldador en su soporte y caliéntalo a unos 330 °C. Ten a mano el polímetro, los alicates, el pelacables, el termorretráctil y las gafas.\n\nEste montaje se hace en dos partes. Primero se monta en la mesa con cables Dupont (sin soldar los sensores) y se prueba que todo funciona. Cuando funciona, se monta definitivo dentro de la caja.`,
    [MESA,I('sold','soldador',30,170,null,{de:[0,-30]}),I('pol','polimetro',170,110,null,{s:.9}),I('ali','alicates',250,160),I('des','destorn',260,130)]);
  /* 2 · Piezas */
  const pz=N.piezas.map((p,i)=>{const x=20+(i%3)*112,y=40+Math.floor(i/3)*80,P=PIEZAS[p];
    if(p==='heltec')return I('p-'+p,'heltec',x,y+10,null,{s:.9});if(p==='bat')return I('p-'+p,'bat',x,y+20);if(p==='panel')return I('p-'+p,'panel',x+10,y,null,{s:.8});if(p==='usb')return I('p-'+p,'enchufe',x+20,y+20,null,{s:.8});
    if(p==='mlx')return I('p-'+p,'modulo',x+10,y+10,{t:P.c,w:40,h:24,c:P.color,lata:1});if(p==='ds18')return I('p-'+p,'sonda',x+20,y+10,{l:40,cx:50});if(p==='a02')return I('p-'+p,'ultrason',x+20,y+10);
    if(p==='cap')return I('p-'+p,'capacitivo',x+20,y);if(p==='sct')return I('p-'+p,'pinza',x+20,y+10);if(p==='t420')return I('p-'+p,'transductor',x+30,y+10,null,{s:.8});
    return I('p-'+p,'modulo',x+10,y+14,{t:P.c,w:44,h:24,c:P.color})});
  N.piezas.forEach((p,i)=>{if(['heltec','mlx'].includes(p)||pz[i].ic==='modulo'||p==='panel')return;pz.push(TX('lb-'+p,20+(i%3)*112+40,40+Math.floor(i/3)*80+74,PIEZAS[p].c,{ta:'m',fs:9,b:1}))});
  B.paso('Revisa que tienes todas las piezas',`Saca todas las piezas y compruébalas con la lista de materiales:\n\n`+N.piezas.map(p=>{const C=(v.compra&&v.compra[p])||COMPRA[p]||{};return `• ${C.n||PIEZAS[p].n}. ${C.por||''}`}).join('\n')+`\n\nMira que ninguna placa tenga patas dobladas o componentes sueltos, y que la Heltec es la de 868 MHz (lo pone en la caja o en la placa).`,
    [...pz]);
  /* 3 · Pines */
  B.paso('Suelda los pines a la Heltec',`La Heltec viene con dos tiras de pines sueltas. Pínchalas en una protoboard con la parte larga hacia abajo y pon la Heltec encima: así quedan rectas mientras sueldas.\n\nSuelda primero un pin de cada extremo de cada tira, comprueba que la placa está plana y luego suelda el resto. Cada soldadura: punta del soldador tocando a la vez el pin y la arandela dorada 1–2 segundos, acerca el estaño hasta que fluya y forme un pequeño volcán brillante, retira el estaño y luego el soldador.\n\nRevisa con la lupa que no hay estaño uniendo dos pines vecinos (cortocircuito).`,
    [MESA,I('hel','heltec',130,90,{lb:0}),I('pin1','pines',133,150,null,{de:[0,40]}),I('pin2','pines',133,72,null,{de:[0,-40]}),TX('t1',178,186,'Heltec V3 (por debajo, los pines)',{ta:'m',fs:9.5}),I('sold','soldador',30,40,null,{r:25})],{ojo:'Una gota de estaño entre dos pines vecinos puede quemar la placa al enchufarla: revísalo con lupa antes de seguir.'});
  B.paso('Pon la antena',`Coge la antena de muelle que viene con la Heltec. Su cable termina en un conector diminuto (IPEX). Ponlo encima del conector dorado de la esquina de la placa, bien alineado, y aprieta con la yema del dedo hasta notar un clic. No lo fuerces de lado.\n\nA partir de ahora la placa NUNCA se enciende sin la antena puesta: la radio emite y, sin antena, se puede quemar.`,
    [MESA,I('hel','heltec',130,90,{pines:2}),I('ant','antena',160,60,null,{de:[60,-30]})],{ojo:'Nunca enchufes la Heltec sin la antena: la radio se estropea.'});
  B.paso('Prueba la placa sola',`Instala Arduino IDE en el ordenador. En Archivo → Preferencias, en «Gestor de URLs adicionales», añade la dirección de placas de Heltec (está en la web de Heltec, «Heltec ESP32 Series») y en Herramientas → Placa → Gestor de placas instala «Heltec ESP32». Elige la placa «WiFi LoRa 32(V3)».\n\nConecta la Heltec con el cable USB-C de datos y sube un ejemplo (Archivo → Ejemplos → Heltec → OLED): la pantalla tiene que encenderse. Si el ordenador no la ve, prueba otro cable: muchos son solo de carga.`,
    [MESA,I('hel','heltec',190,110,{pines:2}),I('ant','antena',220,80),I('lap','portatil',30,120,{a:'Arduino IDE',b:'> subir'},{de:[-40,0]}),{id:'usb',k:'l',p:[[120,160],[160,160],[184,132]],c:'#555',w:3}]);
  for(const p of PREP[cod]||[])B.paso(p.t,p.x,[MESA,...p.esc],p.ojo?{ojo:p.ojo}:null);
  if(solar)B.paso('Comprueba el + del conector de batería',`Antes de tocar la batería: la Heltec tiene un conector blanco pequeño (JST de 2 pines) para la batería, y los cables que vienen con los conectores a veces traen los colores al revés (rojo al −).\n\nPon el polímetro en voltios, conecta la pila al portapilas y mide en las puntas del cable del conector: si sale un número positivo con la punta roja en el cable rojo, está bien. Si sale negativo, el rojo es el −: márcalo con cinta o cambia el conector.`,
    [MESA,I('bat','bat',60,120),I('pol','polimetro',230,70,null,{de:[40,0]}),{id:'pp',k:'l',p:[[148,131],[200,131],[226,156]],c:'#c0392b'}],{ojo:'Batería al revés = Heltec quemada al momento.'});
  /* Cables: primero los sensores, después la alimentación */
  const ord=[...N.con].sort((a,b)=>{const pw=c=>['bat','carg','panel','usb'].includes(c.de[0])?1:0;return pw(a)-pw(b)});
  const n=ord.length;let hechas=[];
  ord.forEach((c,i)=>{const A=c.de[0],Bp=c.a?c.a[0]:null,izq=Bp&&Bp==='heltec'?'heltec':(Bp||'heltec'),der=Bp&&Bp==='heltec'?A:(Bp?A:A);
    const Lp=pinsDe(izq),Rp=pinsDe(der);const L=cajaPines('cL-'+izq,PIEZAS[izq].c,Lp,'d',14,0,130,PIEZAS[izq].color),R=cajaPines('cR-'+der,PIEZAS[der].c,Rp,'i',216,0,130,PIEZAS[der].color);
    const yL=Math.max(8,(222-L.h)/2),yR=Math.max(8,(222-R.h)/2);const Lb=cajaPines('cL-'+izq,PIEZAS[izq].c,Lp,'d',14,yL,130,PIEZAS[izq].color),Rb=cajaPines('cR-'+der,PIEZAS[der].c,Rp,'i',216,yR,130,PIEZAS[der].color);
    Rb.el.de=[60,0];
    const wire=(cc,k)=>{const pA=cc.a?(cc.a[0]===izq?Lb.pos[cc.a[0]==='heltec'?lbH(cc):cc.a[1]]:Rb.pos[cc.a[1]]):null,pD=cc.de[0]===der?Rb.pos[cc.de[1]]:Lb.pos[cc.de[1]];
      if(!pD)return null;const col=cc.c==='#bbb'?'#9a9a9a':cc.c;if(!cc.a)return {id:'w'+k,k:'l',p:[pD,[pD[0]-24,pD[1]]],c:col,d:'3 3',w:3};if(!pA)return null;
      const mx=158+(k%5)*10;return {id:'w'+k,k:'l',p:[pA,[mx,pA[1]],[mx,pD[1]],pD],c:col,w:3}};
    const same=hechas.filter(j=>{const o=ord[j];const ps=[o.de[0],o.a&&o.a[0]];return ps.includes(izq)&&ps.includes(der)});
    const els=[Lb.el,Rb.el,...same.map(j=>wire(ord[j],j)),wire(c,i),{id:'prog',k:'svg',h:`<text x="180" y="226" text-anchor="middle" font-size="9.5" fill="#5a6a70">conexión ${i+1} de ${n}</text>`}];
    const col=COLOR[c.c]||'',pinD=c.de[1],pinA=c.a?(c.a[0]==='heltec'?lbH(c):c.a[1]):'';
    let x;if(!c.a)x=`El cable ${col} del ${PIEZAS[A].c} (${pinD}) se queda SIN conectar. Córtalo un poco, pon un trozo de termorretráctil tapando la punta y caliéntalo: así no toca nada.${c.nota?'\n\n'+c.nota+'.':''}`;
    else if(c.de[1]==='USB-C')x=`Enchufa el cable USB-C del cargador a la Heltec. Hazlo el último, cuando todo lo demás esté conectado y revisado: así la placa no está encendida mientras conectas cables.`;
    else{const dupont=EXTERIOR.includes(A)&&!['panel','usb'].includes(A);
      x=`Cable ${col}: el pin «${pinD}» del ${PIEZAS[A].c} va al «${pinA}» de${Bp==='heltec'?' la Heltec':'l '+PIEZAS[Bp].c}.\n\n`+
      (i===0?`Para la prueba en la mesa usa cables Dupont hembra-hembra y la placa DESENCHUFADA. ${dupont?'Si el sensor trae cable con las puntas peladas, suelda a cada punta un trozo de cable Dupont macho y cúbrelo con termorretráctil.':''} Cuando todo funcione, en el montaje final cada cable se suelda y se aísla con termorretráctil.`
        :['bat','carg','panel'].includes(A)||['carg'].includes(Bp)?`Los cables de la batería, el cargador y la placa solar se sueldan directamente (los Dupont no aguantan la corriente de carga): pela 3 mm, estaña la punta, suelda y cubre con termorretráctil.`
        :`Igual que los anteriores: placa desenchufada, cable Dupont, y comprueba dos veces el pin antes de seguir.`)+(c.nota?`\n\n${c.nota}.`:'')}
    const o={};if(c.a&&c.a[1]&&/JST/.test(c.a[1]))o.ojo='Comprueba con el polímetro el + del conector antes de enchufar la batería: al revés, la placa se quema.';else if(c.v===12)o.ojo='Aquí llegan 12 V: si este cable toca un pin de la Heltec, la quema.';
    B.paso(c.a?`Conecta ${PIEZAS[A].c} ${pinD} → ${c.a[0]==='heltec'?'Heltec':PIEZAS[c.a[0]].c} ${pinA}`:`Deja sin conectar el ${col} del ${PIEZAS[A].c}`,x,els,o);hechas.push(i)});
  /* Código y prueba */
  const Pr=PRUEBA[cod]||['Sube el código y comprueba en el monitor serie que salen los datos.','',''];
  B.paso('Sube el código y prueba',`Abre la pestaña Ficha del diseño en el Taller y copia el código de partida en Arduino IDE (los pines ya vienen puestos). Instala las librerías que pide la primera línea (Programa → Incluir librería → Administrar bibliotecas). Súbelo con la flecha y abre el monitor serie a 115200 baudios.\n\n${Pr[0]}\n\n${Pr[1]}`,
    [MESA,I('hel','heltec',200,110,{pines:2}),I('ant','antena',230,80),I('lap','portatil',30,110,{a:'Arduino IDE',b:'> subir'},{de:[-40,0]}),{id:'usb',k:'l',p:[[120,150],[160,150],[194,132]],c:'#555',w:3},{id:'res',k:'svg',h:`<rect x="40" y="70" width="140" height="22" rx="4" fill="#15222c"/><text x="48" y="85" font-size="10" font-family="monospace" fill="#7dcea0">${e_(Pr[2])}</text>`,de:[0,-20]}]);
  /* Caja */
  const g=distribuir(d),esc=Math.min(170/g.Li,140/g.Wi),bx=Math.max(20,110-g.Li*esc/2),by=30;
  const caja={id:'cajaT',k:'svg',h:`<rect x="${bx-8}" y="${by-8}" width="${g.Li*esc+16}" height="${g.Wi*esc+16}" rx="10" fill="#f4f6f7" stroke="#7f8c8d" stroke-width="3"/><rect x="${bx}" y="${by}" width="${g.Li*esc}" height="${g.Wi*esc}" rx="4" fill="#fff" stroke="#bfc6cb" stroke-dasharray="4 3"/>`};
  const gx=i=>bx+(i+0.5)*g.Li*esc/N.glands.length,rx=bx+g.Li*esc+24;
  const glands=N.glands.map((k,i)=>({id:'gl'+i,k:'svg',h:`<g transform="translate(${gx(i)} ${by+g.Wi*esc+8})">${M.IC.gland()}</g><text x="${gx(i)}" y="${by+g.Wi*esc+36}" text-anchor="middle" font-size="9" font-weight="700" fill="#15222c">${i+1}</text><text x="${rx}" y="${by+20+i*16}" font-size="9.5" fill="#15222c">${i+1} · ${e_(PIEZAS[k].cable)} · ${e_(PIEZAS[k].c)}</text>`,de:[0,30]}));
  const piezasCaja=g.sit.map(s=>{const P=PIEZAS[s.p],x=bx+g.Li*esc/2+s.cx*esc-s.L*esc/2,y=by+g.Wi*esc/2+s.cy*esc-s.W*esc/2;return {id:'pc-'+s.p,k:'r',x:+x.toFixed(1),y:+y.toFixed(1),w:+(s.L*esc).toFixed(1),h:+(s.W*esc).toFixed(1),rx:3,f:P.color+'33',c:P.color,t:P.c,fs:9,de:[0,-60]}});
  B.paso('Imprime la caja',`En el Taller, abre el diseño, pestaña «Caja 3D», y descarga la base y la tapa en STL. Ábrelos en el programa de tu impresora (Cura, PrusaSlicer, Bambu Studio…).\n\nImprime en PETG si va dentro del invernadero o en ASA si va al aire libre: el PLA se deforma con el calor del invernadero. Ajustes: 4 paredes, 25 % de relleno, capa de 0,2 mm y sin soportes (la tapa con la cara plana sobre la cama).\n\nSi no tienes impresora, cualquier tienda de impresión 3D te la hace con esos dos archivos.`,
    [I('imp','impresora',140,60,null,{de:[0,-30]}),{id:'cajaI',k:'r',x:162,y:104,w:26,h:12,rx:2,f:'#ecf0f1',c:'#95a5a6'}]);
  B.paso('Pon los prensaestopas',`Los prensaestopas son los pasacables estancos. Desenrosca la tuerca de cada uno, mete el cuerpo por su agujero desde fuera (la cúpula fuera) y enrosca la tuerca por dentro apretando con la mano y un cuarto de vuelta con la llave. Van todos en la misma pared, que será la de ABAJO cuando la caja esté colgada: así el agua escurre y no entra.\n\n`+N.glands.map(k=>`• ${PIEZAS[k].cable} para el cable de ${PIEZAS[k].c} (${({PG7:'cable de 3 a 6,5 mm',PG9:'cable de 4 a 8 mm'})[PIEZAS[k].cable]||''}).`).join('\n'),
    [caja,...glands]);
  B.paso('Pasa los cables y suelda definitivo',`Ahora el montaje final. Quita los cables Dupont de la prueba. Pasa el cable de cada sensor de fuera hacia dentro por SU prensaestopas ANTES de soldar (si sueldas primero, el conector no pasa).\n\nSuelda cada cable igual que en la prueba, siguiendo el esquema: pela 3 mm, estaña la punta, suelda al pin y cubre con termorretráctil. Deja un poco de cable de sobra dentro (un par de cm) para poder abrir la tapa.\n\nAprieta las cúpulas de los prensaestopas hasta que el cable no se mueva al tirar suave.`,
    [caja,...glands,...N.glands.map((k,i)=>({id:'cw'+i,k:'l',p:[[gx(i),by+g.Wi*esc+60],[gx(i),by+g.Wi*esc-10]],c:'#222',w:3}))]);
  B.paso('Coloca las piezas dentro',`Coloca cada pieza en su sitio como en el dibujo (es la misma distribución que calcula el Taller). Fíjalas con cinta de doble cara de espuma o un punto de silicona: que no bailen ni toquen la tapa.\n\n${solar?'La pila en su portapilas, bien sujeta: es lo que más pesa. ':''}La Heltec con la antena hacia arriba o pegada a la pared de la tapa, lo más lejos posible de la batería y de los cables.`,
    [caja,...glands,...N.glands.map((k,i)=>({id:'cw'+i,k:'l',p:[[gx(i),by+g.Wi*esc+60],[gx(i),by+g.Wi*esc-10]],c:'#222',w:3})),...piezasCaja]);
  B.paso('Pon la junta y cierra',`Mete el cordón de goma de 2 mm en la ranura del borde de la base, empezando por una esquina y sin estirarlo (estirado se queda corto y no sella). Corta justo donde se juntan las dos puntas y une con una gota de pegamento instantáneo.\n\nPon la tapa y atorníllala con los 4 tornillos M3 × 12 en cruz (uno, el de enfrente, el siguiente…), apretando poco a poco hasta que la junta quede aplastada por igual. No los pases de fuerza: el plástico se rompe.`,
    [I('base','cajaB',120,120,{w:120,h:50}),I('jun','junta',122,112,{w:116},{de:[0,-30]}),I('tapa','tapa',120,60,{w:120},{de:[0,-40]}),...[0,1,2,3].map(i=>I('tor'+i,'tornillo',126+i*36,40,null,{de:[0,-30]}))]);
  const S=v.sitio||SITIO[cod];
  B.paso(S.t,S.x,S.esc(),S.ojo?{ojo:S.ojo}:null);
  B.paso('Comprueba una semana',`Durante una semana compara cada día lo que manda el aparato con lo que mides a mano (regla, termómetro, probeta, manómetro…). Si coincide, ya te puedes fiar.\n\nSi un día deja de mandar: ${solar?'mira la batería (si baja cada día, la placa solar no recibe sol o está sucia), ':''}la antena y que la pasarela tiene corriente. Cuando estés contento, márcalo como «Funcionando» en el catálogo.`,
    [I('mov','movil',150,60,{t1:N.corto,t2:Pr[2]||'OK',t3:'hace 2 min'},{de:[0,40]}),I('ok','ok',220,80)]);
  /* Materiales */
  const mat=[];for(const p of N.piezas){const C=(v.compra&&v.compra[p])||COMPRA[p]||{};mat.push({n:C.n||PIEZAS[p].n,c:1,p:C.p,b:C.b,por:C.por,pc:C.pc,pro:C.pro});if(p==='bat')mat.push({n:'Portapilas 18650 con cables',c:1,p:'1–2 €',b:'portapilas 18650 cables'});if(p==='sct')mat.push({n:'Conector jack hembra de 3,5 mm',c:1,p:'1–2 €',b:'conector jack hembra 3.5 mm pcb'})}
  const pg={};for(const k of N.glands){const g=PIEZAS[k].cable;pg[g]=(pg[g]||0)+1}
  for(const [g2,c] of Object.entries(pg))mat.push({n:`Prensaestopas ${g2} de nailon (con tuerca)`,c,p:'5–8 € el paquete',pc:1,b:`prensaestopas ${g2} nylon`});
  mat.push({n:'Cables Dupont hembra-hembra y macho-hembra (para la prueba)',c:1,p:'4–6 €',b:'cables dupont hembra hembra'},{n:'Cable de silicona 22 AWG de colores',c:1,p:'8–12 €',b:'cable silicona 22AWG colores'},
    {n:'Cordón de goma EPDM o silicona de Ø 2 mm (junta)',c:1,p:'5–8 €',b:'cordón goma EPDM 2mm'},{n:'Tornillos M3 × 12 autorroscantes',c:4,p:'3–5 € el paquete',pc:1,b:'tornillos M3x12 autorroscantes'},
    {n:'Filamento PETG o ASA (unos 60 g para la caja)',c:1,p:'2–3 €',b:'filamento PETG blanco'},{n:'Cinta de doble cara de espuma',c:1,p:'3–5 €',b:'cinta doble cara espuma'});
  if(solar)mat.push({n:'Cable con conector JST PH 2.0 de 2 pines',c:1,p:'3–5 € el paquete',pc:1,b:'cable JST PH 2.0 2 pin'});
  for(const m of v.mat||SITIO_MAT[cod]||[])mat.push(m);
  const herr=['soldador','estano','tercera','polimetro','pelacables','alicates','termo','destorn','gafas','usbc','ordenador','impresora','bridas'].concat(v.herr||SITIO_HERR[cod]||[]);
  return {tiempo:'2–3 tardes',nivel:'Dificultad media',intro:v.intro||`Diseño ${cod} del Taller: ${N.n}. Primero se monta y se prueba en la mesa; cuando funciona, se mete en su caja y se instala. Todo sale del diseño real del Taller: mismas piezas, mismos pines y misma caja.`,
    img:v.img||IMG[cod],herr,mat,pasos:B.pasos}}
const SITIO_MAT={
  N1:[{n:'Silicona neutra o brida y listón para fijar el sensor',c:1,p:'5 €',b:'silicona neutra transparente'}],
  N2:[{n:'Abrazadera o brida para el poste',c:2,p:'—'}],N3:[{n:'Abrazadera o brida para el poste',c:2,p:'—'}],
  N4:[{n:'Garita contra la radiación (comprada o impresa)',c:1,p:'15–40 €',b:'radiation shield sensor'},{n:'Cable apantallado de 4 hilos (2–3 m)',c:1,p:'3–6 €',b:'cable apantallado 4 hilos'}],
  N5:[],N6:[{n:'Cable apantallado de 2 hilos (si va lejos)',c:1,p:'3–6 €',b:'cable apantallado 2 hilos'}],
  N7:[{n:'Te de la rosca de tu tubería (si no hay toma)',c:1,p:'3–10 €',b:'te rosca 1/4 riego'}],
  N8:[{n:'Garita o cajita con rejilla para el sensor',c:1,p:'10–40 €',b:'radiation shield sensor'}],N9:[],P:[]
};
const SITIO_HERR={N1:['taladro','silicona','metro'],N2:[],N3:[],N4:['escalera'],N5:[],N6:['nivel','probeta'],N7:['llaves','teflon'],N8:[],N9:[],P:[]};
/* Imágenes realistas orientativas (generadas con IA; se ven desde su dirección y se pueden ocultar) */
const IMG={};M.IMG_TALLER=IMG;
M.guiaNodo=guiaNodo;M.util={crea,I,TX,MESA,COMPRA};
/* Variantes de las fichas que usan un diseño del Taller con un sensor concreto */
M.VAR_TALLER={};
})();
/* Guías de lo que se monta en casa sin diseño propio del Taller, y variantes de los diseños del Taller con otro sensor u otro sitio. */
(()=>{'use strict';
const M=window.MONTAJE,{crea,I,TX,MESA}=M.util;
/* Una guía a partir de pasos [título, texto, escena completa, ojo] */
M.hazGuia=g=>()=>{const B=crea();for(const p of g.pasos)B.paso(p[0],p[1],p[2],p[3]?{ojo:p[3]}:null);return {...g,pasos:B.pasos}};
const L=(id,p,c,w,ex)=>({id,k:'l',p,c,w,...(ex||{})});
const R=(id,x,y,w,h,f,c,t,ex)=>({id,k:'r',x,y,w,h,f,c,t,...(ex||{})});
const A=(id,p,ex)=>({id,k:'a',p,...(ex||{})});
const SUELO=R('suelo',0,206,360,6,'#c9b38f','#a68a5b',null,{rx:0});
M.util2={L,R,A,SUELO};

/* ---------- Variantes de los diseños del Taller ---------- */
const V=M.VAR_TALLER;
V['Radiación solar (piranómetro)']={intro:'Se monta con el diseño N7 del Taller (sensor 4–20 mA): el piranómetro hace de sensor y la placa lo lee y lo manda. Mira que el piranómetro que compres tenga salida 4–20 mA de 2 hilos; si es de 0–5 V o Modbus, dímelo y cambiamos el esquema.',
  compra:{t420:{n:'Piranómetro con salida 4–20 mA (2 hilos)',p:'60–600 €',b:'piranómetro 4-20mA',por:'Fotodiodo calibrado (barato) o termopila (profesional, más preciso). Pide su hoja técnica.'}},
  mat:[{n:'Soporte horizontal (escuadra o brazo de 30 cm)',c:1,p:'5–10 €',b:'escuadra soporte acero inoxidable'}],herr:['nivel','escalera'],
  sitio:{t:'Instala el piranómetro',x:'Decide si lo quieres dentro de la nave (lo que recibe la planta) o fuera (para comparar con lo que quita el plástico). Para regar por radiación se usa el de fuera, como hacen los invernaderos de Almería y Holanda.\n\nAtornilla un brazo o escuadra al poste, por encima de todo lo que pueda dar sombra (alambres, ventanas, la propia planta). Pon el piranómetro encima y nivélalo con el nivel de burbuja en las dos direcciones: un sensor torcido mide de más por la mañana y de menos por la tarde.\n\nLleva el cable hasta la caja (en el mismo poste, con los prensaestopas hacia abajo) y enchúfala.',
    ojo:'Ni una sombra encima en ninguna hora del día: una sombra de un cable ya falsea la suma del día.',
    esc:()=>[I('poste','poste',90,30,{h:180}),L('brazo',[[100,60],[180,60]],'#9aa5ad',5),{id:'pir',k:'svg',h:'<ellipse cx="190" cy="52" rx="16" ry="6" fill="#ecf0f1" stroke="#7f8c8d"/><path d="M174 52v8h32v-8" fill="#bdc3c7" stroke="#7f8c8d"/><ellipse cx="190" cy="46" rx="8" ry="6" fill="#d6eaf8" stroke="#2e86c1"/>',de:[0,-40]},I('niv','ok',230,48),I('sol','sol',300,30),L('cab',[[190,60],[190,140],[110,140]],'#222',2),I('caja','cajaB',40,140,{w:56,h:34}),I('ench','enchufe',30,60,null,{s:.7})]}};
V['Nivel por radar']={intro:'Se monta con el diseño N7 del Taller (sensor 4–20 mA): el radar hace de sensor. Es la opción para los depósitos de ácido, donde el ultrasonidos se estropea.',
  compra:{t420:{n:'Radar de nivel 80 GHz, salida 4–20 mA (2 hilos)',p:'150–500 €',b:'radar level sensor 80GHz 4-20mA',por:'Pide que los materiales en contacto con el vapor aguanten el ácido nítrico.'}},
  mat:[{n:'Brida o racor para la tapa (según el radar)',c:1,p:'5–15 €',b:'racor tapa depósito'}],herr:['taladro','silicona'],
  sitio:{t:'Instala el radar en el depósito',x:'Con el depósito vacío o casi vacío y ventilado (los vapores del ácido son peligrosos: guantes y gafas), haz el agujero en la tapa con la broca escalonada del diámetro de la rosca o brida del radar, lejos de la pared y de la boca de llenado.\n\nEnrosca el radar vertical, apuntando al líquido. En su configuración (botones o app del fabricante) pon la altura del depósito para que 4 mA sea vacío y 20 mA lleno.\n\nLa caja va en la pared, lejos del depósito y de los vapores.',
    ojo:'Ácido: guantes, gafas y ventilación. Nunca te asomes a la boca del depósito.',
    esc:()=>[I('dep','deposito',40,70,{w:120,h:140,n:.5}),{id:'rad',k:'svg',h:'<rect x="88" y="32" width="24" height="34" rx="4" fill="#5d6d7e"/><path d="M92 66l-6 14h28l-6-14" fill="#aab7b8"/><path d="M86 90q14 10 28 0M80 100q20 14 40 0" fill="none" stroke="#2e86c1" stroke-dasharray="3 2"/>',de:[0,-40]},L('cab',[[100,32],[100,20],[250,20],[250,70]],'#222'),I('caja','cajaB',220,70,{w:60,h:36}),I('ench','enchufe',300,120,null,{s:.8})]}};
V['Contador con salida de pulsos']={intro:'Se monta con el diseño N6 del Taller (contador de pulsos): el emisor de pulsos del contador hace de sensor. Lo primero, mira en la esfera de tu contador si admite emisor y cuántos litros vale cada pulso (lo pone: «1 imp = 10 L», por ejemplo).',
  compra:{reed:{n:'Emisor de pulsos de la marca y modelo de tu contador',p:'20–60 €',b:'emisor de pulsos contador agua',por:'Tiene que ser el de tu contador. Que sea de contacto seco (reed).'}},
  sitio:{t:'Pon el emisor en el contador',x:'El emisor se encaja o se atornilla encima de la esfera del contador, en el hueco que trae para ello (cada marca lo hace a su manera: sigue su hoja). No hace falta cortar el agua.\n\nLleva su cable hasta la caja del nodo (en la pared del cabezal, protegida del agua). En el código pon los litros por pulso que marca la esfera.\n\nCompara un día lo que suma la app con lo que avanza la esfera del contador.',
    esc:()=>[I('tub','tuberia',20,140,{w:320}),I('cont','contador',140,136),I('emi','emisor',158,120,null,{de:[0,-40]}),L('cab',[[170,120],[170,60],[250,60],[250,80]],'#222'),I('caja','cajaB',220,80,{w:60,h:36}),I('pan','panel',290,10,null,{s:.6})]}};
V['Drenaje automático en la bandeja']={intro:'Se monta con el diseño N6 del Taller (contador de pulsos) y una cazoleta basculante: cada vez que se llena con unos mililitros de drenaje, vuelca y la placa cuenta un pulso. Con el agua que entra (gotero testigo) sale el % de drenaje solo, riego a riego.',
  compra:{reed:{n:'Pluviómetro de balancín (cazoleta basculante) con contacto reed',p:'15–40 €',b:'pluviómetro balancín reed',por:'Se usa su cazoleta para el drenaje. También se puede imprimir una cazoleta en 3D y poner un imán y un reed.'}},
  mat:[{n:'Embudo de 15–20 cm y tubo para llevar el drenaje',c:1,p:'5–10 €',b:'embudo plástico 20 cm'},{n:'Rejilla o malla para que no pasen raíces',c:1,p:'2–5 €',b:'malla mosquitera'},{n:'Gotero testigo con su recipiente graduado',c:1,p:'5–10 €',b:'probeta graduada 1000 ml'}],herr:['nivel','probeta'],
  sitio:{t:'Monta la cazoleta bajo la bandeja',x:'Elige una bandeja representativa de la nave. Al final de la bandeja, donde sale el drenaje, pon el embudo con la rejilla encima (las raíces y el sustrato atascan todo) y un tubo hasta la cazoleta.\n\nLa cazoleta tiene que quedar totalmente nivelada (usa el nivel de burbuja) y protegida del agua de riego que no es drenaje. El agua que sale de la cazoleta se tira al canal.\n\nCalibra con la probeta echando 1 litro despacio, como cae el drenaje de verdad, y cuenta los vuelcos: los ml por vuelco se ponen en el código.',
    ojo:'Si el drenaje cae muy rápido la cazoleta cuenta de menos: calibra al caudal real, no echando el litro de golpe.',
    esc:()=>[I('band','bandeja',20,60,{w:200}),I('saco','saco',40,40,null,{s:.9}),I('emb','embudo',190,82,null,{de:[0,-30]}),L('tubo',[[220,122],[220,140]],'#2e86c1',4),I('caz','pluvio',198,140,null,{s:.8,de:[0,30]}),I('niv','ok',260,170),I('poste','poste',300,20,{h:190}),I('caja','cajaB',250,80,{w:50,h:30})]}};
V['Temperatura de la solución']={intro:'Se monta con el diseño N5 del Taller (sonda DS18B20). La sonda va en el depósito de solución en vez de en el saco.',
  sitio:{t:'Mete la sonda en el depósito',x:'Mete la sonda por la tapa o por el rebosadero hasta media altura del depósito, que quede siempre sumergida aunque baje el nivel. Sujeta el cable con una brida para que no se mueva y la sonda no toque el agitador ni la entrada de agua.\n\nSi el depósito está al sol, la medida de la solución te dirá cuánto se calienta en verano: por encima de unos 25–26 °C, valora sombrearlo o pintarlo de blanco.',
    esc:()=>[I('dep','deposito',40,60,{w:130,h:150,n:.7}),I('son','sonda',105,40,{l:110,cx:120},{de:[0,-40]}),I('poste','poste',290,20,{h:190}),I('caja','cajaB',230,110,{w:60,h:40}),I('pan','panel',260,10,null,{s:.8})]}};

/* ---------- Placa solar y batería para nodos ---------- */
M.add('Placa solar y batería para nodos',M.hazGuia({tiempo:'1 tarde',nivel:'Dificultad baja',img:'',
  intro:'El kit que da energía a los nodos del Taller sin enchufe: la placa solar carga una pila 18650 a través del cargador CN3791, y la pila alimenta la Heltec por su conector de batería. Es el mismo en N2, N3, N4, N5 y N6.',
  herr:['soldador','estano','polimetro','pelacables','alicates','termo','gafas','bridas'],
  mat:[{n:'Placa solar 6 V · 2–3 W',c:1,p:'6–12 €',b:'placa solar 6V 2W'},{n:'Cargador solar CN3791 (6 V)',c:1,p:'3–6 €',b:'CN3791 cargador solar 6V'},{n:'Pila 18650 protegida de marca',c:1,p:'6–10 €',b:'pila 18650 protegida Samsung LG'},{n:'Portapilas 18650 con cables',c:1,p:'1–2 €',b:'portapilas 18650 cables'},{n:'Cable con conector JST PH 2.0 de 2 pines',c:1,p:'3–5 € el paquete',pc:1,b:'cable JST PH 2.0 2 pin'},{n:'Cable de silicona 22 AWG rojo y negro',c:1,p:'5–8 €',b:'cable silicona 22AWG rojo negro'},{n:'Soporte para la placa (escuadra) y bridas UV',c:1,p:'3–6 €',b:'soporte placa solar pequeña'}],
  pasos:[
    ['Revisa las piezas','Comprueba que la placa es de 6 V (lo pone detrás), que el cargador es el CN3791 «6 V» (hay versiones de 9 y 12 V para otras placas) y que la pila es de marca y protegida (es un poco más larga que una normal porque lleva el circuito en la punta).\n\nLas pilas de «9.900 mAh» o de marcas que no conoces son falsas: tienen poca capacidad y se pueden inflar con el calor del invernadero.',
      [MESA,I('pan','panel',40,60),I('carg','modulo',160,90,{t:'CN3791',w:44,h:26,c:'#f39c12'}),I('bat','bat',230,100)]],
    ['Prueba la placa solar','Pon el polímetro en voltios de continua y mide en los cables de la placa al sol: a pleno sol tiene que dar 6–7 V sin nada conectado. Si da mucho menos, está a la sombra o es mala.\n\nApunta qué cable es el + (el que da número positivo con la punta roja del polímetro).',
      [MESA,I('pan','panel',40,60),I('sol','sol',30,30),I('pol','polimetro',220,70,null,{de:[40,0]}),L('pp',[[110,100],[200,100],[216,130]],'#c0392b')]],
    ['Suelda la placa al cargador','Pela 3 mm los cables de la placa, estáñalos y suéldalos a la entrada del cargador: + al IN+ y − al IN−. Cubre cada soldadura con termorretráctil.\n\nSi los cables de la placa son cortos, alárgalos con cable de silicona del mismo color y aísla el empalme.',
      [MESA,I('pan','panel',30,60),I('carg','modulo',200,90,{t:'CN3791',w:44,h:26,c:'#f39c12'}),L('w1',[[100,80],[150,80],[150,96],[204,96]],'#d62728',3,{}),L('w2',[[100,90],[140,90],[140,104],[204,104]],'#222',3)]],
    ['Suelda el portapilas al cargador','Los cables del portapilas van a la salida de batería del cargador: rojo al BAT+ y negro al BAT−. Antes de soldar, comprueba con el polímetro (con la pila puesta) qué cable es el + del portapilas: algunos vienen con los colores cambiados.\n\nCubre con termorretráctil. No pongas todavía la pila.',
      [MESA,I('pan','panel',30,60),I('carg','modulo',200,90,{t:'CN3791',w:44,h:26,c:'#f39c12'}),L('w1',[[100,80],[150,80],[150,96],[204,96]],'#d62728',3),L('w2',[[100,90],[140,90],[140,104],[204,104]],'#222',3),I('porta','portapilas',190,160,null,{s:.9,de:[0,30]}),L('w3',[[244,104],[280,104],[280,170],[272,170]],'#d62728',3),L('w4',[[244,110],[270,110],[270,176],[272,176]],'#222',3)],'Pila al revés en el cargador = cargador quemado y pila que se calienta. Mira el + con el polímetro.'],
    ['Prepara el cable hacia la Heltec','La Heltec se alimenta desde la pila por su conector JST pequeño. Del portapilas (o de BAT+ y BAT− del cargador) saca dos cables hasta un cable con conector JST PH 2.0.\n\nAntes de enchufarlo a la Heltec, pon la pila y mide con el polímetro en el conector: con la punta roja en el pin que irá al + de la Heltec tiene que salir unos 3,7–4,2 V positivos. Si sale negativo, el conector está al revés: cámbialo.',
      [MESA,I('porta','portapilas',40,120,null,{s:.9}),I('bat','bat',44,124,null,{s:.9,de:[0,-40]}),I('hel','heltec',220,100,{lb:0}),L('w5',[[120,130],[180,130],[180,120],[214,120]],'#d62728',3),L('w6',[[120,138],[190,138],[190,126],[214,126]],'#222',3),I('pol','polimetro',150,30,{},{s:.8})],'Batería al revés en la Heltec = placa quemada al momento.'],
    ['Pon la pila y comprueba que carga','Pon la pila en el portapilas (el + con el + marcado). Saca la placa al sol: en el cargador se enciende una luz roja mientras carga y verde (o azul) cuando está llena.\n\nCon el polímetro, la pila debe ir subiendo poco a poco hacia 4,2 V.',
      [I('pan','panel',30,40),I('sol','sol',20,20),I('carg','modulo',160,90,{t:'CN3791',w:44,h:26,c:'#f39c12'}),{id:'led',k:'svg',h:'<circle cx="196" cy="94" r="4" fill="#e74c3c"><animate attributeName="opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/></circle>',de:[0,0]},I('porta','portapilas',230,140,null,{s:.9}),I('bat','bat',234,144,null,{s:.9})]],
    ['Monta la placa al sur','La placa va fuera de la caja, por encima de la planta, mirando al SUR e inclinada unos 35–40° (en invierno el sol va bajo). Atorníllala a una escuadra en el poste y sujeta el cable con bridas UV.\n\nQue no le den sombra la cubierta, los alambres ni la planta cuando crezca: una sombra pequeña sobre la placa baja mucho la carga.',
      [I('poste','poste',150,30,{h:180}),I('pan','panel',150,10,null,{r:-35,s:.9,de:[0,-30]}),I('sol','sol',300,30),TX('t1',250,90,'al sur, 35–40°',{fs:10,b:1}),I('caja','cajaB',100,140,{w:50,h:30}),SUELO]],
    ['Vigila la batería la primera semana','La app (o el monitor serie) muestra la tensión de la pila. En una semana normal debe subir de día y bajar poco de noche. Si cada día amanece más baja, la placa no recibe suficiente sol (sombra, suciedad, mal orientada) o el nodo gasta más de la cuenta.\n\nLimpia la placa de polvo y blanqueo cada mes: sucia carga la mitad.',
      [I('mov','movil',150,60,{t1:'Batería',t2:'3,98 V',t3:'sube de día'}),I('ok','ok',220,80)]]]}));

/* ---------- Garita contra la radiación ---------- */
M.add('Garita contra la radiación',M.hazGuia({tiempo:'1 tarde (más la impresión)',nivel:'Dificultad baja',
  intro:'Una garita de platos apilados deja pasar el aire y para el sol. Puedes comprarla hecha o imprimirla. Esta guía es para imprimirla y montarla.',
  herr:['impresora','destorn','taladro','bridas'],
  mat:[{n:'Filamento PETG o ASA blanco (unos 200 g)',c:1,p:'5 €',b:'filamento ASA blanco'},{n:'Varilla roscada M5 de inox (3 trozos de 15 cm) con tuercas y arandelas',c:3,p:'4–8 € todo',pc:1,b:'varilla roscada M5 inox'},{n:'Abrazadera de poste o escuadra',c:1,p:'3–6 €',b:'abrazadera tubo'},{n:'Brida para sujetar el sensor dentro',c:1,p:'—'}],
  pasos:[
    ['Descarga e imprime los platos','Busca en Printables o Thingiverse «Stevenson screen» o «radiation shield» y elige un diseño de platos apilables con tres agujeros para varilla. Imprime 6–8 platos y la tapa en PETG o ASA BLANCO (el PLA se deforma y el color oscuro se calienta).\n\nAjustes: 3 paredes, 15 % de relleno, sin soportes.',
      [I('imp','impresora',140,50),...[0,1,2].map(i=>({id:'pl'+i,k:'svg',h:`<path d="M${230} ${150+i*10}l8-4h44l8 4z" fill="#fdfefe" stroke="#9aa4ad"/>`,de:[0,-20]}))]],
    ['Pasa las varillas por el primer plato','Corta tres trozos de varilla roscada M5 de 15 cm (con el arco de sierra). Pon la tapa boca abajo y mete las tres varillas por sus agujeros con una tuerca y arandela por dentro.',
      [I('tapa','garita',150,60,null,{s:1}),L('v1',[[160,40],[160,170]],'#7f8c8d',3,{de:[0,-40]}),L('v2',[[180,40],[180,170]],'#7f8c8d',3),L('v3',[[200,40],[200,170]],'#7f8c8d',3)]],
    ['Apila los platos con separadores','Mete los platos uno a uno por las varillas, con una tuerca o un separador de 1 cm entre cada uno: el aire tiene que pasar entre platos. Aprieta la última tuerca abajo sin deformar el plástico.',
      [L('v1',[[160,40],[160,190]],'#7f8c8d',3),L('v2',[[180,40],[180,190]],'#7f8c8d',3),L('v3',[[200,40],[200,190]],'#7f8c8d',3),I('g','garita',150,70,null,{s:1,de:[0,40]})]],
    ['Mete el sensor dentro','El sensor (termohigrómetro, SHT40 o sonda) va en el centro de la garita, sin tocar los platos. Sujétalo con una brida a una de las varillas o a un soporte del propio diseño. El cable sale por abajo.',
      [I('g','garita',150,70,null,{s:1}),R('sens',172,90,16,20,'#0e7c86','#0e7c86',null,{rx:3,de:[0,-40]}),L('cab',[[180,110],[180,200]],'#222',2)]],
    ['Cuélgala a la altura de la planta','En el centro de la nave, a la altura de la cabeza de la planta, colgada de un poste o del alambre con una abrazadera. Lejos de puertas, de la calefacción y de la cubierta.\n\nSúbela a medida que crece la planta: lo que importa es el aire que rodea las hojas.',
      [I('poste','poste',120,20,{h:190}),I('g','garita',130,70,null,{de:[30,0]}),I('pl1','planta',230,60,{h:150}),I('pl2','planta',290,70,{h:140}),SUELO]]]}));

/* ---------- Trampa casera con cámara ---------- */
M.add('Trampa casera con cámara',M.hazGuia({tiempo:'2 tardes',nivel:'Dificultad media',
  intro:'Una placa ESP32-CAM delante de una placa adhesiva hace una foto al día y la manda por wifi. La IA de la app cuenta los insectos. Necesita wifi en la nave y enchufe (o batería grande).',
  herr:['soldador','estano','polimetro','pelacables','termo','usbc','ordenador','impresora','bridas'],
  mat:[{n:'ESP32-CAM con antena externa (IPEX) y antena',c:1,p:'8–12 €',b:'ESP32-CAM antena externa'},{n:'Programador ESP32-CAM-MB (placa USB para cargarle el código)',c:1,p:'4–6 €',b:'ESP32-CAM-MB programador'},{n:'Cargador USB 5 V 2 A y cable',c:1,p:'8–10 €',b:'cargador USB 5V 2A'},{n:'Placas adhesivas amarillas (o azules para trips)',c:10,p:'8–12 € el paquete',pc:1,b:'placas adhesivas amarillas'},{n:'Caja estanca pequeña con ventana o caja impresa',c:1,p:'5–10 €',b:'caja estanca IP65 tapa transparente'},{n:'Varilla o listón para sujetar la placa a 15–20 cm',c:1,p:'2–4 €'},{n:'Tira LED blanca pequeña (5 V) para la foto',c:1,p:'3–5 €',b:'tira led USB 5V blanca'}],
  pasos:[
    ['Comprueba el wifi en la nave','Antes de comprar nada: ve con el móvil al sitio donde irá la trampa y mira que el wifi llega con al menos dos rayas. La ESP32-CAM tiene menos alcance que el móvil.\n\nSi no llega, esta trampa no funciona ahí: hace falta un punto de acceso (guía «Wifi en las naves») o la trampa comercial con 4G.',
      [I('nave','nave',60,80),I('mov','movil',160,100,{t1:'WIFI',t2:'●●○',t3:'nave 3'}),I('rou','router',20,30)]],
    ['Carga el código en la ESP32-CAM','Encaja la ESP32-CAM en el programador ESP32-CAM-MB y conéctalo al ordenador por USB. En Arduino IDE instala las placas ESP32 y elige «AI Thinker ESP32-CAM».\n\nAbre el ejemplo de cámara que te paso (hace una foto a una hora fija, la manda a la app y se duerme hasta el día siguiente) con el nombre y la contraseña de tu wifi. Súbelo.',
      [MESA,I('cam','esp32cam',220,100),R('mb',216,140,35,20,'#1d1d1d','#000','',{rx:2,de:[0,30]}),I('lap','portatil',40,110,{a:'Arduino IDE',b:'> subir'}),L('usb',[[130,150],[180,150],[214,150]],'#555',3)]],
    ['Pon la antena externa','En la ESP32-CAM hay una resistencia diminuta junto al conector de antena que elige la antena interna o la externa. Muévela a la posición de la externa (con el soldador y mucho cuidado) y enchufa la antena: mejora mucho el alcance.\n\nSi no te atreves con la resistencia, prueba primero sin antena externa: en algunas naves basta.',
      [MESA,I('cam','esp32cam',160,90,null,{s:1.4}),I('ant','antena',200,70,null,{de:[60,-30]})],'Es un componente muy pequeño: lupa, punta fina y poco calor.'],
    ['Monta la cámara frente a la placa','Imprime (o haz con un listón) un soporte que deje la cámara a 15–20 cm de la placa adhesiva, mirando de frente y centrada. Pon la tira LED alrededor de la cámara para que la foto tenga siempre la misma luz.\n\nMete la ESP32-CAM en la caja estanca, con la lente detrás de la ventana transparente.',
      [I('placa','placaAdh',40,60),L('list',[[100,180],[270,180]],'#a37b45',6),R('caja',230,90,60,50,'#ecf0f1','#7f8c8d','caja',{de:[60,0]}),I('cam','esp32cam',246,96,null,{s:.9}),A('vista',[[240,120],[110,100]]),TX('t1',170,200,'15–20 cm',{ta:'m',fs:10,b:1})]],
    ['Instala la trampa en la nave','Cuélgala a la altura del ápice de la planta (donde vuela la plaga), como una placa normal. Enchufa el cargador USB a un enchufe protegido del agua.\n\nLa primera semana cuenta tú también la placa cada día y compara con lo que dice la app. Cambia la placa adhesiva cuando esté llena o sucia.',
      [I('poste','poste',90,20,{h:190}),I('placa','placaAdh',110,50,null,{s:.8}),R('caja',180,70,50,40,'#ecf0f1','#7f8c8d','',{}),I('pl1','planta',260,50,{h:150}),SUELO,I('ench','enchufe',200,150,null,{s:.7})]]]}));

/* ---------- Robot propio para pasillos ---------- */
const RB0=[I('ch','chasis',90,120,{w:180}),I('m1','motor',90,134),I('m2','motor',236,134),I('r1','rueda',100,160),I('r2','rueda',260,160),SUELO];
const RB1=[I('bat','batgrande',140,86,{t:'LiFePO4 12 V'},{de:[0,-40]}),{id:'fus',k:'r',x:200,y:70,w:20,h:10,rx:2,f:'#f1c40f',c:'#b7950b',de:[0,-30]},{id:'sw',k:'r',x:232,y:68,w:14,h:14,rx:2,f:'#7f8c8d',c:'#566573',de:[0,-30]},{id:'seta',k:'svg',h:'<rect x="262" y="78" width="16" height="12" fill="#f1c40f"/><circle cx="270" cy="74" r="9" fill="#e74c3c" stroke="#922b21"/>',de:[0,-30]},L('w1',[[152,81],[152,60],[210,60],[210,70]],'#d62728',3),L('w2',[[220,75],[232,75]],'#d62728',3),L('w3',[[246,75],[262,75]],'#d62728',3),TX('t1',180,40,'+ → fusible → interruptor → seta',{ta:'m',fs:10,b:1})];
const RB2=[I('drv','driver',200,26,null,{de:[0,-40]}),L('ma',[[200,46],[106,46],[106,134]],'#2e86c1',2.5),L('mb',[[244,46],[256,46],[256,134]],'#2e86c1',2.5),TX('t2',112,40,'izquierda',{fs:9}),TX('t3',262,40,'derecha',{fs:9})];
const RB3=[R('caja',14,100,70,62,'#ecf0f1','#7f8c8d','',{fs:9,de:[-40,0]}),I('rpi','rpi',18,116,null,{s:.95,de:[0,-20]}),TX('t4',48,176,'caja estanca',{ta:'m',fs:9}),R('dc',40,90,30,10,'#2e86c1','#1b4f72','',{rx:2,de:[0,-20]}),TX('t5',72,98,'12→5 V',{fs:8.5})];
const RB4=[L('mast',[[300,120],[300,6]],'#aab7b8',6,{de:[0,40]}),R('cam',306,14,30,18,'#1d2329','#000','',{rx:3,de:[40,0]}),A('vista',[[340,23],[358,23]])];
M.add('Robot propio para pasillos',M.hazGuia({tiempo:'Varias semanas (por fases)',nivel:'Dificultad alta',
  intro:'Un carro de cuatro ruedas a medida de tus pasillos que lleva una cámara en un mástil y hace fotos de cada línea para la IA de la app (plagas, rugoso, conteo de frutos). Se hace por fases: primero un carro que se empuja a mano con la cámara (para validar las fotos), después con motores y mando, y por último que siga el pasillo solo. Los precios son orientativos para un prototipo; antes de comprar mide tus pasillos.',
  herr:['soldador','estano','polimetro','pelacables','alicates','termo','destorn','allen','taladro','sierra','metro','gafas','usbc','ordenador','bridas'],
  mat:[
    {n:'Chasis 4WD de aluminio con 4 motorreductores de 12 V con encoder y ruedas de 12–15 cm',c:1,p:'150–300 €',b:'chasis robot 4WD aluminio motor 12V encoder ruedas',por:'Que aguante 10–15 kg y tenga ruedas grandes para la tierra del pasillo. Mira la medida: tiene que caber en tu pasillo con 10 cm de margen a cada lado.'},
    {n:'Driver de motores doble de 10 A (Cytron MDD10A o 2× BTS7960)',c:1,p:'15–35 €',b:'Cytron MDD10A',por:'Mueve los motores; uno para el lado izquierdo y otro para el derecho.'},
    {n:'Raspberry Pi 5 (4 GB) con su fuente o alimentación por 5 V',c:1,p:'60–75 €',b:'Raspberry Pi 5 4GB',por:'El ordenador del robot: maneja la cámara, guarda las fotos y las sube.'},
    {n:'Tarjeta microSD de 64 GB (clase A2)',c:1,p:'10–15 €',b:'microSD 64GB A2'},
    {n:'Disipador con ventilador para Raspberry Pi 5',c:1,p:'5–10 €',b:'Raspberry Pi 5 active cooler'},
    {n:'Cámara Raspberry Pi Camera Module 3 Wide (gran angular)',c:1,p:'35–45 €',b:'Raspberry Pi Camera Module 3 Wide',por:'Enfoque automático y gran angular: ve la planta entera a 50–60 cm.'},
    {n:'Cable de cámara largo para Raspberry Pi 5 (50 cm)',c:1,p:'5–8 €',b:'cable cámara Raspberry Pi 5 50cm'},
    {n:'Batería LiFePO4 de 12 V 10–20 Ah',c:1,p:'60–120 €',b:'batería LiFePO4 12V 12Ah',por:'Segura (no arde como las de litio normales) y aguanta una jornada.'},
    {n:'Cargador para LiFePO4 12 V',c:1,p:'20–35 €',b:'cargador LiFePO4 12V'},
    {n:'Convertidor DC-DC de 12 V a 5 V 5 A (USB-C o bornas)',c:1,p:'10–15 €',b:'convertidor DC DC 12V 5V 5A'},
    {n:'Seta de emergencia (pulsador de paro)',c:1,p:'8–12 €',b:'seta emergencia 22mm'},
    {n:'Portafusibles de coche con fusible de 15 A',c:1,p:'4–6 €',b:'portafusibles cuchilla cable'},
    {n:'Interruptor general de 12 V (con llave o palanca)',c:1,p:'5–8 €',b:'interruptor desconectador batería 12V'},
    {n:'Cable de 1,5 mm² (16 AWG) rojo y negro y terminales',c:1,p:'10–15 €',b:'cable 16AWG rojo negro terminales'},
    {n:'Mando inalámbrico (gamepad USB o Bluetooth)',c:1,p:'15–25 €',b:'gamepad inalámbrico USB',por:'Para la fase 2: llevar el robot por el pasillo.'},
    {n:'Tubo de aluminio de 20 mm y 1,5 m (mástil) con abrazaderas',c:1,p:'10–20 €',b:'tubo aluminio 20mm',por:'Para subir la cámara a la altura de los racimos.'},
    {n:'Caja estanca para la electrónica (IP65, unos 25 × 18 × 10 cm)',c:1,p:'15–25 €',b:'caja estanca IP65 250x180'},
    {n:'Tornillería M3 y M4, separadores de nailon y bridas',c:1,p:'10–15 €',b:'kit separadores nylon M3'},
    {n:'Sensor de distancia ultrasónico estanco (A02YYUW) delante',c:1,p:'15–25 €',b:'A02YYUW',por:'Fase 3: para pararse si hay algo delante.'}],
  pasos:[
    ['Mide tus pasillos','Antes de comprar el chasis mide el ancho de los pasillos por donde irá (en el punto más estrecho: postes, tuberías de riego, ganchos), el largo de cada línea y cómo es el suelo (tierra, plástico, hormigón, piedras). Mira también las cabeceras: ahí tiene que poder girar.\n\nApúntalo: el chasis tiene que caber con 10 cm de margen a cada lado y las ruedas tienen que ser grandes si el suelo es de tierra.',
      [R('l1',40,20,30,190,'#d5f5e3','#27ae60','',{rx:2}),R('l2',290,20,30,190,'#d5f5e3','#27ae60','',{rx:2}),A('m1',[[80,120],[280,120]],{c:'#2471a3'}),A('m2',[[280,120],[80,120]],{c:'#2471a3'}),TX('t1',180,110,'ancho del pasillo',{ta:'m',fs:11,b:1}),SUELO]],
    ['Monta el chasis y los motores','Monta el chasis siguiendo sus instrucciones. Atornilla los cuatro motores en sus soportes con los ejes hacia fuera y aprieta los tornillos con fijador de roscas (con las vibraciones se aflojan).\n\nPon las ruedas en los ejes y aprieta el prisionero contra la parte plana del eje.',
      [...RB0.slice(0,1),I('m1','motor',90,134,null,{de:[0,30]}),I('m2','motor',236,134,null,{de:[0,30]}),I('r1','rueda',100,160,null,{de:[-30,0]}),I('r2','rueda',260,160,null,{de:[30,0]}),SUELO]],
    ['Pon la batería, el fusible y la seta de emergencia','La batería va lo más baja y centrada posible (es lo que más pesa). Sujétala con una cinta o un soporte atornillado al chasis.\n\nDel + de la batería: primero el portafusibles (lo más cerca posible del borne), después el interruptor general y después la seta de emergencia. Si alguien pulsa la seta, se corta TODO. Usa cable de 1,5 mm² y terminales crimpados, no empalmes con cinta.',
      [...RB0,...RB1],'Sin fusible, un cable pelado que toque el chasis puede quemar los cables y la batería.'],
    ['Conecta el driver y los motores','Atornilla el driver encima del chasis con separadores. Los dos motores del lado izquierdo van juntos (en paralelo) a la salida A del driver, y los dos del derecho a la salida B. La alimentación del driver sale de la seta de emergencia.\n\nSi al probar un lado gira al revés, cambia entre sí sus dos cables en el driver.',
      [...RB0,...RB1.filter(e=>e.id!=='t1'),...RB2]],
    ['Monta el convertidor de 5 V y la Raspberry Pi','La Raspberry Pi necesita 5 V estables y bastante corriente: el convertidor DC-DC de 12 a 5 V (5 A) se alimenta de la batería (después de la seta) y su salida va a la Raspberry por USB-C o por los pines de 5 V.\n\nMete la Raspberry con su disipador en la caja estanca, sobre separadores de nailon. Pon la tarjeta microSD con Raspberry Pi OS (Raspberry Pi Imager, gratis).',
      [...RB0,...RB1.filter(e=>e.id!=='t1'),...RB2,...RB3]],
    ['Sube el mástil y pon la cámara','Atornilla el tubo de aluminio vertical al chasis con dos abrazaderas. En lo alto, un soporte (impreso o de chapa) para la cámara mirando de lado, hacia la línea de plantas, a la altura de los racimos (normalmente 0,8–1,5 m: pon el soporte regulable).\n\nLleva el cable plano de la cámara por dentro o pegado al tubo hasta la Raspberry, sin doblarlo en ángulo.',
      [...RB0,...RB1.filter(e=>e.id!=='t1'),...RB2,...RB3,...RB4]],
    ['Fase 1: fotos empujándolo a mano','Antes de motorizar nada, empuja el carro por un pasillo con el programa de fotos (te lo paso: hace una foto cada 50 cm o cada pocos segundos y la guarda con la nave, la línea y la hora).\n\nRevisa las fotos en el ordenador: ¿se ve bien la planta y los racimos? ¿la luz es buena? Ajusta la altura y el ángulo de la cámara hasta que las fotos sirvan. Si las fotos no sirven, motorizar no arregla nada.',
      [I('pl1','planta',20,40,{h:160}),I('pl2','planta',60,50,{h:150}),I('ch','chasis',120,150,{w:150}),I('r1','rueda',130,180),I('r2','rueda',260,180),L('mast',[[240,150],[240,50]],'#aab7b8',6),R('cam',220,60,26,16,'#1d2329','#000','',{rx:3}),A('emp',[[330,120],[290,120]],{c:'#2471a3'}),TX('t1',300,108,'empujar',{fs:10,b:1}),SUELO]],
    ['Fase 2: con mando','Conecta el mando inalámbrico a la Raspberry (USB o Bluetooth) y carga el programa de control (te lo paso: el joystick mueve el carro y un botón hace foto). Prueba primero con las ruedas en el aire, después en un sitio despejado y a velocidad baja.\n\nComprueba que la seta de emergencia lo para todo al momento.',
      [...RB0,...RB1.filter(e=>e.id!=='t1'),...RB2.filter(e=>e.k!=='t'),...RB3.filter(e=>e.k!=='t'),...RB4,{id:'pad',k:'svg',h:'<rect x="100" y="0" width="60" height="30" rx="14" fill="#34495e"/><circle cx="116" cy="15" r="6" fill="#95a5a6"/><circle cx="144" cy="15" r="4" fill="#e74c3c"/>',de:[-30,0]},A('rad',[[130,32],[60,100]],{c:'#2ecc71'})],'Velocidad baja siempre que haya gente en la nave.'],
    ['Fase 3: que siga el pasillo solo','Cuando la fase 2 funcione, se añade el sensor de distancia delante (para pararse si hay algo) y el programa que lo hace avanzar por el centro del pasillo: con la cámara mirando al suelo y las dos líneas de plantas, o con una cinta en el suelo. Es la parte más difícil: la hacemos juntos con lo que veas en las fases anteriores.',
      [I('pl1','planta',20,40,{h:160}),I('pl2','planta',300,40,{h:160}),I('ch','chasis',110,150,{w:140}),I('r1','rueda',120,180),I('r2','rueda',240,180),I('us','ultrason',240,120,null,{s:.7,de:[30,0]}),L('lin',[[180,205],[180,60]],'#f1c40f',4,{d:'8 6'}),SUELO]],
    ['Las fotos a la app','Al terminar cada pasillo, el robot sube las fotos por wifi (en el almacén, si no hay wifi en las naves) a la app con su nave y su línea. La IA de incidencias las revisa y te propone lo que ve: plagas, rugoso, conteo de frutos.\n\nEsta conexión con la app está por desarrollar: cuando tengas fotos buenas de la fase 1, la hacemos.',
      [I('rou','router',40,100),I('mov','movil',200,60,{t1:'IA',t2:'3 avisos',t3:'nave 2'}),A('sub',[[110,110],[190,100]],{c:'#2ecc71'})]]]}));

/* ---------- Bandeja de pesada casera ---------- */
M.add('Bandeja de pesada (balanza de sustrato)',M.hazGuia({tiempo:'Varios fines de semana',nivel:'Dificultad alta',
  intro:'Una báscula bajo un tramo de bandeja con 4–8 plantas. Lo que pierde de peso entre riegos es el agua que consume la planta. Es el proyecto más difícil de suelo y sustrato: la mecánica tiene que ser firme y hay que corregir el crecimiento de la planta. La parte electrónica es una Heltec (como los nodos del Taller) con un amplificador HX711.',
  herr:['soldador','estano','polimetro','pelacables','alicates','termo','taladro','sierra','nivel','metro','gafas','usbc','ordenador','allen'],
  mat:[{n:'Células de carga de 50 kg (tipo media galga, juego de 4) o 2 de barra de 100 kg',c:1,p:'10–40 €',b:'célula de carga 50kg 4 unidades HX711',por:'Para 4–8 plantas con sus sacos mojados (60–120 kg en total).'},{n:'Amplificador HX711',c:1,p:'2–5 €',b:'HX711 módulo'},{n:'Heltec WiFi LoRa 32 V3 (868 MHz)',c:1,p:'20–25 €',b:'Heltec WiFi LoRa 32 V3 868MHz'},{n:'Tablero fenólico o de PVC de 15–18 mm (base y plataforma)',c:2,p:'20–40 €',b:'tablero PVC espumado 15mm'},{n:'Perfil de aluminio o tubo de acero para el bastidor',c:1,p:'15–30 €',b:'perfil aluminio 20x20'},{n:'Pesas o garrafas de agua medidas para calibrar (10–20 kg)',c:1,p:'—'},{n:'Cargador USB 5 V y caja estanca',c:1,p:'10–15 €',b:'caja estanca IP65 pequeña'},{n:'Tornillería M5 inox',c:1,p:'5–10 €',b:'tornillos M5 inox kit'}],
  pasos:[
    ['Elige el tramo y mide','Elige una línea representativa y un tramo de 4–8 plantas. Mide el largo y ancho de la bandeja y el peso aproximado: un saco de coco mojado con dos plantas pesa unos 15–25 kg. Con 4 células de 50 kg tienes margen hasta 200 kg.\n\nLa báscula tiene que quedar a la misma altura que el resto de la bandeja para que el drenaje siga funcionando.',
      [I('band','bandeja',40,100,{w:280}),I('s1','saco',60,78,null,{s:.9}),I('s2','saco',180,78,null,{s:.9}),R('tramo',50,70,260,50,'none','#e67e22','',{rx:4,sw:2.5}),TX('t1',180,150,'4–8 plantas',{ta:'m',fs:11,b:1}),SUELO]],
    ['Monta las células en la base','Las células de media galga van en las cuatro esquinas de la base, cada una sobre un taco que deje que su centro se doble (si no tiene hueco debajo, no mide). Atorníllalas o pégalas con el lado de la flecha hacia arriba.\n\nLa plataforma de arriba apoya solo en el centro de las cuatro células.',
      [R('base',60,170,240,12,'#c9a26b','#a37b45','',{rx:2}),...[0,1,2,3].map(i=>I('c'+i,'celula',62+i*62,156,null,{s:.8,de:[0,-40]})),SUELO]],
    ['Suelda las células al HX711','Las cuatro células de media galga se unen en «puente completo»: cada una tiene tres cables (rojo, negro y blanco). Se unen los negros por parejas, los blancos por parejas y los rojos salen a las entradas E+, E−, A+ y A− del HX711 (te paso el esquema exacto según el color de las tuyas, porque cambian entre fabricantes).\n\nEl HX711 va a la Heltec: VCC a Ve, GND, DT y SCK a dos GPIO libres.',
      [R('base',60,170,240,12,'#c9a26b','#a37b45','',{rx:2}),...[0,1,2,3].map(i=>I('c'+i,'celula',62+i*62,156,null,{s:.8})),I('hx','modulo',150,70,{t:'HX711',w:40,h:24,c:'#16a085',np:6},{de:[0,-30]}),I('hel','heltec',230,40,{lb:0},{s:.8}),L('w1',[[100,156],[100,110],[160,110],[160,95]],'#d62728',2),L('w2',[[290,156],[290,120],[180,120],[180,95]],'#d62728',2),L('w3',[[190,80],[230,80],[230,60]],'#1f77b4',2)]],
    ['Pon la plataforma y nivela','Pon la plataforma encima, apoyada en las cuatro células, y comprueba con el nivel que queda plana. Coloca encima el tramo de bandeja, con su drenaje conectado al resto de la línea con un tramo flexible: si el drenaje empuja o tira de la bandeja, el peso sale mal.',
      [R('base',60,170,240,12,'#c9a26b','#a37b45','',{rx:2}),...[0,1,2,3].map(i=>I('c'+i,'celula',62+i*62,156,null,{s:.8})),R('plat',56,140,248,12,'#c9a26b','#a37b45','',{rx:2,de:[0,-40]}),I('band','bandeja',70,120,{w:220}),I('niv','ok',320,130),SUELO]],
    ['Calibra con pesos conocidos','Con la bandeja vacía, pon a cero en el programa (tara). Después pon garrafas de agua de peso conocido (pésalas antes en una báscula de confianza): 10, 20 y 40 kg. El programa calcula el factor de calibración.\n\nComprueba quitando y poniendo los pesos: tiene que volver al mismo valor (±50 g).',
      [R('plat',56,140,248,12,'#c9a26b','#a37b45','',{rx:2}),R('base',60,170,240,12,'#c9a26b','#a37b45','',{rx:2}),...[0,1].map(i=>R('g'+i,120+i*70,90,40,50,'#d6eaf8','#2e86c1','10 kg',{rx:8,fs:9,de:[0,-50]})),I('lap','portatil',260,40,{a:'calibrar',b:'factor: 21.4'},{s:.8}),SUELO]],
    ['Pon las plantas y mira unos días','Coloca los sacos con sus plantas y riega como siempre. Durante una semana mira la curva: el peso sube de golpe en cada riego, baja durante el día (la planta bebe y transpira) y baja poco de noche.\n\nLa bajada entre dos riegos es el consumo de agua. Primero solo mira: cuando te fíes, se puede usar para decidir cuándo regar (por desarrollar en la app).',
      [R('plat',56,140,248,12,'#c9a26b','#a37b45','',{rx:2}),I('band','bandeja',70,120,{w:220}),I('s1','saco',80,100,null,{s:.9}),I('pl1','planta',100,10,{h:90}),I('pl2','planta',200,10,{h:90}),I('mov','movil',300,90,{t1:'Peso',t2:'−1,8 kg',t3:'desde riego'},{s:.8}),SUELO]]]}));

/* ---------- Pegatinas QR o NFC ---------- */
M.add('Pegatinas QR o NFC por nave y elemento',M.hazGuia({tiempo:'1 tarde',nivel:'Dificultad baja',
  intro:'Una pegatina en cada nave, trampa, depósito o cabezal. Al escanearla con el móvil, la app abre ese elemento para apuntar sin buscar. La generación de los códigos desde la app está por desarrollar: esta guía es para dejarlas puestas y probadas.',
  herr:['movil'],
  mat:[{n:'Pegatinas NFC NTAG215 (redondas, 25–30 mm)',c:30,p:'10–15 € el paquete',pc:1,b:'pegatinas NFC NTAG215'},{n:'Papel adhesivo de exterior o plastificadora con fundas',c:1,p:'10–20 €',b:'papel adhesivo vinilo imprimible exterior'},{n:'Bridas o tornillos para placas',c:1,p:'—'}],
  pasos:[
    ['Haz la lista de sitios','Apunta todo lo que quieres etiquetar: la puerta de cada nave, cada trampa, cada depósito, cada cabezal y sector. Un nombre corto para cada uno (por ejemplo «Finca 1 · Nave 3 · Trampa Tuta 1»).',
      [I('nave','nave',60,80),I('qr1','qr',70,170,null,{s:.7,de:[0,30]}),I('qr2','qr',190,170,null,{s:.7,de:[0,30]})]],
    ['Imprime los QR o graba las NFC','QR: la app te dará los códigos para imprimir (por desarrollar); imprímelos en papel adhesivo de exterior o plastifícalos, a un tamaño de al menos 4 × 4 cm.\n\nNFC: con el móvil y una app de grabar NFC (gratis), escribe en cada pegatina el enlace que te dé la app.',
      [I('qr','qr',120,70,null,{s:1.4}),I('mov','movil',240,60,{t1:'NFC',t2:'grabado',t3:'nave 3'})]],
    ['Pégalas donde se vean','En la puerta de cada nave, a la altura del pecho y donde no le dé el agua directa. En las trampas, en el poste. Limpia la superficie con alcohol antes de pegar.\n\nLas NFC no funcionan pegadas sobre metal: ponlas sobre plástico o con una pegatina «anti-metal».',
      [I('puerta','puerta',120,60),I('qr','qr',150,100,null,{s:.6,de:[0,-30]}),SUELO]],
    ['Prueba cada una','Recorre la finca y escanea cada pegatina: tiene que abrir el elemento correcto. Si una falla, cámbiala ya.',
      [I('qr','qr',100,80),I('mov','movil',200,60,{t1:'Nave 3',t2:'OK',t3:'trampa 1'}),I('ok','ok',260,60)]]]}));

/* ---------- Ortofoto propia ---------- */
M.add('Ortofoto propia de la finca',M.hazGuia({tiempo:'1 mañana de vuelo + procesado',nivel:'Dificultad media',
  intro:'Con un dron y un programa gratis se hace una foto aérea de la finca nítida y a escala, para ponerla de fondo en los mapas de la app. Necesitas un dron registrado y la formación A1/A3 (mira la guía «Dron con cámara»).',
  herr:['movil'],
  mat:[{n:'Dron con cámara (el de la guía «Dron con cámara»)',c:1,p:'—'},{n:'App de vuelo automático compatible con tu dron',c:1,p:'0–60 €',b:'app vuelo automático mapeo dron'},{n:'Ordenador con WebODM (gratis)',c:1,p:'Gratis',b:'WebODM'}],
  pasos:[
    ['Mira si puedes volar ahí','En ENAIRE Drones (web o app) busca tu finca: si está cerca de un aeropuerto, una base o un espacio protegido puede necesitar permiso. Mira el viento (menos de 20 km/h) y elige un día con sol alto y pocas nubes.',
      [I('dron','dron',130,60),I('ok','ok',260,80),I('sol','sol',60,40)]],
    ['Planifica el vuelo en cuadrícula','En la app de vuelo dibuja el contorno de la finca. Pon altura de 60–80 m, solape del 75 % hacia delante y del 70 % de lado, y cámara mirando recta abajo. La app calcula las pasadas.',
      [R('finca',60,40,240,150,'#d5f5e3','#27ae60','',{rx:4}),L('ruta',[[70,50],[290,50],[290,80],[70,80],[70,110],[290,110],[290,140],[70,140],[70,170],[290,170]],'#e67e22',2,{d:'5 4'})]],
    ['Vuela','Despega desde un sitio despejado, deja que haga el vuelo solo y vigila el dron todo el tiempo (es obligatorio verlo). Si las cubiertas brillan mucho, vuela con el sol más alto.',
      [R('finca',60,40,240,150,'#d5f5e3','#27ae60','',{rx:4}),I('dron','dron',160,90,null,{s:.8,de:[-60,0]})]],
    ['Procesa con WebODM','Instala WebODM (gratis) en un ordenador potente, crea una tarea, sube todas las fotos y elige «Ortofoto». Tarda de minutos a horas según el número de fotos.\n\nDescarga el resultado en GeoTIFF y pásamelo: lo ponemos de fondo en el Mapa de la finca.',
      [I('lap','portatil',130,80,null,{s:1.2}),A('a',[[60,60],[120,90]]),I('ok','ok',260,80)]]]}));
})();
/* Guías de instalación de lo que se compra hecho, y «qué pedir y qué revisar» de lo que monta un instalador o un profesional. */
(()=>{'use strict';
const M=window.MONTAJE,{I,TX,MESA}=M.util,{L,R,A,SUELO}=M.util2,G=M.hazGuia;
const pro=(texto,pedir)=>({pro:texto,pedir});

/* Pasos comunes de alta en The Things Network de un sensor LoRaWAN comprado */
const ALTA=(n)=>[
  ['Comprueba que es EU868','Mira en la caja o en la etiqueta del sensor que pone EU868 (la banda de Europa). Si pone US915 o AS923 no funcionará con tu pasarela: devuélvelo.\n\nEn la caja vienen tres códigos: DevEUI, JoinEUI (o AppEUI) y AppKey. Hazles una foto: los necesitas para darlo de alta.',
    [I('s','sensorlora',150,50),{id:'et',k:'svg',h:'<rect x="200" y="60" width="110" height="60" rx="4" fill="#fff" stroke="#999"/><text x="208" y="78" font-size="9" font-family="monospace">EU868</text><text x="208" y="92" font-size="8" font-family="monospace">DevEUI A84041…</text><text x="208" y="106" font-size="8" font-family="monospace">AppKey 8F2C…</text>',de:[40,0]}]],
  ['Dalo de alta en The Things Network',`Con la pasarela ya funcionando, entra en The Things Network desde el ordenador (console.cloud.thethings.network, región Europa). En tu aplicación pulsa «Register end device», busca la marca y el modelo (${n}) en la lista, elige la banda EU868 y copia los tres códigos de la caja.\n\nDale un nombre que diga dónde va (por ejemplo «finca1-nave3-clima»).`,
    [I('lap','portatil',40,80,{a:'TTN consola',b:'+ end device'},{s:1.3}),I('s','sensorlora',250,60),A('a',[[160,100],[240,90]],{c:'#2ecc71'})]],
  ['Enciéndelo y mira que llega','Enciende el sensor (botón o quitando la lengüeta de la pila; mira su hoja). En la consola de TTN, en «Live data», tiene que aparecer el primer mensaje en uno o dos minutos («join accept» y después datos).\n\nSi no llega: acércalo a la pasarela, revisa los códigos y que la pasarela está «conectada».',
    [I('pas','pasarela',40,80),I('s','sensorlora',250,80),A('r',[[240,100],[110,100]],{c:'#2ecc71'}),I('ok','ok',180,60)]]];

/* ---------- Clima ---------- */
M.add('Termohigrómetro con registro',G({tiempo:'15 minutos',nivel:'Dificultad baja',
  intro:'Colocar bien un termohigrómetro de mano es lo que hace que los datos de Clima y estrés sean de fiar.',herr:['bridas'],
  mat:[{n:'Termohigrómetro con memoria de máximas y mínimas',c:1,p:'15–30 €',b:'termohigrómetro máxima mínima'},{n:'Garita o caja con lamas (sombra)',c:1,p:'15–40 €',b:'radiation shield sensor'},{n:'Gancho o brida',c:1,p:'—'}],
  pasos:[
    ['Elige el sitio','En el centro de la nave, a la altura de la cabeza de la planta, lejos de puertas, ventanas cenitales y calefacción. Si vas a medir estrés en varias naves, uno por nave en el mismo sitio de cada una.',
      [I('nave','nave',60,80),R('punto',170,140,20,20,'#f5b04155','#e67e22','',{rx:10,de:[0,-30]}),I('pl1','planta',110,110,{h:90}),I('pl2','planta',220,110,{h:90})]],
    ['Ponlo a la sombra dentro de la garita','Mételo en la garita sin que toque los platos y cuélgala de un alambre o un poste. Al sol directo marca 5–6 °C de más.\n\nDéjalo 30 minutos antes de la primera lectura.',
      [I('poste','poste',130,20,{h:190}),I('g','garita',140,70),I('th','termohigro',150,74,null,{s:.5,de:[0,-40]}),I('pl1','planta',230,60,{h:150}),SUELO]],
    ['Apunta cada mañana','Cada mañana, a la misma hora, apunta en Clima y estrés la máxima, la mínima y la humedad. Después borra la memoria (botón MAX/MIN o RESET, según el modelo) para que mañana marque solo las de ese día.',
      [I('th','termohigro',90,70,null,{s:1.4}),I('mov','movil',230,60,{t1:'Clima',t2:'31/14°',t3:'HR 78%'})]]]}));

M.add('Sensor de temperatura y humedad LoRa',G({tiempo:'1 hora (con la pasarela ya puesta)',nivel:'Dificultad baja',
  intro:'Un sensor LoRaWAN de pila que manda temperatura y humedad cada 10 minutos. Necesita la pasarela LoRaWAN funcionando (mira su guía).',herr:['bridas','ordenador','movil'],
  mat:[{n:'Sensor LoRaWAN de temperatura y humedad con sonda externa, EU868 (ej. Dragino LHT65N-E31F)',c:1,p:'40–60 €',b:'Dragino LHT65N EU868'},{n:'Garita contra la radiación',c:1,p:'15–40 €',b:'radiation shield sensor'},{n:'Bridas UV',c:1,p:'—'}],
  pasos:[...ALTA('Dragino LHT65N'),
    ['Instálalo en la nave','La sonda externa va dentro de la garita, en el centro de la nave y a la altura de la planta. El cuerpo del sensor se ata al poste con bridas (no necesita sombra: lo que mide es la sonda).\n\nComprueba en TTN que sigue llegando desde ahí. Una semana comparando con el termohigrómetro de mano.',
      [I('poste','poste',120,20,{h:190}),I('s','sensorlora',90,110,null,{s:.8}),I('g','garita',130,60),I('pl1','planta',230,60,{h:150}),SUELO]]]}));

M.add('Sensor PAR (luz útil)',G({tiempo:'30 minutos por medida',nivel:'Dificultad baja',
  intro:'Con un medidor PAR de mano se mide cuánta luz útil entra en cada nave comparada con la de fuera.',herr:['nivel','movil'],
  mat:[{n:'Medidor PAR de mano (sensor cuántico) o sensor Apogee SQ con lector',c:1,p:'150–600 €',b:'medidor PAR cuántico',pro:0}],
  pasos:[
    ['Mide fuera','A mediodía de un día despejado, fuera del invernadero y lejos de sombras, sujeta el sensor horizontal (con el nivel) y apunta el valor (µmol/m²/s).',
      [I('sol','sol',60,40),I('med','medidor',160,80,{v:'1850'}),SUELO]],
    ['Mide dentro de cada nave','Enseguida (en menos de 10 minutos, para que no cambie el sol), mide dentro de cada nave a la altura de la cabeza de la planta, horizontal, en 3–4 puntos, y saca la media.',
      [I('nave','nave',40,80),I('med','medidor',150,100,{v:'1130'},{s:.9}),I('sol','sol',300,30)]],
    ['Calcula el % de luz','Divide dentro entre fuera y multiplica por 100: es el % de luz que entra. Apúntalo en Notas por nave. En otoño, si entra menos del 60–65 %, valora quitar el blanqueo.',
      [I('mov','movil',150,60,{t1:'Nave 3',t2:'61 %',t3:'de luz'})]]]}));

M.add('Humectación de hoja',G({tiempo:'1 hora',nivel:'Dificultad media',
  intro:'Una hoja artificial que dice cuándo y cuánto tiempo está mojada. Si es LoRaWAN, se da de alta como el resto; si es analógica, va a un nodo.',herr:['bridas','ordenador'],
  mat:[{n:'Sensor de humectación de hoja (LoRaWAN o analógico)',c:1,p:'80–250 €',b:'leaf wetness sensor'},{n:'Soporte o varilla y bridas',c:1,p:'3–5 €'}],
  pasos:[...ALTA('tu sensor de humectación').slice(0,1),
    ['Colócalo como una hoja','Entre las plantas, en la zona baja–media donde empieza la botritis, inclinado unos 45° y orientado como las hojas. Sujétalo a una varilla con bridas.\n\nInclinado escurre como una hoja de verdad; plano acumula agua y cuenta horas de más.',
      [I('pl1','planta',100,40,{h:170}),I('pl2','planta',220,40,{h:170}),R('hoja',150,120,50,16,'#2ecc71','#1e8449','',{rx:3,r:-30,de:[0,-40]}),L('var',[[175,136],[175,206]],'#9aa5ad',3),SUELO]],
    ['Ajusta el umbral','Mira de madrugada un día con rocío: cuando ves las hojas mojadas, el sensor tiene que marcar «mojado». Si no, ajusta el umbral en su configuración.',
      [I('mov','movil',150,60,{t1:'Hoja',t2:'mojada',t3:'5:40'})]]]}));

M.add('Estación meteorológica exterior',G({tiempo:'1 mañana',nivel:'Dificultad media',
  intro:'Una estación fuera de las naves: viento, lluvia, temperatura, humedad y radiación de tu finca.',herr:['taladro','llaves','nivel','escalera','bridas','metro'],
  mat:[{n:'Estación meteorológica (con conexión 4G, wifi o LoRaWAN)',c:1,p:'300–2.000 €',b:'estación meteorológica Davis Vantage Pro2'},{n:'Mástil galvanizado de 3–6 m con anclajes o vientos',c:1,p:'40–100 €',b:'mástil galvanizado antena'},{n:'Tacos químicos o zapata de hormigón',c:1,p:'15–30 €'}],
  pasos:[
    ['Elige el sitio','Despejado, lejos de naves y árboles (al menos 2–3 veces su altura), fácil de llegar para limpiarla y con cobertura (4G o pasarela).',
      [I('nave','nave',20,80,null,{s:.6}),A('d',[[180,190],[260,190]]),TX('t',220,182,'2–3× la altura',{ta:'m',fs:9.5}),I('est','estacion',270,60,null,{s:.9,de:[0,-30]}),SUELO]],
    ['Ancla el mástil','Haz una zapata de hormigón o ancla la base a una solera con tacos químicos. Pon el mástil totalmente vertical (nivel) y, si es alto, con tres vientos.',
      [L('mast',[[200,206],[200,30]],'#9aa5ad',6,{de:[0,40]}),R('zap',180,200,40,12,'#aab7b8','#7f8c8d','',{rx:0}),L('v1',[[200,60],[120,206]],'#999',1),L('v2',[[200,60],[280,206]],'#999',1),SUELO]],
    ['Monta los sensores','El anemómetro en lo más alto, por encima de las cubiertas. El pluviómetro nivelado y sin nada encima. La garita de temperatura a 1,5–2 m. El sensor de radiación horizontal y sin sombras. Sigue las instrucciones de cada pieza y aprieta las abrazaderas.',
      [L('mast',[[200,206],[200,30]],'#9aa5ad',6),I('an','anemo',175,30,null,{de:[0,-30]}),I('g','garita',140,110,null,{s:.8,de:[-30,0]}),I('pl','pluvio',214,120,null,{s:.8,de:[30,0]}),SUELO]],
    ['Conéctala y compara','Da de alta la estación en su app o en la pasarela (si es LoRaWAN, igual que un sensor). Compara una semana con la previsión de la app y con lo que ves (viento y lluvia).',
      [I('est','estacion',60,40,null,{s:.9}),I('mov','movil',220,60,{t1:'Fuera',t2:'18 km/h',t3:'NO'})]]]}));

M.add('Cámara térmica para el móvil',G({tiempo:'Rato de aprendizaje',nivel:'Dificultad baja',
  intro:'No se monta: se enchufa al móvil. Esta guía es para usarla bien en la finca.',herr:['movil'],
  mat:[{n:'Cámara térmica para móvil con el conector de tu móvil (USB-C o Lightning)',c:1,p:'250–450 €',b:'InfiRay P2 Pro'}],
  pasos:[
    ['Comprueba el conector','Mira qué conector tiene tu móvil (los iPhone desde el 15 y casi todos los Android: USB-C) y compra la versión que encaja. Instala la app del fabricante.',
      [I('mov','movil',140,60),R('cam',150,40,20,14,'#1d2329','#000','',{rx:3,de:[0,-30]})]],
    ['Busca plantas con estrés','A mediodía, recorre la línea: las plantas que se ven más calientes (más rojas) que las de al lado suelen tener el gotero atascado o problema de raíz. Revisa su gotero.',
      [I('pl1','planta',60,40,{h:160}),I('pl2','planta',150,40,{h:160}),I('pl3','planta',240,40,{h:160}),R('cal',230,40,60,170,'#e74c3c33','#e74c3c','',{rx:6,de:[0,0]}),SUELO]],
    ['Revisa motores y cuadros','Una bomba, un motor de ventana o un borne de cuadro mucho más caliente que el resto avisa de avería. Mira la diferencia, no el número: los metales brillantes engañan.',
      [I('cua','cuadro',120,60),R('cal',160,100,20,20,'#e74c3c55','#e74c3c','',{rx:10})]],
    ['Busca fugas al regar','Durante el riego, las manchas frías en el suelo o en un tubo son agua que se escapa.',
      [I('tub','tuberia',40,150,{w:280}),R('fr',150,140,60,40,'#3498db44','#2e86c1','',{rx:20})]]]}));

/* ---------- Suelo ---------- */
M.add('Tensiómetro',G({tiempo:'1 hora',nivel:'Dificultad baja',
  intro:'Para cultivo en suelo. Mide lo que le cuesta a la raíz sacar el agua.',herr:['metro'],
  mat:[{n:'Tensiómetro de la longitud de tu zona de raíces (30–60 cm)',c:1,p:'60–150 €',b:'tensiómetro suelo Irrometer'},{n:'Agua destilada (garrafa)',c:1,p:'2 €'},{n:'Barrena del diámetro del tubo (o tubo de acero para hacer el agujero)',c:1,p:'10–20 €',b:'barrena suelo 22 mm'}],
  pasos:[
    ['Prepara la cápsula','Mete la cápsula cerámica (la punta blanca) en agua 24 horas antes: tiene que estar empapada.',
      [R('vaso',150,100,60,80,'#d6eaf8','#2e86c1','',{rx:6}),L('tens',[[180,20],[180,170]],'#2e86c1',8,{de:[0,-40]})]],
    ['Haz el agujero y ponlo','Haz el agujero con la barrena a la profundidad de las raíces, junto a la planta y cerca del gotero. Echa barro en el fondo y mete el tensiómetro apretando: la cápsula tiene que hacer buen contacto con la tierra.',
      [R('tierra',0,120,360,100,'#c9b38f','#a68a5b','',{rx:0}),I('pl','planta',100,10,{h:110}),L('tens',[[180,40],[180,190]],'#2e86c1',8,{de:[0,-50]}),SUELO]],
    ['Llénalo y quita el aire','Llénalo de agua destilada hasta arriba, cierra el tapón y bombea con la bomba de vacío (si la trae) para quitar las burbujas. Al día siguiente ya mide bien.',
      [R('tierra',0,120,360,100,'#c9b38f','#a68a5b','',{rx:0}),L('tens',[[180,40],[180,190]],'#2e86c1',8),{id:'man',k:'svg',h:'<circle cx="180" cy="34" r="14" fill="#fff" stroke="#555" stroke-width="2"/><path d="M180 34l7-7" stroke="#c0392b" stroke-width="2"/>'}]],
    ['Lee y apunta','Lee cada día a la misma hora. En arena, riega hacia 10–20 cb; en suelos pesados algo más. Rellena de agua cuando baje el nivel y quítalo en invierno si hiela.',
      [I('mov','movil',150,60,{t1:'Suelo',t2:'18 cb',t3:'regar'})]]]}));
M.add('Oxígeno en la raíz',pro('Es instrumentación de investigación: la instala el técnico del fabricante o del centro de ensayo. Con el drenaje automático y la humedad del saco ya se ve casi lo mismo en el día a día.',['Que te dejen una sonda de prueba un mes en una nave.','Que el registrador mande los datos en un formato que la app pueda leer (CSV o Modbus).','Calibración incluida y cada cuánto hay que repetirla.']));

/* ---------- Agua ---------- */
M.add('Caudalímetro electromagnético',pro('Lo monta el fontanero o el instalador de riego: hay que cortar la tubería, poner bridas y respetar tramos rectos antes y después. La salida (pulsos o 4–20 mA) se conecta después a un nodo del Taller (N6 o N7) o al programador.',['Diámetro y caudal máximo del cabezal (para elegir el tamaño).','Tramos rectos que pide el modelo (suele ser 5 diámetros antes y 3 después).','Salida de pulsos o 4–20 mA, y que te den los litros por pulso.','Que la tubería quede siempre llena en el tramo del caudalímetro.','Toma de tierra según el fabricante.']));
M.add('CE y pH en línea',G({tiempo:'1 mañana',nivel:'Dificultad media',
  intro:'Sondas fijas que miden la CE y el pH de la solución que sale al riego. Se ponen en un by-pass para poder sacarlas sin parar el riego. Su transmisor da 4–20 mA (al nodo N7 del Taller) o Modbus.',herr:['llaves','teflon','sierra','polimetro'],
  mat:[{n:'Sonda de CE con transmisor 4–20 mA o Modbus',c:1,p:'150–600 €',b:'sonda conductividad 4-20mA',pro:1},{n:'Sonda de pH con transmisor 4–20 mA o Modbus',c:1,p:'100–400 €',b:'sonda pH 4-20mA',pro:1},{n:'Portasondas en línea o T con rosca para sonda',c:2,p:'15–40 €',b:'portasondas pH en línea'},{n:'Dos válvulas de bola y tubo para el by-pass',c:1,p:'15–30 €',b:'válvula bola PVC'},{n:'Soluciones de calibración pH 4, pH 7 y CE 1,41 / 12,88 mS/cm',c:1,p:'20–35 €',b:'solución calibración pH 4 7 conductividad'}],
  pasos:[
    ['Monta el by-pass','Con el cabezal parado y sin presión, saca de la tubería principal un pequeño ramal con una válvula a la entrada y otra a la salida. En el ramal van los dos portasondas. Así puedes cerrar las válvulas y sacar las sondas sin parar el riego.',
      [I('tub','tuberia',20,60,{w:320}),L('bp',[[80,82],[80,150],[280,150],[280,82]],'#808b96',10,{de:[0,30]}),R('v1',72,110,16,16,'#e74c3c','#922b21','',{rx:3}),R('v2',272,110,16,16,'#e74c3c','#922b21','',{rx:3})]],
    ['Calibra las sondas antes de ponerlas','Sonda de pH: lávala con agua destilada, métela en pH 7 y calibra; después en pH 4. Sonda de CE: en la solución de 1,41 mS/cm (o 12,88 si vas a medir CE alta). Sigue el menú del transmisor.',
      [MESA,R('b1',90,140,40,50,'#f9e79f','#b7950b','pH 7',{rx:4,fs:9,ta:'m'}),R('b2',160,140,40,50,'#f5b7b1','#922b21','pH 4',{rx:4,fs:9,ta:'m'}),L('son',[[180,40],[180,150]],'#555',5,{de:[0,-40]})]],
    ['Pon las sondas','Enrosca cada sonda en su portasondas con teflón, sin apretar por el cuerpo de vidrio. La sonda de pH siempre mojada: no la dejes secarse nunca.',
      [I('tub','tuberia',20,60,{w:320}),L('bp',[[80,82],[80,150],[280,150],[280,82]],'#808b96',10),L('s1',[[150,90],[150,145]],'#555',5,{de:[0,-40]}),L('s2',[[210,90],[210,145]],'#555',5,{de:[0,-40]})]],
    ['Conecta los transmisores','Si son de 4–20 mA, cada uno a un nodo N7 del Taller (o uno con dos entradas). Si son Modbus, a una pasarela Modbus. Comprueba con el medidor de mano una semana.',
      [L('s1',[[150,90],[150,145]],'#555',5),L('s2',[[210,90],[210,145]],'#555',5),L('c1',[[150,90],[150,40],[270,40]],'#222'),L('c2',[[210,90],[210,50],[270,50]],'#222'),I('caja','cajaB',270,30,{w:60,h:36})]]]}));
M.add('CE y pH del drenaje',G({tiempo:'1 tarde',nivel:'Dificultad media',
  intro:'Las mismas sondas en el drenaje de una bandeja. El truco es un vaso donde la sonda quede siempre mojada y el agua se renueve con cada drenaje.',herr:['taladro','silicona'],
  mat:[{n:'Sonda de CE y de pH con transmisor',c:1,p:'150–600 €',b:'sonda pH conductividad 4-20mA',pro:1},{n:'Vaso o tubo de PVC con rebosadero (lo puedes hacer)',c:1,p:'5–10 €'},{n:'Soluciones de calibración',c:1,p:'20–35 €',b:'solución calibración pH 4 7'}],
  pasos:[
    ['Haz el vaso de medida','Un tubo de PVC cerrado por abajo con un agujero de rebose arriba: el drenaje entra por arriba, llena el vaso y sale por el rebose. Así la sonda siempre queda sumergida y el agua se cambia con cada riego.',
      [R('vaso',150,80,60,110,'#d6eaf8','#2e86c1','',{rx:4}),A('ent',[[180,30],[180,78]]),A('reb',[[212,96],[260,96]])]],
    ['Pon las sondas y calibra','Calibra como las de línea y mete las dos sondas en el vaso. Revisa cada semana que el vaso no se ha secado ni llenado de raíces.',
      [R('vaso',150,80,60,110,'#d6eaf8','#2e86c1','',{rx:4}),L('s1',[[168,40],[168,170]],'#555',5,{de:[0,-40]}),L('s2',[[192,40],[192,170]],'#555',5,{de:[0,-40]})]]]}));
M.add('Oxígeno disuelto',pro('Primero mídelo con un medidor de mano para ver si hay problema. Si lo hay, la sonda fija la instala el proveedor en la balsa o el depósito.',['Medidor de mano para probar (alquiler o préstamo).','Sonda óptica (no de membrana): necesita menos mantenimiento.','Salida Modbus o 4–20 mA.','Cada cuánto se limpia y se cambia la tapa del sensor.']));
M.add('Nitratos (ion selectivo)',G({tiempo:'5 minutos por medida',nivel:'Dificultad baja',
  intro:'Un medidor de bolsillo: no se instala, se usa. Esta guía es para que las medidas salgan bien.',herr:['movil'],
  mat:[{n:'Medidor de nitratos de bolsillo (Horiba LAQUAtwin NO3) con soluciones de calibración',c:1,p:'300–400 €',b:'Horiba LAQUAtwin NO3'},{n:'Pipeta o cuentagotas y agua destilada',c:1,p:'5 €'}],
  pasos:[
    ['Calibra','Antes de cada tanda: limpia el sensor con agua destilada, pon unas gotas de la solución alta y calibra; después la baja. Seca con papel sin frotar.',
      [I('med','medidor',160,60,{v:'CAL'}),R('g1',100,170,30,30,'#f9e79f','#b7950b','',{rx:4}),R('g2',220,170,30,30,'#d6eaf8','#2e86c1','',{rx:4})]],
    ['Mide gotero y drenaje','Pon unas gotas del gotero en el sensor, cierra la tapa y espera a que aparezca el símbolo de estable. Lava, seca y mide el drenaje. Apunta los dos en el cuaderno.',
      [I('med','medidor',160,60,{v:'180'}),I('got','gotero',60,40)]],
    ['Guárdalo limpio','Lávalo con agua destilada, sécalo y cierra la tapa. Una vez al mes, compara con un análisis de laboratorio.',
      [I('med','medidor',160,60,{v:'OFF'}),I('ok','ok',230,90)]]]}));
M.add('Electroválvula con mando a distancia',G({tiempo:'1 mañana',nivel:'Dificultad alta',
  intro:'Una electroválvula de bajo consumo que se abre o se cierra por LoRaWAN. Empieza por un sector que no sea crítico y deja siempre el programador como seguridad.',herr:['llaves','teflon','sierra','bridas','polimetro','ordenador'],
  mat:[{n:'Electroválvula latch (de impulso) de 9–12 V del diámetro del sector',c:1,p:'30–80 €',b:'electroválvula latch 9V'},{n:'Controlador LoRaWAN de válvula (EU868)',c:1,p:'80–200 €',b:'controlador válvula LoRaWAN',pro:1},{n:'Racores y enlaces del diámetro del sector',c:2,p:'5–15 €',b:'enlace PVC presión'}],
  pasos:[
    ['Monta la electroválvula','Con el sector sin presión, corta la tubería y monta la electroválvula con sus enlaces, respetando la flecha del sentido del agua.',
      [I('tub','tuberia',20,140,{w:320}),I('val','valvula',160,140,null,{de:[0,-40]}),A('f',[[60,120],[120,120]],{c:'#2e86c1'})]],
    ['Conecta el controlador','Los dos cables del solenoide al controlador (en las latch hay polaridad: sigue su hoja). Da de alta el controlador en The Things Network.',
      [I('tub','tuberia',20,140,{w:320}),I('val','valvula',160,140),I('s','sensorlora',260,60,null,{de:[40,0]}),L('c',[[180,104],[180,90],[275,90],[275,110]],'#c0392b')]],
    ['Prueba con seguridad','Abre y cierra desde el ordenador mirando la válvula. Configura en el controlador un tiempo máximo de apertura (por si se corta la radio, que se cierre sola). El programador de riego sigue mandando como siempre.',
      [I('val','valvula',160,140),I('lap','portatil',30,40),A('r',[[130,70],[180,110]],{c:'#2ecc71'}),I('ok','ok',260,80)],'La app no debe ser lo único que decide si se riega: siempre seguridad local.']]}));

/* ---------- Planta ---------- */
M.add('Dendrómetro',G({tiempo:'1 hora',nivel:'Dificultad media',
  intro:'Un sensor que abraza el tallo y mide cuánto encoge y crece durante el día. Se pone en 2–3 plantas representativas.',herr:['bridas','destorn'],
  mat:[{n:'Dendrómetro de tallo para hortícolas',c:2,p:'200–700 €',b:'dendrómetro tallo',pro:1},{n:'Registrador o nodo LoRaWAN compatible con el dendrómetro',c:1,p:'50–200 €',b:'registrador datos dendrómetro',pro:1,por:'Lo suele vender la misma marca del dendrómetro.'}],
  pasos:[
    ['Elige el tramo de tallo','Un tramo de tallo recto, sin hojas y sin racimo, a media altura. Plantas sanas y representativas.',
      [I('pl','planta',160,20,{h:190}),R('tramo',160,90,20,30,'none','#e67e22','',{rx:4,sw:2.5})]],
    ['Colócalo sin apretar','Abre el soporte, abraza el tallo y ciérralo sin apretar (el tallo tiene que poder engordar). Sujeta el cuerpo al hilo de entutorado para que el peso no tire del tallo.',
      [I('pl','planta',160,20,{h:190}),R('den',150,92,40,26,'#5d6d7e','#2c3e50','',{rx:4,de:[40,0]})]],
    ['Mira la curva','El tallo encoge de día y recupera de noche. Si no recupera de noche, a la planta le falta agua. Recoloca el sensor cada pocas semanas al subir la planta.',
      [{id:'cur',k:'p',d:'M30 120q30-40 60 0t60 0t60 0t60 0t60 0',c:'#2e86c1',w:3}]]]}));
M.add('Flujo de savia',pro('Lo instala el técnico del fabricante: son sensores delicados que calientan el tallo y necesitan aislarse del sol. Más para ensayos que para todas las naves.',['Prueba en una nave con acompañamiento técnico.','Que los datos salgan en un formato que la app pueda leer.','Cuánto duran los sensores en tallo de tomate.']));
M.add('Cámara fija por nave',G({tiempo:'1 mañana',nivel:'Dificultad media',
  intro:'Una cámara de exterior por nave que hace fotos a horas fijas. Necesita wifi o cable de red y enchufe.',herr:['taladro','destorn','escalera','bridas','movil'],
  mat:[{n:'Cámara de exterior IP65 con wifi o PoE (ej. Reolink, TP-Link Tapo)',c:1,p:'40–60 €',b:'cámara Reolink exterior wifi'},{n:'Tarjeta microSD de 64 GB para la cámara',c:1,p:'10 €',b:'microSD 64GB'},{n:'Soporte o abrazadera de poste',c:1,p:'5–10 €',b:'soporte cámara poste abrazadera'},{n:'Alargador o caja estanca para el enchufe',c:1,p:'10–15 €',b:'caja estanca enchufe exterior'}],
  pasos:[
    ['Comprueba wifi y enchufe','Con el móvil en el sitio donde irá la cámara, mira que el wifi llega con al menos dos rayas. Busca el enchufe más cercano protegido del agua.',
      [I('nave','nave',60,80),I('mov','movil',160,100,{t1:'WIFI',t2:'●●○',t3:''})]],
    ['Fija la cámara alta','En un poste o en la estructura, alta (2,5–3 m) y mirando a lo largo de la línea, para ver muchas plantas. Que no le dé el sol de frente a ninguna hora.',
      [I('poste','poste',60,20,{h:190}),I('cam','camara',70,30,null,{de:[0,-30]}),A('v',[[126,44],[300,130]]),I('pl1','planta',200,80,{h:130}),I('pl2','planta',280,90,{h:120}),SUELO]],
    ['Configúrala','Con la app del fabricante: conéctala al wifi, pon la hora, y programa una foto una o dos veces al día con luz difusa (media mañana). La conexión de las fotos con la IA de la app está por desarrollar.',
      [I('cam','camara',80,80),I('mov','movil',220,60,{t1:'Cámara',t2:'11:00',t3:'foto diaria'})]]]}));
M.add('Cámara multiespectral',pro('Va montada en un dron y la usa el piloto. Bajo plástico apenas sirve: solo para parcelas al aire libre.',['Que el servicio entregue mapas de vigor (NDVI) por parcela.','Panel de calibración en cada vuelo.','Precio por hectárea y vuelo.']));
M.add('Clorofilómetro (SPAD)',G({tiempo:'15 minutos por nave',nivel:'Dificultad baja',
  intro:'Una pinza que se pone en la hoja: no se instala, se usa. Lo importante es medir siempre igual.',herr:['movil'],
  mat:[{n:'Clorofilómetro (atLEAF o Konica Minolta SPAD-502)',c:1,p:'200–2.500 €',b:'atLEAF clorofilómetro'}],
  pasos:[
    ['Elige la hoja','Siempre la misma: la última hoja completamente desarrollada, en el folíolo del medio, sin nervios gordos.',
      [I('pl','planta',160,20,{h:190}),R('h',176,46,30,16,'none','#e67e22','',{rx:6,sw:2.5})]],
    ['Mide 20–30 plantas','Pinza la hoja con el aparato hasta que pite y apunta el número. Repite en 20–30 plantas repartidas por la nave (no solo las de la entrada) y saca la media. Mide a la misma hora cada vez, con las hojas secas.',
      [I('pl','planta',120,20,{h:190}),R('pinza',150,40,50,24,'#2c3e50','#1b2631','',{rx:6,de:[40,0]})]],
    ['Compara naves y semanas','Apunta la media en Notas por nave. Lo que vale es comparar naves y semanas medidas igual, no un número suelto.',
      [I('mov','movil',150,60,{t1:'SPAD',t2:'48,2',t3:'nave 3'})]]]}));
M.add('Refractómetro (grados Brix)',G({tiempo:'10 minutos',nivel:'Dificultad baja',
  intro:'Una gota de zumo y te da los grados Brix: no se instala, se usa.',herr:['movil'],
  mat:[{n:'Refractómetro digital Brix (0–32 %)',c:1,p:'20–300 €',b:'refractómetro digital Brix'},{n:'Agua destilada',c:1,p:'2 €'}],
  pasos:[
    ['Pon a cero','Pon unas gotas de agua destilada en el prisma (la ventanita donde va la muestra), espera unos segundos a que coja temperatura y pulsa el botón de cero. Seca el prisma con papel suave sin rayarlo.',[I('ref','refracto',140,90)]],
    ['Mide varios tomates','Exprime una gota de 5–10 tomates del mismo punto de color de la misma nave, uno a uno, y apunta la media. Lava y seca entre medidas.',[I('ref','refracto',140,90),{id:'tom',k:'svg',h:'<circle cx="250" cy="70" r="16" fill="#d63a2f"/>',de:[40,0]}]],
    ['Apunta','Apunta la media en Notas o en el parte, por nave y por semana, junto con el color del tomate que mediste. Así ves si sube o baja con el riego, el abono o la época.',[I('mov','movil',150,60,{t1:'Brix',t2:'6,2',t3:'nave 3'})]]]}));
M.add('Contador de frutos por visión',pro('Es desarrollo dentro de la app con fotos sistemáticas (carro, robot propio o a mano). Se hace por fases, igual que el robot.',['Fotos de una línea por nave cada semana desde el mismo sitio.','Los kilos reales por nave para comparar.','Paciencia: las primeras semanas cuenta de menos.']));

/* ---------- Plagas ---------- */
M.add('Trampas de feromona y placas de colores',G({tiempo:'1 mañana',nivel:'Dificultad baja',
  intro:'Colocarlas bien y contarlas siempre igual es lo que hace que la vista Plagas dé fechas buenas.',herr:['bridas'],
  mat:[{n:'Trampa delta o de agua con feromona de Tuta absoluta',c:2,p:'5–15 € cada una',b:'feromona Tuta absoluta trampa delta'},{n:'Placas adhesivas amarillas (mosca blanca, pulgón)',c:10,p:'8–12 € el paquete',pc:1,b:'placas adhesivas amarillas'},{n:'Placas adhesivas azules (trips)',c:10,p:'8–12 € el paquete',pc:1,b:'placas adhesivas azules trips'},{n:'Rotulador permanente',c:1,p:'2 €'}],
  pasos:[
    ['Monta la trampa de feromona','Abre la trampa delta, pon la placa adhesiva en el fondo y el difusor de feromona en el centro, encima de la placa. Toca la feromona con guantes o pinzas: con los dedos se contamina.',
      [I('tr','trampa',150,90),R('fer',175,110,10,10,'#e67e22','#a04000','',{rx:5,de:[0,-40]})]],
    ['Cuélgalas','1–2 trampas de feromona por nave, a la altura de la planta, lejos de las puertas. Las placas de colores a la altura del ápice, subiéndolas con el cultivo, unas 1–2 por cada 500 m² para vigilar.',
      [I('pl1','planta',100,30,{h:180}),I('pl2','planta',260,30,{h:180}),I('tr','trampa',150,90,null,{de:[0,-40]}),I('pa','placaAdh',210,40,null,{s:.6,de:[0,-40]}),SUELO]],
    ['Cuenta cada semana','El mismo día de la semana, cuenta las capturas de cada trampa y apúntalas en Plagas. Marca con rotulador las ya contadas o cambia la placa. Cambia la feromona cada 4–6 semanas.',
      [I('pa','placaAdh',80,60),I('mov','movil',220,60,{t1:'Plagas',t2:'12',t3:'Tuta nave 3'})]]]}));
M.add('Trampa inteligente con cámara',G({tiempo:'1 hora',nivel:'Dificultad baja',
  intro:'Una trampa comercial con cámara, placa solar y 4G. Lo importante es elegir el modelo que cuente tu plaga.',herr:['bridas','movil'],
  mat:[{n:'Trampa inteligente (Metos iScout, Trapview, Topraq…) con su suscripción',c:1,p:'1.500–2.700 € con suscripción',b:'trampa inteligente cámara insectos',pro:1}],
  pasos:[
    ['Pregunta antes de comprar','Pide al fabricante que confirme que su modelo cuenta Tuta absoluta en tomate, y pide una prueba de un mes.',
      [I('tr','trampa',140,80)]],
    ['Colócala','En la nave con más presión de plaga, como una trampa normal, con la placa solar al sur. Comprueba en su app que llegan las fotos.',
      [I('poste','poste',160,20,{h:190}),I('tr','trampa',130,80,null,{de:[0,-40]}),I('pan','panel',170,10,null,{s:.6}),SUELO]],
    ['Compara dos semanas','Cuenta tú la placa dos semanas y compara con su conteo. Si coincide, mete su dato en Plagas.',
      [I('mov','movil',150,60,{t1:'Trampa',t2:'14',t3:'hoy'})]]]}));
M.add('Captador de esporas',pro('Lo instala el proveedor del servicio, que también analiza las muestras. Solo compensa con un problema serio y repetido de hongos.',['Plazo entre la muestra y el resultado (si tarda días, no sirve para decidir tratamientos).','Precio por análisis.']));

/* ---------- Robots ---------- */
const ROBOT=n=>pro(`Lo pone en marcha el fabricante: ${n} se vende con instalación y formación. Antes de nada, una demostración en tu finca.`,['Demostración en una nave tuya, no en la suya.','Que funcione en tus pasillos, tus cabeceras y tu suelo (mide antes).','Coste por hectárea y año, mantenimiento incluido.','Qué datos da y si se pueden pasar a la app.']);
M.add('Carro o robot de vigilancia',ROBOT('el carro de vigilancia'));
M.add('Carro de pulverización autónomo',ROBOT('el carro de pulverización (además, con su inspección ITEAF)'));
M.add('Robot con luz UV-C',ROBOT('el robot UV-C'));
M.add('Carro que sigue al operario',ROBOT('el carro'));

/* ---------- Drones ---------- */
M.add('Dron con cámara',G({tiempo:'1 semana (papeles) + práctica',nivel:'Dificultad baja',
  intro:'No se monta: se pone en regla y se aprende a volar. En España, cualquier dron con cámara obliga a registrarse como operador.',herr:['movil'],
  mat:[{n:'Dron con cámara (DJI Mini o Air)',c:1,p:'400–2.000 €',b:'DJI Mini 4 Pro'},{n:'Baterías de repuesto (2)',c:2,p:'40–80 € cada una',b:'batería DJI Mini'},{n:'Seguro de responsabilidad civil para drones',c:1,p:'30–80 € al año',b:'seguro responsabilidad civil drones'}],
  pasos:[
    ['Regístrate en AESA','En la sede electrónica de AESA (con certificado digital o Cl@ve) regístrate como operador de UAS. Te dan un número de operador que hay que pegar en el dron.',
      [I('lap','portatil',120,80,null,{s:1.3}),R('n',230,60,80,30,'#fff','#555','ESP-RZ…',{fs:9})]],
    ['Haz la formación A1/A3','En la misma web de AESA, curso y examen online gratis de la categoría abierta A1/A3. Guarda el certificado.',
      [I('lap','portatil',120,80,null,{s:1.3}),I('ok','ok',260,80)]],
    ['Contrata el seguro','Un seguro de responsabilidad civil para drones (también para uso profesional si lo usas en la empresa).',
      [R('doc',140,50,80,110,'#fff','#555','Seguro RC',{fs:10})]],
    ['Antes de cada vuelo','Mira en ENAIRE Drones si tu finca está en zona restringida, el viento y la batería. Vuela siempre viendo el dron y sin pasar por encima de gente.',
      [I('dron','dron',130,60,null,{de:[0,30]}),I('mov','movil',260,90,{t1:'ENAIRE',t2:'OK',t3:'zona libre'},{s:.8}),SUELO]]]}));
M.add('Dron multiespectral',pro('Lo usa un piloto con el registro y la formación de AESA (mira la guía «Dron con cámara»). Para parcelas al aire libre: bajo plástico no ve el cultivo.',['Formación A2 si vas a volar cerca de gente.','Programa de procesado de los mapas.','Panel de calibración.']));
M.add('Dron térmico',pro('Igual que el dron con cámara, pero con cámara térmica. Para fallos de riego y fugas al aire libre, y placas solares.',['Formación y registro AESA.','Volar a mediodía (estrés) o de madrugada (fugas).']));
M.add('Foto aérea oficial (PNOA)',pro('No hay que montar nada: se descarga gratis del Centro de Descargas del CNIG y se pone de fondo en los mapas de la app (por desarrollar).',['Citar la fuente: «PNOA cedido por © Instituto Geográfico Nacional».']));

/* ---------- Red ---------- */
M.add('Pasarela LoRaWAN 4G',G({tiempo:'1 mañana',nivel:'Dificultad media',
  intro:'La antena central que recibe todos los sensores LoRa y los manda a internet por 4G. Es la pieza base: sin ella no llega nada.',herr:['taladro','destorn','escalera','bridas','ordenador','movil'],
  mat:[{n:'Pasarela LoRaWAN EU868 con 4G (ej. Dragino LPS8N con 4G)',c:1,p:'175–220 €',b:'Dragino LPS8N 4G EU868'},{n:'SIM de datos sin PIN',c:1,p:'3–5 € al mes',b:'SIM datos IoT'},{n:'Antena exterior 868 MHz con cable (si va dentro de un almacén)',c:1,p:'20–40 €',b:'antena 868 MHz exterior cable SMA'},{n:'Caja estanca o sitio a cubierto y enchufe',c:1,p:'10–20 €',b:'caja estanca IP65 250x180'}],
  pasos:[
    ['Quita el PIN de la SIM','Mete la SIM en un móvil, entra en ajustes y quita el PIN. La pasarela no sabe escribir el PIN: si lo tiene, no conecta.',
      [I('sim','sim',140,90,null,{s:1.4}),I('mov','movil',220,60,{t1:'SIM',t2:'sin PIN',t3:''})]],
    ['Mete la SIM y la antena','Con la pasarela desenchufada, mete la SIM en su ranura (mira el dibujo de la tapa) y enrosca la antena LoRa y la de 4G en sus conectores.',
      [I('pas','pasarela',150,90),I('sim','sim',230,110,null,{de:[40,0]})]],
    ['Elige el sitio','Alto y céntrico en la finca (la caseta del cabezal o el almacén), a cubierto y con enchufe. Si va dentro de un almacén de chapa, la antena tiene que ir fuera: el metal no deja salir la señal.',
      [I('nave','nave',20,80,null,{s:.6}),I('pas','pasarela',220,60,null,{de:[0,-30]}),L('ant',[[248,26],[248,6]],'#333',3),SUELO]],
    ['Configúrala','Enciéndela, conéctate a su wifi de configuración con el ordenador y entra en su página (dirección y contraseña en la etiqueta). En LoRaWAN elige «The Things Network» y la región EU868; en 4G pon el APN de tu SIM.\n\nApunta el «Gateway EUI» que aparece.',
      [I('lap','portatil',40,80,{a:'192.168.0.1',b:'LoRaWAN EU868'},{s:1.2}),I('pas','pasarela',240,70),A('w',[[160,100],[230,100]],{c:'#2ecc71'})]],
    ['Dala de alta en The Things Network','En console.cloud.thethings.network (región Europa) pulsa «Register gateway», pega el Gateway EUI y elige el plan de frecuencias «Europe 863-870 MHz (SF9 for RX2 - recommended)». A los pocos minutos tiene que salir «Connected».',
      [I('lap','portatil',130,70,{a:'TTN consola',b:'eu1'},{s:1.3}),I('ok','ok',270,80)]],
    ['Recorre la finca con un sensor','Con el primer sensor encendido, ve a la nave más lejana y mira que sus datos llegan. Si no llegan, sube la pasarela o pon la antena exterior más alta.',
      [I('pas','pasarela',30,80),I('s','sensorlora',300,90,null,{s:.8}),A('r',[[290,110],[100,110]],{c:'#2ecc71'})]]]}));
M.add('Red LoRaWAN gratuita',G({tiempo:'30 minutos',nivel:'Dificultad baja',
  intro:'The Things Network es la red gratuita donde das de alta la pasarela y los sensores. Se hace todo desde el ordenador.',herr:['ordenador'],
  mat:[{n:'Cuenta gratuita en The Things Network',c:1,p:'Gratis'}],
  pasos:[
    ['Crea la cuenta','En thethingsnetwork.org pulsa «Sign up» y crea la cuenta con el correo de la empresa. Entra en la consola eligiendo la región Europa (eu1).',
      [I('lap','portatil',130,70,{a:'TTN consola',b:'eu1'},{s:1.3})]],
    ['Crea una aplicación','En «Applications» → «Create application», ponle un nombre (por ejemplo «agro-fly-sensores»). Ahí se dan de alta todos los sensores.',
      [I('lap','portatil',130,70,{a:'TTN consola',b:'eu1'},{s:1.3}),R('app',150,40,100,24,'#d5f5e3','#27ae60','agro-fly',{fs:9})]],
    ['Conecta con la app','En la aplicación, «Integrations» → «Webhooks»: aquí se pone la dirección del servidor puente que lleva los datos a la app. Esto lo hacemos juntos cuando tengamos el primer sensor.',
      [I('lap','portatil',40,80),I('mov','movil',260,60,{t1:'APP',t2:'datos',t3:''}),A('w',[[150,100],[250,100]],{c:'#2ecc71'})]]]}));
M.add('SIM de datos',pro('No se monta: se compra y se mete en la pasarela.',['Tarifa de 1–2 GB al mes (sobra).','Cobertura de esa compañía en la finca (mírala con un móvil de esa compañía).','Quitarle el PIN antes de meterla en la pasarela.']));
M.add('Sensores con SIM (NB-IoT / LTE-M)',pro('Llevan su propia SIM: se activan con la app del fabricante y no necesitan pasarela.',['Que haya cobertura NB-IoT o LTE-M en la finca (pregunta a la compañía).','Cuota anual por sensor.','Que manden los datos a una dirección que la app pueda recibir.']));
M.add('Wifi en las naves',G({tiempo:'1 mañana',nivel:'Dificultad media',
  intro:'Solo si vas a poner cámaras o trampas con foto: para sensores es mejor LoRa. Se lleva el wifi desde el almacén con un enlace punto a punto y un punto de acceso de exterior.',herr:['taladro','destorn','escalera','bridas','ordenador'],
  mat:[{n:'Kit de enlace wifi punto a punto de exterior (2 antenas, 5 GHz)',c:1,p:'80–150 €',b:'enlace punto a punto 5GHz kit'},{n:'Punto de acceso wifi de exterior IP65',c:1,p:'50–120 €',b:'punto de acceso wifi exterior IP65'},{n:'Cable de red de exterior (FTP) y conectores',c:1,p:'20–40 €',b:'cable red exterior FTP cat6'},{n:'Inyector PoE (si no viene)',c:1,p:'10–20 €',b:'inyector PoE'}],
  pasos:[
    ['Pon una antena en el almacén','Una antena del enlace en el almacén (conectada al router por cable de red y alimentada por PoE), alta y mirando a las naves.',
      [I('rou','router',20,150),L('mast1',[[90,206],[90,60]],'#9aa5ad',4),R('a1',80,50,20,26,'#fdfefe','#7f8c8d','',{rx:3,de:[0,-30]}),SUELO]],
    ['Pon la otra en las naves','La otra antena en lo alto de la nave, mirando de frente a la primera. Tienen que «verse» sin obstáculos.',
      [L('mast1',[[90,206],[90,60]],'#9aa5ad',4),R('a1',80,50,20,26,'#fdfefe','#7f8c8d','',{rx:3}),L('mast2',[[280,206],[280,60]],'#9aa5ad',4),R('a2',270,50,20,26,'#fdfefe','#7f8c8d','',{rx:3,de:[0,-30]}),A('e',[[104,62],[266,62]],{c:'#2ecc71'}),SUELO]],
    ['Pon el punto de acceso','Del enlace de las naves, cable de red al punto de acceso de exterior, colgado dentro de la nave, alto y en el centro. Comprueba con el móvil la señal en todos los rincones donde vaya una cámara.',
      [I('nave','nave',60,80),R('ap',172,90,24,14,'#fdfefe','#7f8c8d','',{rx:3,de:[0,-30]}),I('mov','movil',260,120,{t1:'WIFI',t2:'●●●',t3:''},{s:.7})]]]}));
M.add('Pasarela Modbus',pro('Se conecta al puerto RS485 del controlador de clima o del de riego: hazlo con el instalador del controlador, que conoce su cableado y su garantía.',['El mapa de registros Modbus del controlador y permiso por escrito para leerlo.','Dirección Modbus, velocidad y paridad del puerto.','Que la lectura no interfiera con el control (solo lectura).']));
M.add('Servidor puente',pro('No se monta nada en la finca: es un programa en internet (Cloudflare) que recibe los datos de los sensores y los guarda en la app. Lo montamos juntos en una tarde cuando tengamos el primer sensor llegando a The Things Network.',['Cuenta de Cloudflare (la misma de la IA).','Acceso a la aplicación de The Things Network.','Las claves solo como secretos de Cloudflare, nunca en el código.']));

/* ---------- Control ---------- */
const INST=t=>pro(`Lo monta el instalador de invernaderos o el electricista: ${t}`,['Presupuesto cerrado con instalación y puesta en marcha.','Cierre automático por viento y lluvia en la propia nave, sin depender de internet.','Mando manual que funcione aunque falle todo lo demás.','Salida de datos (Modbus o informe) para la app.','Garantía y revisión anual.']);
M.add('Controlador de clima profesional',pro('Ya lo tenéis. Lo que se puede hacer desde la app es leer su informe con «Leer informe» en Clima y estrés.',['Al instalador: si tiene salida Modbus o exportación de datos.','Que la web del controlador vaya por https: ahora las contraseñas viajan sin cifrar.','Que revise la hora del controlador (parecía adelantada).']));
M.add('Control sencillo por nave',INST('hay que cablear sensores, motores y cuadro según el reglamento de baja tensión.'));
M.add('Motores de ventanas con finales de carrera',INST('motores, finales de carrera y cuadro eléctrico con protecciones.'));
M.add('Nebulización (fog)',INST('bomba de alta presión, tuberías, boquillas, filtrado del agua y control por humedad.'));
M.add('Malla de sombreo móvil',INST('estructura, pantalla, motor y control.'));
M.add('Programador de riego con conexión',pro('El programador lo cambia o lo amplía tu instalador de riego.',['Si el modelo tiene API, Modbus o exportación de los riegos.','Si cobran por la conexión.','Mientras tanto: foto del informe con «Leer informe».']));
M.add('Relés por LoRa para bombas y válvulas',G({tiempo:'1 mañana con el electricista',nivel:'Dificultad alta',
  intro:'Un controlador LoRaWAN con relés para encender o apagar algo desde lejos. Dentro del cuadro hay 230 V: la conexión la hace el electricista. Tú lo das de alta y lo pruebas.',herr:['polimetro','destorn','ordenador'],
  mat:[{n:'Controlador LoRaWAN con relés, EU868 (ej. Dragino LT-22222-L)',c:1,p:'50–150 €',b:'Dragino LT-22222-L'},{n:'Contactor modular con bobina a 230 V o 12 V (según el esquema del electricista)',c:1,p:'15–40 €',b:'contactor modular 25A',pro:1},{n:'Fuente de 12 V de carril DIN para el controlador',c:1,p:'15–25 €',b:'fuente alimentación 12V carril DIN'}],
  pasos:[
    ['Dalo de alta y pruébalo en la mesa','Antes de llevarlo al cuadro: dalo de alta en The Things Network y prueba desde el ordenador que los relés hacen clic al mandar la orden.',
      [MESA,I('rel','rele',150,120),I('lap','portatil',30,110),A('r',[[120,140],[146,140]],{c:'#2ecc71'})]],
    ['El electricista lo conecta con contactor','El relé pequeño del controlador NUNCA mueve la bomba directamente: manda sobre la bobina de un contactor, y el contactor mueve la bomba. El electricista lo pone en el cuadro con su protección y deja el mando manual como estaba.',
      [I('cua','cuadro',40,60),I('cont','contactor',150,100,null,{de:[40,0]}),I('rel','rele',230,90,null,{de:[40,0]}),L('c',[[230,110],[180,110]],'#c0392b')],'Dentro del cuadro: 230 V o 400 V. Solo el electricista.'],
    ['Prueba con seguridad','Con el electricista delante: orden de encender, mira que arranca; orden de apagar, que para. Configura un tiempo máximo encendido por si se corta la radio.',
      [I('cua','cuadro',40,60),I('cont','contactor',150,100),I('rel','rele',230,90),I('ok','ok',290,60)],'La app no debe ser lo único que decide: siempre seguridad local.']]}));

/* ---------- Personas y maquinaria ---------- */
M.add('Localizador GPS en tractores',G({tiempo:'1 hora por tractor',nivel:'Dificultad baja',
  intro:'Un localizador 4G conectado a la batería del tractor que guarda por dónde va y cuántas horas.',herr:['polimetro','destorn','bridas','movil'],
  mat:[{n:'Localizador GPS 4G para vehículos (a 12/24 V)',c:1,p:'20–60 € + cuota',b:'localizador GPS 4G vehículo 12V'},{n:'Portafusibles en línea con fusible de 2 A',c:1,p:'3 €',b:'portafusibles en línea'},{n:'SIM o cuota del fabricante',c:1,p:'2–5 € al mes'}],
  pasos:[
    ['Busca un sitio escondido','Debajo del salpicadero o dentro de la cabina, con el cable corto hasta la batería o la caja de fusibles. Que «vea» el cielo a través del plástico (no debajo de chapa).',
      [I('trac','tractor',120,100,null,{s:1.4}),R('gps',180,96,20,12,'#1d2329','#000','',{rx:2,de:[0,-30]})]],
    ['Conéctalo con fusible','Rojo al + (después de un fusible de 2 A, lo más cerca posible de la batería) y negro a masa. Si tiene cable de contacto (ACC), al + que solo da corriente con la llave puesta: así cuenta las horas de motor.',
      [I('trac','tractor',120,100,null,{s:1.4}),R('gps',180,96,20,12,'#1d2329','#000','',{rx:2}),L('c',[[190,108],[190,140],[150,140]],'#d62728',2)]],
    ['Actívalo y compara','Actívalo en la app del fabricante y compara un día lo que dice con lo que hizo el tractor.',
      [I('mov','movil',150,60,{t1:'Tractor',t2:'6,5 h',t3:'hoy'})]]]}));
M.add('Telemetría del pulverizador',pro('Lo instala el taller de maquinaria o la marca del equipo: caudalímetro y presión en el circuito del pulverizador con su ordenador.',['Calibración con agua delante de ti.','Que exporte el tratamiento (fecha, dosis, superficie) para el cuaderno.','Compatible con la próxima inspección ITEAF.']));
M.add('Pulseras contra el golpe de calor',pro('Las entrega el proveedor de prevención de riesgos con su app. Son datos de salud: con consentimiento de cada trabajador.',['Prueba con 2–3 trabajadores un verano.','Quién ve los datos y para qué (por escrito).','Aviso en el móvil del encargado.']));
M.add('Contar placas con la foto del móvil',pro('No hay que montar nada: es desarrollo dentro de la vista Plagas (una foto de la placa y la IA cuenta los insectos). Cuando lo pidas, se hace con sus pruebas.',['Fotos de frente, con la placa entera y buena luz.','Comparar con tu conteo las primeras semanas.']));
M.add('Previsión de kilos por nave',pro('Es desarrollo dentro de la app con los partes, el clima y, si lo hay, el conteo de frutos. No hay que montar nada.',['Kilos por nave y semana de temporadas anteriores.','Unas semanas de datos para ajustar.']));
M.add('Riego por radiación automático',pro('Es desarrollo dentro de la app, pero antes necesita dos cosas montadas y funcionando: el piranómetro (guía «Radiación solar») y el drenaje automático (guía «Drenaje automático en la bandeja»).',['Primero la app solo propone; tú decides.','Nunca riego automático sin la seguridad del programador.']));
M.add('Maqueta 3D en vivo de la finca',pro('Desarrollo dentro de la app, aparcado de momento. Necesitará la ortofoto propia o la del PNOA.',['La ortofoto de la finca (guía «Ortofoto propia»).']));
M.add('Registro de visitas',pro('Es desarrollo dentro de la app: un formulario con QR a la entrada. Cuando lo pidas, se hace con sus pruebas.',['Cartel con QR en la entrada.','Que sea rápido: si cuesta, no se apunta.']));
M.add('Cámaras de seguridad',G({tiempo:'1 mañana',nivel:'Dificultad media',
  intro:'Cámaras de exterior en el almacén y la entrada. Antes de grabar: cartel de zona videovigilada y aviso a los trabajadores (protección de datos).',herr:['taladro','destorn','escalera','movil'],
  mat:[{n:'Cámaras de exterior IP65 con wifi o 4G',c:2,p:'40–150 € cada una',b:'cámara exterior 4G solar'},{n:'Tarjetas microSD',c:2,p:'10 €',b:'microSD 64GB'},{n:'Cartel «Zona videovigilada»',c:1,p:'5 €',b:'cartel zona videovigilada'}],
  pasos:[
    ['Pon el cartel','Cartel de zona videovigilada visible antes de entrar en la zona grabada, con quién es el responsable.',
      [I('puerta','puerta',120,60),R('cart',200,70,60,40,'#f1c40f','#b7950b','VIDEO',{fs:9,ta:'m',de:[40,0]}),SUELO]],
    ['Fija las cámaras','Altas (2,5–3 m), mirando a la puerta del almacén y del cuarto de fitosanitarios, sin grabar la vía pública ni zonas de descanso.',
      [I('puerta','puerta',120,60),I('cam','camara',40,30,null,{de:[0,-30]}),A('v',[[96,44],[140,90]]),SUELO]],
    ['Configura y avisa','Configura la app, la grabación por movimiento y el borrado automático (máximo un mes). Avisa por escrito a los trabajadores.',
      [I('mov','movil',150,60,{t1:'Cámara',t2:'activa',t3:''})]]]}));

/* ---------- Postcosecha y almacén ---------- */
M.add('Temperatura de la cámara frigorífica',G({tiempo:'30 minutos',nivel:'Dificultad baja',
  intro:'Un sensor LoRaWAN fuera de la cámara con su sonda dentro (el metal de la cámara corta la radio).',herr:['bridas','silicona','ordenador'],
  mat:[{n:'Sensor LoRaWAN de temperatura con sonda de cable (EU868)',c:1,p:'40–80 €',b:'Dragino LHT65N EU868'},{n:'Silicona para sellar el paso de la sonda',c:1,p:'5 €'}],
  pasos:[...ALTA('tu sensor'),
    ['Pasa la sonda dentro','El sensor fuera, junto a la puerta. La sonda entra a la cámara por la junta de la puerta (si es plana) o por un paso de cables existente, sellando con silicona. Cuélgala en el centro, a media altura, sin tocar paredes ni producto.',
      [R('cam',30,40,170,160,'#d6eaf8','#2e86c1','cámara',{fs:10}),I('s','sensorlora',230,60),L('son',[[245,110],[245,140],[120,140],[120,120]],'#222',2,{de:[40,0]})]],
    ['Pon el aviso','Aviso si pasa del límite (por desarrollar en la app). Mientras tanto, mira el dato cada mañana.',
      [I('mov','movil',150,60,{t1:'Cámara',t2:'4,1 °C',t3:''})]]]}));
M.add('Báscula conectada en la recolección',pro('Se compra hecha y se configura con la app del fabricante. La conexión con la app para el coste por kilo está por desarrollar.',['Que mande el peso por Bluetooth o wifi en un formato abierto.','IP65 o más (polvo y agua).','Verificación con un peso conocido.']));
M.add('Trazabilidad con QR en palés y cajas',pro('Es desarrollo dentro de la app: generar e imprimir la etiqueta al cerrar el palé. Solo hace falta una impresora de etiquetas.',['Impresora de etiquetas térmica con Bluetooth.','Etiquetas de transferencia térmica si los palés esperan al sol.']));
M.add('Etiquetas RFID',pro('Lo monta un proveedor de RFID con lectores en las puertas. Solo para mucho volumen: con QR suele bastar.',['Prueba de lectura en tus cajas y palés.','Coste por etiqueta y por lector.']));
M.add('Sensor de etileno',pro('Lo instala el proveedor en la cámara de maduración o conservación.',['Rango de medida para tomate.','Calibración y cada cuánto.']));
M.add('Almacén de fitosanitarios vigilado',G({tiempo:'1 hora',nivel:'Dificultad baja',
  intro:'Un sensor de temperatura y uno de puerta, los dos LoRaWAN. Avisa si hace calor dentro o si se abre fuera de horario.',herr:['destorn','bridas','ordenador'],
  mat:[{n:'Sensor LoRaWAN de temperatura (EU868)',c:1,p:'40–60 €',b:'Dragino LHT65N EU868'},{n:'Sensor LoRaWAN de puerta (EU868)',c:1,p:'30–50 €',b:'Milesight WS301'}],
  pasos:[...ALTA('tus sensores'),
    ['Pon el sensor de temperatura','Dentro del almacén, a media altura, lejos de la puerta y del techo (que es lo que más se calienta), atornillado a la pared con su soporte. Así mide lo que soportan de verdad los productos de las estanterías.',
      [I('puerta','puerta',60,60),I('s','sensorlora',220,80,null,{de:[0,-30]}),SUELO]],
    ['Pon el sensor de puerta','El cuerpo en el marco y el imán en la hoja de la puerta, a menos de 1–2 cm con la puerta cerrada. Abre y cierra: tiene que llegar cada cambio.',
      [I('puerta','puerta',60,60),I('sp','sensorpuerta',100,90,null,{de:[30,0]}),I('s','sensorlora',220,80),SUELO]]]}));
})();
/* Imágenes realistas orientativas de cada guía (generadas con IA; se ven desde su dirección, con la imagen oculta si no carga).
   El administrador puede ocultar cualquiera desde la guía. */
(()=>{const M=window.MONTAJE,U='https://res-prod.buzzy.now/file-service/';M.IMG={
'Nodo casero de clima y hoja':U+'585aca9e-44a6-4b11-a716-043b283c4c37.png'
}})();

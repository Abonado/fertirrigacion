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

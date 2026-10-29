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

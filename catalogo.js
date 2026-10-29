/* Catálogo de tecnología agrícola · solo el administrador (menú Taller → Catálogo).
   Sensores, robots, drones, conectividad, control y lo que se puede hacer con la app, pensado para tomate en invernadero en Murcia.
   Precios orientativos (2026, sin instalación): confirmar siempre antes de comprar.
   est: app = ya está en la app · prep = la app ya está preparada para recibirlo · idea = se puede hacer · no = no recomendado ahora.
   taller: diseño del Taller de sensores que lo monta (N1, N2, N3). Se carga solo al abrir el catálogo. */
window.CATALOGO={act:'octubre de 2026',carpetas:[
{id:'clima',n:'Clima del invernadero',d:'Aire, luz, CO₂ y tiempo de fuera',ic:'M12 3v10a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 7h3M9 10h3',it:[
 {n:'Termohigrómetro con registro',q:'Temperatura y humedad del aire, con máxima, mínima e historial.',uso:'Lo básico para Clima y estrés: DPV, horas de calor y grados-día de las plagas. Siempre a la sombra y a la altura de la planta.',prec:'15–30 €',ej:'Cualquiera con memoria de máximas y mínimas; mejor con historial por horas',con:'Sin conexión (se apunta a mano)',dif:'Fácil',est:'app',t:'temperatura humedad dpv'},
 {n:'Sensor de temperatura y humedad LoRa',q:'Lo mismo que el termohigrómetro, pero manda el dato solo cada 10 minutos y dura años con su pila.',uso:'Rellena Clima y estrés y Plagas sin apuntar nada. Uno por nave o por zona.',prec:'40–60 € cada uno',ej:'Dragino LHT65N-E31F EU868 (con sonda de 1 m)',con:'LoRaWAN (necesita pasarela)',dif:'Fácil',est:'prep',t:'temperatura humedad lorawan dragino'},
 {n:'Garita contra la radiación',q:'Cajita con lamas que da sombra al sensor de aire.',uso:'Sin ella, al sol el sensor marca 5–6 °C de más y todo el cálculo de estrés sale mal.',prec:'15–40 € (o imprimirla en 3D)',ej:'Garitas de estación meteorológica',con:'—',dif:'Fácil',est:'idea',t:'protector radiacion sombra'},
 {n:'Radiación solar (piranómetro)',q:'Energía del sol que llega al cultivo (W/m²).',uso:'Permite regar por radiación acumulada: más sol, más riego. Es como riegan los invernaderos punteros de tomate.',prec:'Fotodiodo 30–80 €; profesional 150–600 €',ej:'Apogee, Hukseflux; fotodiodos calibrados',con:'Analógico o Modbus a un nodo LoRa',dif:'Media',est:'idea',taller:'N7',t:'radiacion sol riego por radiacion'},
 {n:'Sensor PAR (luz útil)',q:'Solo la luz que usa la planta para la fotosíntesis.',uso:'Ver cuánta luz quita el blanqueo o la malla y decidir cuándo quitarlo en otoño.',prec:'200–600 €',ej:'Apogee SQ',con:'Analógico a nodo',dif:'Media',est:'idea',t:'luz par fotosintesis malla blanqueo'},
 {n:'CO₂',q:'Concentración de CO₂ en el aire (ppm).',uso:'Con ventanas cerradas en invierno el CO₂ baja y la planta crece menos: indica cuándo ventilar o enriquecer.',prec:'Casero 30–60 €; profesional 300–800 €',ej:'Sensirion SCD41 (casero); Vaisala (profesional)',con:'I2C a un nodo LoRa',dif:'Media',est:'idea',taller:'N8',t:'co2 ventilacion enriquecimiento'},
 {n:'Temperatura de la hoja (infrarrojos)',q:'Temperatura de la hoja sin tocarla.',uso:'Hoja más caliente que el aire = estrés hídrico. Es la base del índice de estrés de la app.',prec:'Pistola 25–40 €; sensor casero 10–20 €; profesional más de 500 €',ej:'UNI-T UT300 (pistola); MLX90614 (casero); Apogee SI-111',con:'Pistola a mano; sensor por I2C a nodo',dif:'Fácil (pistola) / Media',est:'app',taller:'N4',t:'hoja infrarrojo estres cwsi pistola'},
 {n:'Humectación de hoja',q:'Si la hoja está mojada y cuánto tiempo.',uso:'Las horas de hoja mojada son el dato clave para botritis y mildiu en la vista Plagas.',prec:'80–250 €',ej:'Sensores de hoja artificial (Decagon/METER, Pessl)',con:'Analógico o LoRa',dif:'Media',est:'idea',t:'humectacion hoja mojada botritis mildiu'},
 {n:'Estación meteorológica exterior',q:'Viento, lluvia, temperatura, humedad y radiación de fuera.',uso:'Cierre de ventanas por viento o lluvia y saber cuándo se puede tratar sin deriva. La previsión de la app es de la zona, no de tu finca.',prec:'300–2.000 €',ej:'Pessl iMETOS, Davis Vantage, estaciones LoRa',con:'4G, wifi o LoRa',dif:'Media',est:'idea',t:'viento lluvia meteo estacion tratar'},
 {n:'Anemómetro y pluviómetro',q:'Velocidad del viento y lluvia caída.',uso:'Seguridad de ventanas y cubiertas, y registro de lluvias fuertes para el cuaderno (zona vulnerable).',prec:'50–200 €',ej:'Anemómetros de cazoletas con pulsos',con:'Pulsos a nodo LoRa',dif:'Media',est:'idea',taller:'N6',t:'viento lluvia cubierta cuaderno'},
 {n:'Cámara térmica para el móvil',q:'Imagen de temperaturas de todo lo que ves.',uso:'Ver de un vistazo plantas con estrés, goteros atascados, fugas o motores calientes.',prec:'250–450 €',ej:'FLIR One, InfiRay P2',con:'Al móvil',dif:'Fácil',est:'idea',t:'termica camara estres goteros'},
 {n:'Nodo casero de clima y hoja',q:'Temperatura y humedad del aire y temperatura de la hoja en un solo aparato.',uso:'Rellena Clima y estrés solo en una nave: DPV, hoja–aire y semáforo. Más barato que comprar los tres datos por separado.',prec:'40–60 € en piezas',ej:'Heltec V3 + SHT40 + MLX90614 (3,3 V) + garita',con:'LoRa (pasarela)',dif:'Media',est:'idea',taller:'N4',t:'clima hoja dpv casero nodo'}]},
{id:'suelo',n:'Suelo y sustrato',d:'Agua, sales y temperatura en la raíz',ic:'M3 14h18M5 18h14M8 14v-4m4 4V7m4 7v-3',it:[
 {n:'Humedad capacitiva casera',q:'Humedad del sustrato con una sonda barata.',uso:'Comparar naves y ver tendencias (riego a riego). No es precisa en valor absoluto ni mide sales.',prec:'2–5 € la sonda + el nodo',ej:'Sonda capacitiva v1.2 con chip TLC555',con:'Nodo LoRa del Taller (N2)',dif:'Media',est:'idea',taller:'N2',t:'humedad sustrato capacitivo casero'},
 {n:'Humedad, temperatura y CE del sustrato',q:'Agua, sales y temperatura en el mismo punto de la raíz.',uso:'Saber si la planta tiene agua y si se acumulan sales entre riegos. El dato que más dice del sustrato.',prec:'RS485 económicos 30–80 €; profesional 300–450 €',ej:'Sondas RS485 genéricas; METER TEROS 12',con:'RS485 a nodo (Taller N3)',dif:'Media',est:'idea',taller:'N3',t:'ce sales sustrato rs485 teros'},
 {n:'Bandeja de pesada (balanza de sustrato)',q:'Pesa un saco con sus plantas de forma continua.',uso:'El riego por demanda más preciso en sustrato: el peso que pierde es el agua que consume la planta. Arranca el riego cuando toca.',prec:'300–3.000 €',ej:'Balanzas de cultivo (Grodan, Hortimax, caseras con célula de carga)',con:'Célula de carga a nodo',dif:'Alta',est:'idea',t:'peso balanza riego demanda sustrato'},
 {n:'Tensiómetro',q:'Lo que le cuesta a la raíz sacar el agua del suelo.',uso:'Para cultivo en suelo: dice cuándo regar. En sustrato se usa poco.',prec:'60–150 € manual; 150–400 € electrónico',ej:'Irrometer',con:'Manual o analógico',dif:'Fácil',est:'idea',t:'tensiometro suelo riego'},
 {n:'Temperatura de raíz',q:'Temperatura del sustrato o del agua de riego en la raíz.',uso:'En invierno, raíz fría = absorbe mal aunque haya abono. Sonda muy barata.',prec:'3–10 € (sonda DS18B20)',ej:'DS18B20 sumergible',con:'Un hilo a nodo',dif:'Fácil',est:'idea',taller:'N5',t:'temperatura raiz invierno'},
 {n:'Oxígeno en la raíz',q:'Oxígeno en el sustrato.',uso:'Raíz sin oxígeno por exceso de riego. Más de investigación que de uso diario.',prec:'300–1.000 €',ej:'Sondas ópticas de oxígeno',con:'Analógico o Modbus',dif:'Alta',est:'idea',t:'oxigeno raiz asfixia'},
 {n:'Sensores NPK de suelo «3 en 1» baratos',q:'Prometen medir nitrógeno, fósforo y potasio.',uso:'No recomendado: en realidad estiman con la CE y no son fiables. Mejor análisis de laboratorio y la CE del drenaje.',prec:'20–60 €',ej:'Sondas RS485 «NPK» genéricas',con:'RS485',dif:'—',est:'no',t:'npk nitrogeno fosforo potasio'}]},
{id:'agua',n:'Agua, riego y fertirrigación',d:'Caudal, presión, CE, pH y depósitos',ic:'M12 3c3 4 6 7.2 6 10.5A6 6 0 0 1 6 13.5C6 10.2 9 7 12 3z',it:[
 {n:'Nivel de depósitos (ultrasonidos)',q:'Altura del líquido en el depósito de abono.',uso:'«Rellenar depósito» va solo y detecta errores de inyección o venturis atascados si baja más o menos de lo que dice la receta.',prec:'Casero 40–60 €; comercial 60–90 €',ej:'A02YYUW (casero); Dragino LDDS75',con:'Nodo LoRa del Taller (N1)',dif:'Media',est:'prep',taller:'N1',t:'nivel deposito bidon ultrasonidos'},
 {n:'Nivel por radar',q:'Nivel sin contacto, sin que le afecten vapores.',uso:'Para depósitos de ácido, donde el ultrasonidos sufre.',prec:'150–500 €',ej:'Radares de nivel 80 GHz',con:'4–20 mA o Modbus',dif:'Media',est:'idea',taller:'N7',t:'nivel acido radar'},
 {n:'Contador con salida de pulsos',q:'Metros cúbicos que salen de cada cabezal, automáticos.',uso:'Cuentas del día sin apuntar m³. Caudal bajo = goteros atascados o filtro sucio; alto = rotura.',prec:'50–70 € el nodo (si el contador ya tiene pulsos)',ej:'Contadores Woltman con emisor de pulsos + nodo LoRa',con:'Pulsos a nodo LoRa',dif:'Media',est:'idea',taller:'N6',t:'contador caudal m3 fugas obstruccion'},
 {n:'Caudalímetro electromagnético',q:'Caudal muy preciso, sin piezas que se gasten.',uso:'Para un cabezal donde quieras precisión total en el agua aplicada.',prec:'400–1.500 €',ej:'Siemens, Krohne, marcas de riego',con:'Pulsos, 4–20 mA o Modbus',dif:'Media',est:'idea',t:'caudalimetro precision'},
 {n:'Presión (transductores)',q:'Presión del agua en un punto.',uso:'Antes y después de filtros: aviso de limpiar filtros. En sectores: roturas o electroválvulas que no abren. La vista Instalación ya lo calcula a mano.',prec:'30–150 € cada uno',ej:'Transductores 0–10 bar 4–20 mA',con:'Analógico a nodo',dif:'Media',est:'prep',taller:'N7',t:'presion filtros rotura electrovalvula'},
 {n:'CE y pH en línea',q:'CE y pH de la solución nutritiva al momento.',uso:'Vigilar la receta en tiempo real y que no se pase el ácido. Hay que calibrarlas cada mes.',prec:'CE 150–600 €; pH 100–400 €',ej:'Sondas industriales con transmisor',con:'4–20 mA o Modbus',dif:'Media',est:'idea',t:'ce ph solucion nutritiva receta'},
 {n:'Drenaje automático en la bandeja',q:'Pluviómetro de cazoletas debajo de la bandeja de drenaje.',uso:'El drenaje % sale solo, riego a riego, sin medir con la probeta. Lo que más tiempo ahorra cada día.',prec:'30–100 € + el nodo',ej:'Pluviómetros de cazoletas de 2–5 ml',con:'Pulsos a nodo LoRa',dif:'Media',est:'idea',taller:'N6',t:'drenaje bandeja automatico pluviometro'},
 {n:'CE y pH del drenaje',q:'Sales y pH del agua que drena.',uso:'Completa el drenaje automático: avisa si se acumulan sales en el sustrato.',prec:'150–600 €',ej:'Sondas en la bandeja',con:'Analógico o Modbus',dif:'Media',est:'idea',t:'ce ph drenaje sales'},
 {n:'Temperatura de la solución',q:'Temperatura del agua de riego.',uso:'En verano el agua caliente lleva menos oxígeno a la raíz; en invierno, fría frena la absorción.',prec:'5–20 €',ej:'DS18B20 sumergible',con:'Un hilo a nodo',dif:'Fácil',est:'idea',taller:'N5',t:'temperatura agua riego'},
 {n:'Oxígeno disuelto',q:'Oxígeno en el agua de riego o en la balsa.',uso:'Balsas con algas o agua recirculada.',prec:'200–800 €',ej:'Sondas ópticas',con:'Modbus',dif:'Alta',est:'idea',t:'oxigeno disuelto balsa'},
 {n:'Nitratos (ion selectivo)',q:'Nitrato en el agua o en el drenaje.',uso:'Control de nitratos en zona vulnerable. Para empezar mejor un medidor portátil.',prec:'Portátil 300–400 €; en continuo 300–1.500 €',ej:'Horiba LAQUAtwin NO3 (portátil)',con:'Manual o analógico',dif:'Media',est:'idea',t:'nitratos zona vulnerable'},
 {n:'Consumo eléctrico de la bomba',q:'Si la bomba está funcionando y cuánto gasta.',uso:'Horas reales de riego y aviso si la bomba no arranca o trabaja forzada.',prec:'20–60 € casero',ej:'Pinza amperimétrica SCT-013 + nodo',con:'Analógico a nodo',dif:'Media',est:'idea',taller:'N9',t:'bomba consumo electrico averia'},
 {n:'Electroválvula con mando a distancia',q:'Abrir o cerrar un sector desde el móvil.',uso:'Riegos de emergencia o cortar una fuga sin ir a la finca. Siempre con seguridad local.',prec:'100–300 € por sector',ej:'Electroválvulas latch con controlador LoRa',con:'LoRaWAN',dif:'Alta',est:'idea',t:'electrovalvula remoto riego'}]},
{id:'planta',n:'La planta',d:'Lo que dice la propia planta',ic:'M12 21V10m0 0C12 6 9 4 5 4c0 4 3 6 7 6zm0 3c0-3 3-5 7-5 0 3-3 5-7 5',it:[
 {n:'Dendrómetro',q:'Micro-cambios de grosor del tallo durante el día.',uso:'El tallo encoge antes de que veas la planta lacia: avisa del estrés hídrico con horas de adelanto.',prec:'200–700 €',ej:'Dendrómetros de tallo (Ecomatik, Phytech)',con:'Analógico o LoRa',dif:'Alta',est:'idea',t:'dendrometro tallo estres'},
 {n:'Flujo de savia',q:'Cuánta agua transpira la planta de verdad.',uso:'El dato más directo de consumo de agua. Caro; más para ensayos que para todas las naves.',prec:'500–2.000 €',ej:'Implexx, Dynamax',con:'Analógico o SDI-12',dif:'Alta',est:'idea',t:'savia transpiracion'},
 {n:'Cámara fija por nave',q:'Una foto cada pocas horas del cultivo.',uso:'La IA de la app la revisa una o dos veces al día y propone incidencias. Comprueba antes si llega el wifi.',prec:'40–60 €',ej:'Cámaras de exterior Reolink o TP-Link Tapo',con:'Wifi o cable de red',dif:'Media',est:'idea',t:'camara foto ia vigilancia'},
 {n:'Cámara multiespectral',q:'Vigor de la planta (NDVI) con luz que el ojo no ve.',uso:'Útil al aire libre o con dron. Bajo plástico pierde mucho.',prec:'300–5.000 €',ej:'Sentera, MicaSense',con:'—',dif:'Alta',est:'idea',t:'multiespectral ndvi vigor'},
 {n:'Clorofilómetro (SPAD)',q:'Verdor de la hoja, ligado al nitrógeno.',uso:'Detectar falta de nitrógeno antes de verla. Medida a mano.',prec:'200–2.500 €',ej:'Konica Minolta SPAD-502, atLEAF',con:'Manual',dif:'Fácil',est:'idea',t:'clorofila nitrogeno spad'},
 {n:'Refractómetro (grados Brix)',q:'Azúcar del fruto.',uso:'Calidad del tomate y cuándo cortar. Muy barato.',prec:'20–300 €',ej:'Refractómetros digitales',con:'Manual',dif:'Fácil',est:'idea',t:'brix azucar calidad'},
 {n:'Contador de frutos por visión',q:'Cuenta racimos y frutos por foto.',uso:'Previsión de kilos por nave para las próximas semanas.',prec:'Servicio o hecho por nosotros con la IA de la app',ej:'Carros con cámara, robots de monitorización',con:'Fotos',dif:'Alta',est:'idea',t:'frutos prevision cosecha kilos'}]},
{id:'plagas',n:'Plagas y enfermedades',d:'Trampas, esporas y modelos',ic:'M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 14v6M6 6l3 3m9-3-3 3M4 13h4m8 0h4',it:[
 {n:'Trampas de feromona y placas de colores',q:'Capturas de Tuta, mosca blanca y trips.',uso:'Sin trampas no hay fechas: con la primera captura, la vista Plagas calcula cuándo viene la siguiente generación.',prec:'2–15 €',ej:'Feromona de Tuta, placas amarillas y azules',con:'Se cuentan y se apuntan cada semana',dif:'Fácil',est:'app',t:'trampa feromona placas tuta mosca blanca trips'},
 {n:'Trampa inteligente con cámara',q:'Hace foto a la placa y la IA cuenta los insectos sola.',uso:'Conteo diario de Tuta sin ir a mirar. Antes de comprar, comprueba que tiene modelo para tu plaga.',prec:'1.500–2.700 $ con la suscripción',ej:'Metos iScout (~2.700 $), Trapview (~2.400 $), Topraq T-Trap (~1.550 $)',con:'4G, solar',dif:'Fácil',est:'idea',t:'trampa camara ia conteo tuta'},
 {n:'Trampa casera con cámara',q:'Lo mismo, hecho por nosotros con una cámara barata.',uso:'La IA de la app cuenta los insectos de la foto. Prototipo barato antes de pagar suscripciones.',prec:'20–40 €',ej:'ESP32-CAM + placa adhesiva',con:'Wifi',dif:'Media',est:'idea',t:'esp32 cam trampa casera'},
 {n:'Contar placas con la foto del móvil',q:'Foto de la placa amarilla o azul y la IA cuenta.',uso:'Ahorra el conteo a ojo y queda registrado. Sin comprar nada.',prec:'Gratis',ej:'La IA de la app',con:'—',dif:'Fácil',est:'idea',t:'contar placas foto ia'},
 {n:'Captador de esporas',q:'Recoge esporas del aire para saber si hay hongos antes de verlos.',uso:'Mildiu, oídio. Caro y necesita análisis.',prec:'1.000–5.000 €',ej:'Burkard, captadores con análisis',con:'—',dif:'Alta',est:'idea',t:'esporas mildiu oidio hongos'},
 {n:'Modelos de riesgo por clima',q:'Grados-día, horas de humedad y rocío.',uso:'Ya en la vista Plagas: Tuta, araña roja, botritis, cambio de color, rugoso por contacto.',prec:'Gratis',ej:'La app',con:'—',dif:'—',est:'app',t:'grados dia modelos riesgo'},
 {n:'Nariz electrónica',q:'Detecta los olores que suelta la planta enferma.',uso:'Todavía de investigación, no hay producto fiable para finca.',prec:'—',ej:'Proyectos de investigación',con:'—',dif:'—',est:'no',t:'nariz electronica volatiles'}]},
{id:'robots',n:'Robots',d:'Cosecha, deshojado, vigilancia y tratamientos',ic:'M8 8h8v8H8zM12 4v4M6 12H3m18 0h-3M9 20v-4m6 4v-4',it:[
 {n:'Robot de cosecha de tomate',q:'Recoge el tomate maduro solo.',uso:'Hoy funcionan en invernaderos de alta tecnología con raíles y tubos de calefacción, no en parral ni en raspa y amagado. Para seguirlo de cerca.',prec:'No publican precio (venta o alquiler por servicio)',ej:'eternal.ag Harvester (Países Bajos, 2026); Four Growers (EE. UU.); Tokuiten (Japón, cherry: unos 31 kg al día por robot)',con:'—',dif:'Alta',est:'no',t:'robot cosecha recoleccion'},
 {n:'Robot de deshojado',q:'Quita las hojas bajas de la planta.',uso:'Mismo requisito: invernadero de alta tecnología con raíles.',prec:'Presupuesto',ej:'Priva Kompano',con:'—',dif:'Alta',est:'no',t:'robot deshojado hojas'},
 {n:'Carro o robot de vigilancia',q:'Recorre los pasillos haciendo fotos y detecta plagas, enfermedades y frutos.',uso:'Mapa de plagas y previsión de kilos por nave. Es lo más cercano a lo que puede encajar en tu finca a medio plazo.',prec:'Servicio por superficie o compra (decenas de miles de €)',ej:'Ecoation OKO, Otto',con:'Wifi o 4G',dif:'Alta',est:'idea',t:'robot vigilancia scouting camaras'},
 {n:'Robot propio para pasillos',q:'Plataforma pequeña con cámara elevable.',uso:'Fotos de cada nave para la IA de la app: plagas, rugoso, conteo de frutos. Hecho a medida de tus pasillos.',prec:'Prototipo: unos cientos a pocos miles de €',ej:'Proyecto propio',con:'Wifi o LoRa',dif:'Alta',est:'idea',t:'robot propio prototipo pasillos'},
 {n:'Carro de pulverización autónomo',q:'Recorre el pasillo tratando solo.',uso:'Menos exposición del aplicador y dosis uniforme. Requiere pasillos regulares.',prec:'15.000–50.000 € (orientativo)',ej:'Carros de tratamiento autónomos para invernadero',con:'—',dif:'Alta',est:'idea',t:'pulverizacion autonoma tratamiento'},
 {n:'Robot con luz UV-C',q:'Trata el cultivo con luz ultravioleta de noche.',uso:'Reduce oídio sin productos. Probado sobre todo en fresa y viña.',prec:'Presupuesto',ej:'Saga Robotics Thorvald',con:'—',dif:'Alta',est:'idea',t:'uvc oidio sin quimicos'},
 {n:'Robot polinizador',q:'Poliniza las flores de tomate.',uso:'Alternativa a los abejorros. Los abejorros siguen siendo lo más práctico.',prec:'Presupuesto',ej:'Arugga',con:'—',dif:'Alta',est:'no',t:'polinizacion abejorros'},
 {n:'Carro que sigue al operario',q:'Lleva las cajas detrás de la colla.',uso:'Ahorra paseos en recolección y deshojado.',prec:'5.000–20.000 €',ej:'Carros autónomos de transporte',con:'—',dif:'Media',est:'idea',t:'carro transporte cajas recoleccion'}]},
{id:'drones',n:'Drones',d:'Fotos, mapas y lo que la ley permite',ic:'M5 5h3m8 0h3M6.5 5v3h11V5M9 8l-1 4h8l-1-4M10 12v3h4v-3',it:[
 {n:'Dron con cámara',q:'Fotos y vídeo desde el aire.',uso:'Revisar cubiertas, balsas y caminos; mapas actualizados de la finca. Necesita registro como operador y formación básica.',prec:'400–2.000 €',ej:'DJI Mini, DJI Air',con:'—',dif:'Fácil',est:'idea',t:'dron camara fotos cubiertas'},
 {n:'Ortofoto propia de la finca',q:'Mapa de la finca hecho con fotos del dron.',uso:'Plano real para la app y, al aire libre, fallos de plantación (huecos en las líneas).',prec:'Gratis con WebODM (programa libre)',ej:'WebODM, QGIS',con:'—',dif:'Media',est:'idea',t:'ortofoto mapa marras fallos plantacion'},
 {n:'Dron multiespectral',q:'Vigor del cultivo (NDVI) desde el aire.',uso:'Parcelas al aire libre: ver zonas débiles. Bajo plástico no ve el cultivo.',prec:'4.000–5.000 €',ej:'DJI Mavic 3 Multispectral',con:'—',dif:'Media',est:'idea',t:'multiespectral ndvi aire libre'},
 {n:'Dron térmico',q:'Temperaturas desde el aire.',uso:'Fallos de riego y fugas al aire libre; revisar placas solares.',prec:'3.000–8.000 €',ej:'DJI Mavic 3T',con:'—',dif:'Media',est:'idea',t:'termico riego fugas'},
 {n:'Pulverizar con dron',q:'Tratar el cultivo desde el aire.',uso:'Prohibido en España salvo autorización excepcional de la comunidad autónoma (Real Decreto 1311/2012). No es una opción para el día a día.',prec:'—',ej:'—',con:'—',dif:'—',est:'no',t:'dron fumigar pulverizar prohibido'},
 {n:'Imágenes de satélite gratis',q:'Vigor y evolución de parcelas cada pocos días.',uso:'Ya en la app (Satélite) para parcelas al aire libre. Píxel de 10 m: no ve plantas.',prec:'Gratis',ej:'Sentinel-2 (Copernicus)',con:'—',dif:'—',est:'app',t:'satelite sentinel copernicus ndvi'},
 {n:'Foto aérea oficial (PNOA)',q:'Ortofoto del Instituto Geográfico Nacional, a 25–50 cm.',uso:'Fondo real para los mapas de la app, en lugar de dibujos. Gratis citando la fuente.',prec:'Gratis (CC BY 4.0)',ej:'PNOA del IGN',con:'—',dif:'Media',est:'idea',t:'pnoa ortofoto ign mapa fondo'}]},
{id:'red',n:'Conectividad y energía',d:'Cómo llegan los datos a la app',ic:'M5 12a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0M11.5 18.5h1',it:[
 {n:'Pasarela LoRaWAN 4G',q:'Recoge los datos de todos los sensores de la finca y los sube a internet.',uso:'Una sola cubre toda la finca (1–2 km). Con 4G no necesita wifi. Es la pieza base de todo lo demás.',prec:'Unos 175 € sin IVA',ej:'Dragino LPS8N EU868 con 4G',con:'4G (SIM de datos)',dif:'Media',est:'prep',t:'pasarela gateway lorawan 4g'},
 {n:'Red LoRaWAN gratuita',q:'El servidor que recibe los datos de la pasarela.',uso:'Sin cuotas para pocos sensores. Desde ahí, un servidor puente los manda a la app.',prec:'Gratis',ej:'The Things Network; ChirpStack (propio)',con:'Internet',dif:'Media',est:'prep',t:'ttn things network chirpstack'},
 {n:'SIM de datos',q:'Internet para la pasarela.',uso:'Gasta muy poco.',prec:'3–5 € al mes',ej:'Cualquier tarifa de datos barata',con:'4G',dif:'Fácil',est:'idea',t:'sim datos 4g'},
 {n:'Sensores con SIM (NB-IoT / LTE-M)',q:'Cada sensor con su propia SIM, sin pasarela.',uso:'Útil para uno o dos puntos sueltos lejos. Con muchos sensores sale más caro que LoRa por las cuotas.',prec:'Cuota por sensor',ej:'Sensores NB-IoT',con:'Red móvil',dif:'Fácil',est:'idea',t:'nb-iot lte-m sim'},
 {n:'Wifi en las naves',q:'Cobertura wifi para cámaras.',uso:'Solo si vas a poner cámaras; para sensores es mejor LoRa.',prec:'50–200 € por punto',ej:'Puntos de acceso de exterior',con:'Wifi',dif:'Media',est:'idea',t:'wifi repetidor exterior'},
 {n:'Placa solar y batería para nodos',q:'Alimentar sensores sin enchufe.',uso:'Para nodos con consumo alto o en sitios sin luz.',prec:'15–40 €',ej:'Placa 6 V 2–3 W + pila 18650',con:'—',dif:'Fácil',est:'idea',taller:'N2',t:'solar bateria alimentacion'},
 {n:'Pasarela Modbus',q:'Lee los datos de controladores y aparatos industriales que ya tienes.',uso:'Sacar datos del controlador de clima o del de riego sin depender de su nube (con permiso del fabricante).',prec:'50–200 €',ej:'Pasarelas Modbus RTU/TCP a LoRa o 4G',con:'RS485 / red',dif:'Alta',est:'idea',t:'modbus rs485 controlador'},
 {n:'Servidor puente',q:'Pequeño programa en la nube que pasa los datos a la app.',uso:'Como el que ya usa la IA. Recibe los datos de los sensores o de los informes y los guarda en la app.',prec:'Gratis o pocos €',ej:'Cloudflare Workers',con:'Internet',dif:'Media',est:'prep',t:'servidor cloudflare worker'},
 {n:'Pegatinas QR o NFC por nave y elemento',q:'Se escanean con el móvil y la app se abre en esa nave o elemento.',uso:'Apuntar la incidencia, la trampa o el clima en la nave correcta sin buscar.',prec:'Céntimos',ej:'Etiquetas QR impresas, pegatinas NFC',con:'Móvil',dif:'Fácil',est:'idea',t:'qr nfc pegatinas naves'},
 {n:'Pasarela casera',q:'Recibe por LoRa los nodos caseros y los sube por wifi.',uso:'Para empezar con los nodos del Taller sin comprar la pasarela LoRaWAN. Necesita wifi y enchufe.',prec:'20–30 €',ej:'Heltec V3 + cargador USB',con:'Wifi',dif:'Media',est:'idea',taller:'P',t:'pasarela casera receptor'}]},
{id:'control',n:'Control y actuadores',d:'Ventanas, malla, nebulización y bombas',ic:'M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0M14 4v4M8 10v4M16 16v4',it:[
 {n:'Controlador de clima profesional',q:'Abre ventanas, mueve mallas y nebuliza según el clima.',uso:'Ya tenéis uno. Su informe se puede leer con «Leer informe» en Clima y estrés.',prec:'Presupuesto con el instalador',ej:'Ordenadores de clima de las marcas de invernadero',con:'Suya (y a veces Modbus)',dif:'—',est:'app',t:'controlador clima ventanas'},
 {n:'Control sencillo por nave',q:'Termostato y humedostato industriales que abren o cierran motores.',uso:'Para naves sin control: barato y robusto, aunque no aprende nada.',prec:'Cientos de € por nave + electricista',ej:'Controladores de invernadero de gama básica',con:'Local',dif:'Media',est:'idea',t:'termostato humedostato basico'},
 {n:'Motores de ventanas con finales de carrera',q:'Abren y cierran las ventanas cenitales o laterales.',uso:'Sin motores no hay control automático. Siempre con cierre por viento y lluvia en la propia nave.',prec:'Presupuesto',ej:'Motorreductores para invernadero',con:'Cuadro eléctrico',dif:'Alta',est:'idea',t:'motor ventana cenital lateral'},
 {n:'Nebulización (fog)',q:'Agua a alta presión en gotas finísimas.',uso:'Baja la temperatura y sube la humedad en verano: menos estrés, menos araña roja, mejor cuaje.',prec:'Presupuesto por superficie',ej:'Sistemas de alta presión',con:'Electroválvula',dif:'Media',est:'idea',t:'nebulizacion fog humedad verano'},
 {n:'Malla de sombreo móvil',q:'Malla que se extiende o recoge sola.',uso:'Sombra solo cuando hace falta, en vez de blanqueo todo el verano.',prec:'Presupuesto',ej:'Pantallas térmicas y de sombreo',con:'Motor',dif:'Alta',est:'idea',t:'malla sombreo pantalla'},
 {n:'Relés por LoRa para bombas y válvulas',q:'Encender o apagar a distancia.',uso:'Siempre con seguridad local: la app manda órdenes, pero no debe ser lo único que decide.',prec:'50–150 €',ej:'Nodos LoRa con relé',con:'LoRaWAN',dif:'Alta',est:'idea',t:'rele remoto bomba'},
 {n:'Programador de riego con conexión',q:'Programador que deja leer o mandar programas.',uso:'Que la app vea los riegos reales de cada sector y no haya que apuntarlos.',prec:'Según marca',ej:'Programadores con app o API',con:'Su nube o Modbus',dif:'Media',est:'idea',t:'programador riego api'}]},
{id:'gente',n:'Personas, maquinaria y seguridad',d:'Equipo, tractores y accesos',ic:'M9 8.5a3 3 0 1 0 0-.01M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8M16.5 9.5a2.4 2.4 0 1 0 0-.01',it:[
 {n:'Fichaje y ubicación',q:'Entrada, salida y dónde está cada persona.',uso:'Ya en la app (Fichar y ubicación).',prec:'Gratis',ej:'La app',con:'Móvil',dif:'—',est:'app',t:'fichaje ubicacion personal'},
 {n:'Localizador GPS en tractores',q:'Dónde está y cuántas horas trabaja cada máquina.',uso:'Horas reales de maquinaria por nave para el coste.',prec:'20–60 € + cuota',ej:'Localizadores 4G',con:'4G',dif:'Fácil',est:'idea',t:'gps tractor maquinaria'},
 {n:'Telemetría del pulverizador',q:'Caudal, presión y velocidad al tratar.',uso:'Comprobar que la dosis fue la correcta y apuntarla sola en el cuaderno.',prec:'300–1.500 €',ej:'Caudalímetro y presión en el equipo',con:'Bluetooth o 4G',dif:'Media',est:'idea',t:'pulverizador dosis cuaderno'},
 {n:'Pulseras contra el golpe de calor',q:'Temperatura y pulso del trabajador.',uso:'Seguridad en verano dentro del invernadero.',prec:'50–200 €',ej:'Wearables de seguridad laboral',con:'Bluetooth',dif:'Media',est:'idea',t:'golpe calor seguridad laboral'},
 {n:'Registro de visitas',q:'Quién entra en cada nave y cuándo.',uso:'Clave contra el rugoso: si entra alguien de fuera, la app sabe qué naves vigilar.',prec:'Gratis',ej:'La app (por hacer)',con:'Móvil o QR',dif:'Fácil',est:'idea',t:'visitas rugoso accesos'},
 {n:'Cámaras de seguridad',q:'Vigilancia de accesos y almacenes.',uso:'Robos y control del almacén de fitosanitarios.',prec:'40–150 €',ej:'Cámaras de exterior',con:'Wifi o 4G',dif:'Fácil',est:'idea',t:'seguridad robos camaras'}]},
{id:'post',n:'Postcosecha y almacén',d:'Frío, trazabilidad y kilos',ic:'M3.5 8.5 12 4l8.5 4.5V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1zM8 20v-6h8v6',it:[
 {n:'Temperatura de la cámara frigorífica',q:'Temperatura y humedad de la cámara.',uso:'Aviso al móvil si se estropea de noche.',prec:'40–80 €',ej:'Sensores LoRa de temperatura',con:'LoRaWAN',dif:'Fácil',est:'idea',t:'camara frio averia'},
 {n:'Báscula conectada en la recolección',q:'Kilos de cada colla y nave sin apuntar.',uso:'El coste por kilo de cada nave sale exacto.',prec:'200–1.000 €',ej:'Básculas con Bluetooth o wifi',con:'Bluetooth o wifi',dif:'Media',est:'idea',t:'bascula kilos recoleccion coste'},
 {n:'Trazabilidad con QR en palés y cajas',q:'Cada palé lleva nave, día y colla.',uso:'Si el almacén encuentra un residuo, sabes de qué nave y de qué tratamiento viene.',prec:'Céntimos por etiqueta',ej:'Etiquetas QR impresas',con:'Móvil',dif:'Fácil',est:'idea',t:'trazabilidad qr lote residuos'},
 {n:'Etiquetas RFID',q:'Identificación sin escanear una a una.',uso:'Para mucho volumen; con QR suele bastar.',prec:'0,10–0,50 € la etiqueta + lectores',ej:'RFID UHF',con:'Lector',dif:'Media',est:'idea',t:'rfid cajas'},
 {n:'Sensor de etileno',q:'Gas que acelera la maduración.',uso:'Cámaras de maduración y conservación.',prec:'300–2.000 €',ej:'Sensores de etileno',con:'Analógico',dif:'Media',est:'idea',t:'etileno maduracion'},
 {n:'Almacén de fitosanitarios vigilado',q:'Temperatura y puerta abierta.',uso:'Los productos no deben pasar calor; y saber quién abre.',prec:'40–80 €',ej:'Sensores LoRa de temperatura y puerta',con:'LoRaWAN',dif:'Fácil',est:'idea',t:'almacen fitosanitarios puerta'}]},
{id:'ia',n:'IA y lo que hace la app',d:'Lo que ya tienes y lo que se puede hacer',ic:'M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',it:[
 {n:'Diagnóstico por foto',q:'Foto de la planta o de la instalación y la IA dice qué puede ser.',uso:'Ya en la app (IA incidencias).',prec:'Céntimos por consulta',ej:'La app',con:'—',dif:'—',est:'app',t:'diagnostico foto ia'},
 {n:'Clima y estrés',q:'DPV, hoja–aire, rocío y semáforo por nave.',uso:'Ya en la app; con sensores se rellena solo.',prec:'Gratis',ej:'La app',con:'—',dif:'—',est:'app',t:'estres dpv semaforo'},
 {n:'Previsión de plagas',q:'Grados-día y conteos: en qué semana viene la siguiente generación.',uso:'Ya en la app (Plagas), con el rugoso por contacto.',prec:'Gratis',ej:'La app',con:'—',dif:'—',est:'app',t:'plagas prevision grados dia'},
 {n:'Plazo de seguridad y cuaderno digital',q:'Avisos de no recolectar y registro electrónico de tratamientos.',uso:'Ya en la app (cuaderno y CSV del reglamento europeo).',prec:'Gratis',ej:'La app',con:'—',dif:'—',est:'app',t:'plazo seguridad cuaderno csv'},
 {n:'Coste de mano de obra por nave',q:'Horas, kilos por hora y euros por kilo.',uso:'Ya en la app (Rendimiento de las collas).',prec:'Gratis',ej:'La app',con:'—',dif:'—',est:'app',t:'coste mano obra kilo'},
 {n:'Leer informes por foto',q:'La IA saca los datos de un informe o pantalla.',uso:'Ya en la app para el clima; se puede ampliar a albaranes de abono y análisis de laboratorio.',prec:'Céntimos por lectura',ej:'La app',con:'—',dif:'—',est:'app',t:'leer informe albaran foto'},
 {n:'Previsión de kilos por nave',q:'Cuánto se va a cortar las próximas semanas.',uso:'Negociar con el almacén y organizar collas. Con los partes, el clima y el conteo de frutos.',prec:'Gratis (desarrollo)',ej:'Por hacer',con:'—',dif:'Media',est:'idea',t:'prevision kilos cosecha'},
 {n:'Riego por radiación automático',q:'La app calcula cuándo regar según el sol acumulado.',uso:'Necesita el sensor de radiación y el drenaje automático.',prec:'Gratis (desarrollo) + sensores',ej:'Por hacer',con:'—',dif:'Alta',est:'idea',t:'riego radiacion automatico'},
 {n:'Maqueta 3D en vivo de la finca',q:'Mapa 3D con foto aérea real y todas las capas.',uso:'Ver de un vistazo incidencias, collas, clima y plagas.',prec:'Gratis (desarrollo)',ej:'Por hacer',con:'—',dif:'Alta',est:'idea',t:'mapa 3d maqueta gemelo digital'},
 {n:'Asistente por chat',q:'Preguntas sobre tus datos en lenguaje normal.',uso:'Ya en la app (chat IA).',prec:'Céntimos por consulta',ej:'La app',con:'—',dif:'—',est:'app',t:'chat asistente ia'}]}
]};
/* Detalles de cada elemento (botón «Detalles»): q qué es · nec qué necesitas · p cómo hacerlo · d dónde comprarlo · o ojo con · m mantenimiento
   a en la app · b búsqueda para los enlaces de tienda · pro 1 = se compra por distribuidor o presupuesto (solo enlace de búsqueda general) */
window.CATALOGO.det=(()=>{const D={};
/* Clima y suelo */
D['Termohigrómetro con registro']={q:'Un aparato pequeño de pilas que mide la temperatura y la humedad del aire y guarda la máxima, la mínima y, en los mejores, el historial por horas.',
 nec:['Termohigrómetro con memoria (mejor con historial por horas y pantalla grande)','Garita o caja con lamas que le dé sombra','Brida o gancho para colgarlo'],
 p:['Elige una nave «representativa» (ni la más fresca ni la más caliente) o pon uno por nave si vas a medir estrés.','Cuélgalo en el centro de la nave, a la altura de la cabeza de la planta y siempre a la sombra (dentro de la garita).','Déjalo 30 minutos antes de leerlo la primera vez.','Cada mañana apunta en Clima y estrés la máxima, la mínima y la humedad; después borra la memoria.','Compáralo una vez con otro termómetro: si se va más de 1 °C, cámbiale la pila o el aparato.'],
 d:['Amazon.es o AliExpress: busca «termohigrómetro máxima mínima»','Tiendas de suministros agrícolas y ferreterías grandes','Si quieres historial: busca «data logger temperatura humedad USB» (se descarga al ordenador)'],
 o:['Al sol marca 5–6 °C de más: siempre a la sombra.','Colgado junto a la cubierta o al suelo da valores que no son los de la planta.','Los muy baratos fallan en humedad por encima del 90 %.'],
 m:'Pila cada año; limpiar el polvo y el blanqueo de la rejilla cada mes.',a:'Clima y estrés: con temperatura y humedad la app calcula el DPV, las horas de calor y los grados-día de Plagas.',b:'termohigrómetro máxima mínima'};
D['Sensor de temperatura y humedad LoRa']={q:'Lo mismo que el termohigrómetro, pero manda el dato solo por radio LoRa cada 10 minutos. La pila dura años y no hace falta wifi en la nave.',
 nec:['Sensor en versión europea EU868 (ej. Dragino LHT65N con sonda externa)','Garita para la sonda','Pasarela LoRaWAN (una para toda la finca)','Cuenta gratuita en The Things Network'],
 p:['Compra la versión EU868 (la de 915 MHz no vale en Europa).','Instala primero la pasarela y comprueba que está conectada.','Da de alta el sensor en The Things Network con los códigos de su caja (DevEUI, AppEUI y AppKey).','Pulsa el botón del sensor y mira que llega el primer dato.','Mete la sonda en la garita, en el centro de la nave y a la altura de la planta; el cuerpo del sensor puede ir atado al poste.','Durante una semana compáralo con el termohigrómetro de mano.'],
 d:['Tienda oficial de Dragino en AliExpress (fíjate en que ponga EU868)','Distribuidores europeos de LoRaWAN (busca el modelo exacto)','Alternativas parecidas: Milesight EM300-TH'],
 o:['Comprar la banda equivocada (US915/AS923).','Dejar la sonda al sol o tocando el plástico.','Pensar que manda datos sin pasarela: sin ella no funciona.'],
 m:'Revisar la batería en la consola cada pocos meses (dura 3–5 años) y limpiar la garita.',a:'Cuando conectemos el servidor puente, rellena Clima y estrés y Plagas sin apuntar nada.',b:'Dragino LHT65N EU868'};
D['Garita contra la radiación']={q:'Una caja de platos o lamas blancas que deja pasar el aire pero no el sol. Sin ella, cualquier sensor de aire mide de más.',
 nec:['Garita comprada o impresa en 3D (PETG o ASA blanco, no PLA)','Brida o abrazadera para el poste'],
 p:['Elige el sitio: centro de la nave, a la altura de la planta, lejos de la calefacción y de la puerta.','Mete el sensor dentro sin que toque los platos.','Átala vertical para que el aire circule.','Comprueba que no le da el sol directo en ninguna hora del día.'],
 d:['Amazon.es o AliExpress: busca «radiation shield» o «protector de radiación estación meteorológica»','Imprimirla tú: hay diseños gratis en Printables y Thingiverse (busca «Stevenson screen»)'],
 o:['PLA al sol del invernadero se deforma: usa PETG o ASA.','Pintada de oscuro se calienta: siempre blanca.'],
 m:'Limpiar polvo y telarañas cada mes.',a:'Hace que los datos de Clima y estrés sean de fiar.',b:'radiation shield sensor'};
D['Radiación solar (piranómetro)']={q:'Mide la energía del sol que llega al cultivo (W/m²). Sumándola durante el día sale cuánto debe regar la planta: más sol, más agua.',
 nec:['Piranómetro (fotodiodo calibrado o profesional) con salida 0–5 V, 4–20 mA o Modbus','Nodo del Taller N7 si es de 4–20 mA','Soporte horizontal por encima del cultivo'],
 p:['Decide dónde va: dentro de la nave (lo que recibe la planta) o fuera (para comparar con lo que quita el plástico).','Móntalo totalmente horizontal (con nivel de burbuja) y sin sombras de alambres ni postes.','Conecta la salida al nodo (Taller N7 para 4–20 mA).','Comprueba un día despejado: al mediodía en Murcia, fuera, deben salir unos 800–1.000 W/m² en verano.','Deja una o dos semanas registrando antes de usarlo para regar.'],
 d:['Profesional: Apogee (SP-110/SP-510) o Hukseflux por distribuidores de instrumentación (pide presupuesto)','Económico: busca «piranómetro 4-20mA» en AliExpress (fiabilidad más baja)'],
 o:['El blanqueo y el polvo sobre el sensor bajan la lectura: límpialo.','Un sensor inclinado da errores grandes por la mañana y la tarde.'],
 m:'Limpiar la cúpula cada semana en verano; los profesionales se recalibran cada 2 años.',a:'Base del futuro «Riego por radiación automático».',b:'piranómetro 4-20mA',pro:0};
D['Sensor PAR (luz útil)']={q:'Mide solo la luz que usa la planta para hacer la fotosíntesis (en µmol/m²/s). Sirve para ver cuánta luz quitan el plástico, el blanqueo o la malla.',
 nec:['Sensor PAR (ej. Apogee SQ-500 o SQ-110)','Medidor de mano o nodo con entrada analógica'],
 p:['Mide a la misma hora fuera y dentro de la nave (mejor a mediodía y con cielo despejado).','Divide dentro entre fuera: es el % de luz que entra.','Repite en cada nave con blanqueo distinto.','En otoño, si entra menos del 60–65 % de la luz, valora quitar el blanqueo.'],
 d:['Apogee por distribuidores de instrumentación agrícola en España (pide presupuesto)','Medidores PAR de mano económicos: busca «medidor PAR cuántico» en Amazon.es'],
 o:['Los luxómetros baratos no miden PAR.','Comparar medidas tomadas a distinta hora no sirve.'],
 m:'Limpiar el sensor antes de cada medida.',a:'De momento se apunta en Notas; se puede añadir a Clima y estrés si lo usas a menudo.',b:'sensor PAR Apogee SQ'};
D['CO₂']={q:'Mide el CO₂ del aire en ppm. Con las ventanas cerradas en invierno, la planta lo gasta y baja de 400 ppm: crece menos.',
 nec:['Casero: Sensirion SCD41 + nodo del Taller N8 (con enchufe)','Profesional: sonda NDIR (Vaisala GMP252 u otra) con salida 4–20 mA'],
 p:['Monta el nodo N8 en el Taller (piezas, esquema y código).','Colócalo en el centro de la nave, a la altura de la planta, a la sombra y lejos de la calefacción y de la gente.','Déjalo una semana: aprende solo (autocalibración) si un rato al día le llega aire de fuera.','Mira el dato a primera hora con todo cerrado: si baja de 350 ppm al mediodía, toca ventilar o enriquecer.'],
 d:['Placa SCD41: Amazon.es o AliExpress (busca «SCD41 sensor»), o Mouser/DigiKey','Profesional: Vaisala por distribuidor (pide presupuesto)'],
 o:['Los sensores baratos «eCO2» (CCS811, SGP30) no miden CO₂ de verdad: compra uno NDIR o fotoacústico como el SCD41.','Respirarle encima da picos falsos.'],
 m:'Comprobarlo dos veces al año al aire libre (debe marcar unos 420 ppm).',a:'Se puede mostrar en Clima y estrés junto al DPV.',b:'SCD41 sensor CO2'};
D['Temperatura de la hoja (infrarrojos)']={q:'Mide la temperatura de la hoja sin tocarla. Una hoja más caliente que el aire significa que la planta ha cerrado los estomas: le falta agua o tiene estrés.',
 nec:['Pistola de infrarrojos con emisividad ajustable (ej. UNI-T UT300)','O sensor MLX90614 en el nodo casero N4'],
 p:['Pon la emisividad en 0,95–0,97 (hojas).','Mide a mediodía, siempre a la misma hora, y a 20–30 cm de hojas sanas y al sol.','Apunta a la hoja, no al cielo ni al suelo; haz 3–5 medidas y saca la media.','Apunta en Clima y estrés la temperatura de hoja y la del aire de ese momento.','Con 6 días de planta sana bien regada, guarda la calibración del índice de estrés.'],
 d:['Amazon.es o AliExpress: busca «UNI-T UT300» o «termómetro infrarrojos emisividad ajustable»','Ferreterías y tiendas de herramientas'],
 o:['Pistolas de emisividad fija dan la hoja más fría.','Medir hojas mojadas o a la sombra no sirve para comparar.'],
 m:'Limpiar la lente; pila cuando la pantalla parpadee.',a:'Clima y estrés: diferencia hoja–aire, semáforo y CWSI.',b:'UNI-T UT300 termómetro infrarrojos'};
D['Humectación de hoja']={q:'Una «hoja artificial» que detecta cuándo está mojada (rocío, goteo, nebulización) y cuánto tiempo. Las horas de hoja mojada disparan botritis y mildiu.',
 nec:['Sensor de humectación de hoja con salida analógica o LoRa','Nodo con entrada analógica (o versión LoRa directamente)'],
 p:['Colócalo entre las plantas, inclinado unos 45° y orientado como las hojas.','A la altura donde suele empezar la botritis (zona baja–media).','Ajusta el umbral de «mojado» viendo cómo responde con rocío de madrugada.','Revisa que cuente horas de mojado parecidas a lo que ves en las hojas.'],
 d:['METER (PHYTOS 31) o Pessl por distribuidores (pide presupuesto)','Económicos: busca «leaf wetness sensor» en AliExpress'],
 o:['Instalado horizontal acumula agua y cuenta horas de más.','El polvo y el blanqueo cambian la lectura: límpialo.'],
 m:'Limpiar cada 2 semanas.',a:'Plagas: las horas de hoja mojada mejorarían el riesgo de botritis.',b:'leaf wetness sensor'};
D['Estación meteorológica exterior']={q:'Mide fuera del invernadero viento, lluvia, temperatura, humedad y radiación de tu finca, no los de la zona.',
 nec:['Estación con anemómetro, pluviómetro, temperatura/humedad y radiación','Mástil de 3–10 m bien anclado','Conexión: 4G, wifi o LoRa'],
 p:['Busca un sitio despejado y alejado de naves y árboles (al menos 2–3 veces su altura).','Pon el anemómetro en lo más alto del mástil (ideal 10 m; mínimo por encima de las cubiertas).','Nivela el pluviómetro.','Conéctala y comprueba que llegan los datos.','Compara una semana con la previsión de la app.'],
 d:['Pessl iMETOS (distribuidor en España, con cuota de datos)','Davis Vantage Pro2 (distribuidores y tiendas online)','Estaciones LoRaWAN (ej. Dragino, Milesight)'],
 o:['El anemómetro a la sombra de una nave mide menos viento del real.','Sin cuota algunas marcas no dan los datos.'],
 m:'Limpiar el pluviómetro cada mes y revisar el mástil tras cada temporal.',a:'Se mostraría en Clima y estrés junto a lo de fuera de «Leer informe».',b:'estación meteorológica Davis Vantage Pro2'};
D['Anemómetro y pluviómetro']={q:'Dos sensores sencillos: el de viento da pulsos al girar y el de lluvia da un pulso por cada vuelco de su cazoleta. Los cuenta el nodo N6.',
 nec:['Anemómetro de cazoletas con salida de pulsos (reed)','Pluviómetro de cazoletas (0,2 mm por pulso)','Nodo del Taller N6 (pulsos, con placa solar)','Mástil'],
 p:['Monta el N6 en el Taller (piezas, esquema, caja 3D y código).','Anemómetro en lo alto del mástil, por encima de las cubiertas.','Pluviómetro nivelado, sin nada encima.','Pon en el código cuánto vale cada pulso (lo dice el fabricante).','Comprueba el pluviómetro echando agua con una probeta.'],
 d:['Amazon.es o AliExpress: busca «anemómetro pulsos reed» y «pluviómetro balancín»','Recambios de estaciones meteorológicas (Misol, Davis)'],
 o:['El reed rebota: el código del N6 ya lo filtra, no lo quites.','Un pluviómetro desnivelado cuenta mal.'],
 m:'Limpiar hojas y bichos del pluviómetro cada mes.',a:'Cierre de ventanas por viento y lluvias en el cuaderno (zona vulnerable).',b:'anemómetro pluviómetro pulsos reed'};
D['Cámara térmica para el móvil']={q:'Una cámara pequeña que se enchufa al móvil y muestra la temperatura de todo lo que ves en colores. Lo frío y lo caliente salta a la vista.',
 nec:['Cámara térmica para móvil (con el conector de tu móvil: Lightning o USB-C)','La app del fabricante'],
 p:['Comprueba el conector de tu móvil antes de comprar (los iPhone nuevos llevan USB-C).','Instala la app del fabricante y conecta la cámara.','Recorre las naves a mediodía: plantas más calientes que las de al lado = les falta agua (gotero atascado).','Revisa motores, bombas y cuadros eléctricos: un punto mucho más caliente que el resto avisa de avería.','Al regar, busca manchas frías en el suelo: fugas.'],
 d:['Amazon.es, PcComponentes o tiendas de herramientas profesionales: busca «FLIR One» o «InfiRay P2 Pro»'],
 o:['Los objetos brillantes (metal, plástico) engañan: mira la diferencia, no el número.','Con el sol de lado salen reflejos falsos.'],
 m:'Ninguno: tapar la lente al guardarla.',a:'Las fotos se adjuntan a una incidencia y la IA las puede revisar.',b:'InfiRay P2 Pro cámara térmica móvil'};
D['Nodo casero de clima y hoja']={q:'El aparato N4 del Taller: en una caja mide temperatura y humedad del aire (SHT40) y la temperatura de la hoja (MLX90614), y lo manda por LoRa con placa solar.',
 nec:['Heltec WiFi LoRa 32 V3 (868 MHz)','SHT40 y MLX90614 de 3,3 V','Pila 18650, cargador CN3791 y placa solar de 6 V','Garita, caja impresa y cables','Pasarela (comprada o la casera P)'],
 p:['Abre «Diseñarlo en el Taller» y revisa la lista de piezas.','Compra las piezas (la lista del Taller trae lo que buscar).','Monta en la mesa siguiendo el esquema: sin errores en rojo.','Carga el código de la ficha con Arduino y comprueba los datos por USB.','Imprime la caja y monta el SHT40 en la garita y el MLX90614 apuntando a las hojas a 20–30 cm.','Déjalo dos días en la mesa y una semana en la nave comparando con la pistola y el termohigrómetro.'],
 d:['Heltec V3: tienda oficial de Heltec en AliExpress o Amazon.es (versión 868 MHz)','SHT40 y MLX90614: Amazon.es o AliExpress (busca la versión de 3,3 V)','Pila 18650 de marca (Samsung, LG, Panasonic) en tiendas de baterías'],
 o:['MLX90614 de 5 V quema el bus de 3,3 V: compra la de 3,3 V.','Polaridad del conector JST de la batería: compruébala con el polímetro.','El MLX90614 tiene un ángulo de visión ancho: si ve suelo o cielo, mide mal.'],
 m:'Limpiar la lente del MLX y la garita cada mes; batería cada 2–3 años.',a:'Rellena Clima y estrés solo en una nave: DPV, hoja–aire y semáforo.',b:'Heltec WiFi LoRa 32 V3 868'};
D['Humedad capacitiva casera']={q:'Una sonda barata que mide la humedad del sustrato por capacitancia (no se oxida como las de dos pinchos). Sirve para comparar y ver tendencias, no da un valor exacto.',
 nec:['Sonda capacitiva v1.2 (chip TLC555)','Nodo del Taller N2 con placa solar','Barniz o termorretráctil para proteger la electrónica de la sonda'],
 p:['Monta el N2 en el Taller.','Sella con barniz o termorretráctil la parte de arriba de la sonda (la electrónica no puede mojarse).','Calíbrala: anota la lectura en el aire (seco) y metida en agua (mojado).','Clávala en el saco siempre a la misma profundidad y a la misma distancia del gotero.','Mira cómo sube con cada riego y baja entre riegos: eso es lo útil.'],
 d:['Amazon.es o AliExpress: busca «sensor humedad capacitivo v1.2» (mira que lleve el chip TLC555, no el NE555)'],
 o:['Las que llevan NE555 no funcionan a 3,3 V.','No mide sales: con CE alta la lectura sube.','Cambiar de sitio la sonda cambia el valor.'],
 m:'Revisar el sellado cada temporada; son tan baratas que se cambian.',a:'Tendencia de humedad por nave; con el drenaje dice si sobra o falta riego.',b:'sensor humedad capacitivo v1.2 TLC555'};
D['Humedad, temperatura y CE del sustrato']={q:'Una sonda que mide a la vez el agua, la temperatura y las sales (CE) dentro del saco o el suelo. Es el dato que más dice de lo que pasa en la raíz.',
 nec:['Sonda RS485 Modbus (económica) o METER TEROS 12 (profesional)','Nodo del Taller N3 (RS485)','Placa solar y batería'],
 p:['Monta el N3 en el Taller (lleva el convertidor RS485).','Clava la sonda en un saco representativo, entre dos goteros y entera dentro del sustrato.','Configura la dirección Modbus y la velocidad que diga el fabricante.','Compara la CE con la del drenaje durante una semana.','Pon otra sonda en una nave distinta para comparar.'],
 d:['Económicas: AliExpress, busca «soil moisture EC temperature RS485»','Profesional: METER TEROS 12 por distribuidor (pide presupuesto)'],
 o:['La CE de la sonda no es la del drenaje: compárala, no la mezcles.','Huecos de aire alrededor de la sonda falsean todo.','Las económicas varían mucho entre unidades.'],
 m:'Revisar que no se ha movido al trabajar el cultivo.',a:'Se mostraría con el drenaje en Riego: si se acumulan sales entre riegos.',b:'soil moisture EC temperature RS485 sensor'};
D['Bandeja de pesada (balanza de sustrato)']={q:'Una bandeja con varias plantas sobre una báscula. Lo que pierde de peso es el agua que consume la planta; cuando ha gastado lo que toca, se riega.',
 nec:['Células de carga (4 de 50–200 kg) y amplificador HX711, o balanza comercial','Bandeja de cultivo con su drenaje','Nodo LoRa','Mucha paciencia para calibrar'],
 p:['Elige una línea representativa y pon la bandeja con 4–8 plantas.','Monta las células de carga sobre una base firme y nivelada.','Calibra con pesos conocidos (sacos de agua medidos).','Registra unos días: verás bajar el peso de día y subir en cada riego.','Primero solo mira; cuando te fíes, úsalo para decidir los riegos.'],
 d:['Comerciales: Hortimax, Grodan y otras marcas de riego (presupuesto)','Casera: células de carga y HX711 en Amazon.es o AliExpress'],
 o:['El crecimiento de la planta y los frutos también pesan: hay que corregirlo cada semana.','El viento y los golpes mueven la lectura.','Es el proyecto más difícil de esta carpeta.'],
 m:'Recalibrar cada mes y al cambiar de cultivo.',a:'Base para un riego por demanda en la app (por desarrollar).',b:'célula de carga 50kg HX711'};
D['Tensiómetro']={q:'Un tubo con agua y una cápsula cerámica que mide cuánto le cuesta a la raíz sacar agua del suelo (centibares). En suelo dice cuándo regar.',
 nec:['Tensiómetro de la longitud de tu raíz (30–60 cm)','Agua destilada','Barrena para hacer el agujero'],
 p:['Deja la cápsula en agua 24 horas antes.','Haz un agujero del diámetro del tubo y mete el tensiómetro con barro en el fondo para que haga buen contacto.','Llénalo de agua destilada y quita el aire.','Lee todos los días a la misma hora.','En suelo arenoso riega a unos 10–20 cb; en suelo pesado algo más.'],
 d:['Irrometer y otros en tiendas de riego y suministros agrícolas','Amazon.es: busca «tensiómetro suelo»'],
 o:['En sustrato (coco, lana de roca) apenas sirve.','Si entra aire, marca mal: rellenar.'],
 m:'Rellenar de agua cada semana y quitarlo en invierno si hiela.',a:'Se apunta en Notas o en las lecturas del día.',b:'tensiómetro suelo Irrometer'};
D['Temperatura de raíz']={q:'Una sonda metálica sumergible (DS18B20) que mide la temperatura del sustrato. En invierno, raíz por debajo de 15 °C absorbe mal aunque el abono esté bien.',
 nec:['Sonda DS18B20 sumergible (con cable)','Nodo del Taller N5','Resistencia de 4,7 kΩ (va en la lista del Taller)'],
 p:['Monta el N5 en el Taller.','Clava la sonda en el saco a 5–10 cm de profundidad, lejos del gotero.','Comprueba que en el código sale una temperatura lógica.','Mira a primera hora en invierno: es cuando más fría está.'],
 d:['Amazon.es o AliExpress: busca «DS18B20 sumergible» (mejor en lotes de 5)'],
 o:['Sin la resistencia de 4,7 kΩ no lee.','Hay copias que fallan: compra en lote y prueba todas.'],
 m:'Ninguno.',a:'Se mostraría en Clima y estrés; útil para ajustar el riego de invierno.',b:'DS18B20 sumergible'};
D['Oxígeno en la raíz']={q:'Una sonda óptica que mide el oxígeno dentro del sustrato. Si se riega de más, la raíz se ahoga.',
 nec:['Sonda óptica de oxígeno para suelo/sustrato','Registrador con Modbus o analógico'],
 p:['Úsalo como ensayo en una sola nave.','Clava la sonda en el saco entre goteros.','Registra varios días con riegos distintos.','Si baja mucho tras cada riego, espacia riegos o baja volumen.'],
 d:['Fabricantes de instrumentación científica por distribuidor (pide presupuesto)'],
 o:['Caro y delicado: más para investigación.','Con el drenaje y la humedad del saco ya se ve casi lo mismo.'],
 m:'Calibrar según el fabricante.',a:'Solo como ensayo; no hace falta en el día a día.',b:'sonda óptica oxígeno suelo',pro:1};
D['Sensores NPK de suelo «3 en 1» baratos']={q:'Sondas que dicen medir nitrógeno, fósforo y potasio. En realidad calculan una estimación a partir de la CE.',
 nec:['Nada: no recomendado'],
 p:['No comprarlo.','Para saber el abono: análisis de laboratorio de la solución y del drenaje.','A diario: CE y pH del drenaje.','Para nitratos rápido: medidor portátil de nitratos.'],
 d:['—'],
 o:['Los números cambian con la humedad y las sales, no con el abono real.'],
 m:'—',a:'La CE y el pH del drenaje ya se apuntan en la app.',b:''};
/* Agua, planta y plagas */
D['Nivel de depósitos (ultrasonidos)']={q:'Un sensor en la tapa del depósito mide la distancia hasta el líquido con ultrasonidos. Con la medida del depósito la app sabe los litros que quedan.',
 nec:['Casero: sensor estanco A02YYUW + nodo del Taller N1','Comercial: Dragino LDDS75 (LoRaWAN, con pila)','Soporte en la tapa, centrado y lejos de la pared'],
 p:['Casero: monta el N1 en el Taller. Comercial: dalo de alta en la pasarela.','Haz un agujero en la tapa y fija el sensor vertical, mirando al líquido.','Mide a mano la altura del depósito vacío hasta el sensor y apúntala.','Compara con la regla tres días seguidos.','Si mide saltos, aléjalo de la entrada de agua y del agitador.'],
 d:['A02YYUW: Amazon.es, AliExpress o DFRobot (busca «A02YYUW»)','Dragino LDDS75: tienda oficial Dragino en AliExpress o distribuidores LoRaWAN (EU868)'],
 o:['Menos de 3 cm entre el sensor y el líquido lleno: no lee.','La espuma y el vapor del ácido confunden al ultrasonidos (para ácido, radar).','Pegado a la pared rebota el eco.'],
 m:'Limpiar la cara del sensor si hay cristales de abono.',a:'Rellenar depósito y aviso de errores de inyección si baja distinto de lo que dice la receta.',b:'A02YYUW ultrasonic sensor'};
D['Nivel por radar']={q:'Como el de ultrasonidos, pero con ondas de radar a 80 GHz. No le afectan el vapor, la espuma ni los ácidos.',
 nec:['Radar de nivel 80 GHz con salida 4–20 mA','Nodo del Taller N7 (con enchufe)','Racor o soporte en la tapa'],
 p:['Monta el N7 en el Taller.','Fija el radar en la tapa, vertical y lejos de las paredes.','Configura en el radar el rango (altura del depósito).','Comprueba lleno y casi vacío con la regla.'],
 d:['Marcas profesionales (VEGA, Endress+Hauser) por distribuidor','Económicos: busca «radar level sensor 80GHz 4-20mA» en AliExpress'],
 o:['El cable 4–20 mA tiene polaridad: revisa el esquema.','Pide uno con materiales para ácido si va en el de nítrico.'],
 m:'Casi ninguno.',a:'Mismo uso que el nivel por ultrasonidos, para los depósitos de ácido.',b:'radar level sensor 80GHz 4-20mA'};
D['Contador con salida de pulsos']={q:'Muchos contadores de agua tienen (o admiten) un emisor que da un pulso cada X litros. El nodo N6 los cuenta y manda el agua gastada.',
 nec:['Contador con emisor de pulsos (o el emisor compatible con tu contador)','Nodo del Taller N6','Cable de 2 hilos'],
 p:['Mira en la esfera de tu contador si acepta emisor de pulsos y cuántos litros vale cada pulso.','Compra el emisor de esa marca y modelo.','Monta el N6 en el Taller y pon en el código los litros por pulso.','Conecta los dos hilos del emisor al nodo.','Compara un día con la lectura de la esfera.'],
 d:['Emisores de pulsos: la misma marca del contador, en tiendas de riego','Contadores Woltman con emisor: tiendas de riego y suministros agrícolas'],
 o:['Un emisor de otra marca no encaja.','Si no pones bien los litros por pulso, todo sale multiplicado.'],
 m:'Ninguno; revisar el cable si se corta el dato.',a:'Cuentas del día sin apuntar m³ y avisos de caudal bajo (goteros) o alto (rotura).',b:'emisor de pulsos contador agua Woltman'};
D['Caudalímetro electromagnético']={q:'Mide el caudal de agua con un campo magnético, sin piezas que se muevan. Muy preciso y no se atasca.',
 nec:['Caudalímetro electromagnético del diámetro de tu tubería','Fontanero para montarlo','Salida de pulsos, 4–20 mA o Modbus hacia un nodo'],
 p:['Pide presupuesto con el diámetro y caudal máximo del cabezal.','Montaje con tramos rectos antes y después (lo dice el fabricante).','Conecta su salida al nodo (N6 pulsos o N7 4–20 mA).','Compara con el contador durante una semana.'],
 d:['Siemens, Krohne, Endress+Hauser o las marcas de riego por distribuidor (pide presupuesto)'],
 o:['Necesita tubería siempre llena y tramos rectos.','Necesita corriente.'],
 m:'Casi ninguno.',a:'Agua aplicada exacta por cabezal.',b:'caudalímetro electromagnético riego',pro:1};
D['Presión (transductores)']={q:'Un sensor que se rosca en la tubería y manda la presión con una señal 4–20 mA. Antes y después del filtro dice cuándo está sucio.',
 nec:['Transductor 0–10 bar, salida 4–20 mA, rosca de tu toma (¼" o ½")','Nodo del Taller N7 (con enchufe, eleva a 12 V)','Teflón y una T con toma'],
 p:['Monta el N7 en el Taller.','Pon un transductor antes y otro después del filtro (o uno por sector).','Conecta según el esquema: el 4–20 mA tiene polaridad.','Comprueba con un manómetro que coinciden.','Apunta la diferencia con el filtro limpio: si sube 0,5 bar o más, toca limpiar.'],
 d:['Económicos: Amazon.es o AliExpress, busca «transductor presión 4-20mA 10 bar acero inoxidable»','Profesional: WIKA y otros por distribuidor'],
 o:['Rango demasiado alto (25 bar) pierde precisión.','Golpes de ariete los rompen: mejor de acero inoxidable.'],
 m:'Comprobar contra manómetro cada temporada.',a:'Riego → Mapa de la finca → Instalación: aviso de limpiar filtros y de sectores que no abren.',b:'transductor presión 4-20mA 10 bar'};
D['CE y pH en línea']={q:'Sondas fijas en la tubería que miden la CE y el pH de lo que sale al riego todo el tiempo.',
 nec:['Sonda de CE y sonda de pH industriales con transmisor 4–20 mA o Modbus','Portasondas o by-pass en la tubería','Soluciones de calibración'],
 p:['Instálalas en un by-pass para poder sacarlas sin parar el riego.','Calibra con las soluciones (pH 4 y 7; CE 1,41 y 12,88 mS/cm).','Compara una semana con tu medidor de mano.','Calibra cada mes: el pH se desvía.'],
 d:['Hanna Instruments, Bluelab y fabricantes industriales por distribuidor','Muchos programadores de riego ya las traen: pregunta a tu instalador'],
 o:['La sonda de pH seca se estropea: siempre mojada.','Sin calibrar, peor que no tenerla.'],
 m:'Calibrar cada mes; la sonda de pH se cambia cada 1–2 años.',a:'Vigilar la receta en tiempo real.',b:'sonda pH CE en línea 4-20mA Hanna',pro:1};
D['Drenaje automático en la bandeja']={q:'Un pluviómetro de cazoletas pequeñas debajo del drenaje de una bandeja: cada vuelco son unos mililitros. Con el agua aportada, sale solo el % de drenaje.',
 nec:['Pluviómetro de balancín pequeño o cazoleta casera de 2–5 ml','Nodo del Taller N6','Embudo y canal para llevar el drenaje','Gotero testigo (para saber lo aportado)'],
 p:['Elige una bandeja representativa y recoge todo su drenaje en un embudo.','Monta el N6 en el Taller y conecta la cazoleta.','Calibra: echa 1 litro despacio y cuenta los vuelcos; apunta ml por vuelco.','Pon un gotero testigo con recogida para saber lo aportado.','Compara una semana con la probeta.'],
 d:['Pluviómetros de balancín: Amazon.es o AliExpress (busca «pluviómetro balancín reed»)','Cazoleta impresa en 3D (diseños «tipping bucket» en Printables)'],
 o:['Las raíces y el sustrato atascan el embudo: rejilla.','Si el agua cae muy rápido la cazoleta cuenta de menos: calibra al caudal real.'],
 m:'Limpiar el embudo cada semana.',a:'El drenaje % sale solo, riego a riego.',b:'pluviómetro balancín reed'};
D['CE y pH del drenaje']={q:'Las mismas sondas que en línea, pero en el drenaje de la bandeja: avisan si se acumulan sales en el saco.',
 nec:['Sondas de CE y pH en la recogida del drenaje','Recipiente donde la sonda quede siempre mojada'],
 p:['Instala las sondas en un vaso que se renueve con cada drenaje.','Calibra igual que las de línea.','Compara con la probeta y el medidor de mano.'],
 d:['Hanna, Bluelab o fabricantes industriales por distribuidor'],
 o:['Si el vaso se seca, la sonda de pH se estropea.'],
 m:'Calibrar cada mes.',a:'Completaría el drenaje automático.',b:'sonda CE pH drenaje'};
D['Temperatura de la solución']={q:'La misma sonda DS18B20 que la de raíz, metida en el depósito o la tubería de solución.',
 nec:['Sonda DS18B20 sumergible','Nodo del Taller N5'],
 p:['Monta el N5 en el Taller.','Mete la sonda en el depósito de solución o en una vaina en la tubería.','En verano, si pasa de 25–26 °C, valora sombrear el depósito.'],
 d:['Amazon.es o AliExpress: busca «DS18B20 sumergible»'],
 o:['La sonda al sol mide su propia temperatura, no la del agua.'],
 m:'Ninguno.',a:'Se mostraría con el resto del riego.',b:'DS18B20 sumergible'};
D['Oxígeno disuelto']={q:'Sonda óptica que mide el oxígeno en el agua. Útil en balsas con algas o agua recirculada.',
 nec:['Sonda óptica de oxígeno disuelto con Modbus','Nodo con RS485 (Taller N3) o registrador'],
 p:['Úsala primero con un medidor de mano para ver si hay problema.','Si lo hay, sonda fija en la balsa.','Mide a primera hora (es cuando menos oxígeno hay).'],
 d:['Hanna, YSI y otros por distribuidor'],
 o:['En agua de pozo limpia no suele hacer falta.'],
 m:'Limpiar y calibrar según fabricante.',a:'Solo si hay problema de algas o recirculación.',b:'sonda óptica oxígeno disuelto',pro:1};
D['Nitratos (ion selectivo)']={q:'Medidor de bolsillo que da los nitratos de una gota de solución, drenaje o savia en un minuto.',
 nec:['Horiba LAQUAtwin NO3 o tiras de nitrato (más baratas)','Soluciones de calibración'],
 p:['Calibra con las dos soluciones antes de cada tanda.','Mide gotero, drenaje y, si quieres, savia (pecíolo prensado).','Apunta en el cuaderno: zona vulnerable a nitratos.','Compara de vez en cuando con laboratorio.'],
 d:['Horiba LAQUAtwin: distribuidores de laboratorio y Amazon.es','Tiras de nitratos: tiendas de laboratorio (busca «tiras nitratos Quantofix»)'],
 o:['Sin calibrar da números falsos.','Sensible a la temperatura.'],
 m:'Guardar con la tapa y el sensor limpio.',a:'Cuaderno y vigilancia de nitratos.',b:'Horiba LAQUAtwin NO3'};
D['Consumo eléctrico de la bomba']={q:'Una pinza que abraza un cable de la bomba (sin cortar nada) y mide la corriente. Dice si la bomba está encendida, cuántas horas y si trabaja forzada.',
 nec:['Pinza SCT-013-030 (30 A, salida en voltios)','Nodo del Taller N9 (con enchufe)','Electricista si hay que abrir el cuadro'],
 p:['Monta el N9 en el Taller.','Con el cuadro sin tensión, abraza UNO solo de los cables de fase (no la manguera entera).','Conecta la pinza al nodo.','Apunta el consumo normal con la bomba sana.','Si sube mucho (forzada) o es 0 cuando debería regar, avisa.'],
 d:['Amazon.es o AliExpress: busca «SCT-013-030»'],
 o:['Si abrazas la manguera entera con fase y neutro, marca 0.','La versión SCT-013-000 da corriente, no voltios: compra la -030.','Dentro del cuadro: siempre con electricista.'],
 m:'Ninguno.',a:'Horas reales de riego y aviso de bomba que no arranca.',b:'SCT-013-030'};
D['Electroválvula con mando a distancia']={q:'Una electroválvula de bajo consumo (latch) que se abre o cierra por radio LoRa. Para regar o cortar una fuga sin ir a la finca.',
 nec:['Electroválvula latch del diámetro del sector','Controlador LoRaWAN de válvula (o nodo con relé)','Pasarela LoRaWAN','Seguridad local: que el programador siga mandando'],
 p:['Empieza por un sector que no sea crítico.','Instala la válvula y el controlador.','Dalo de alta en la pasarela.','Prueba abrir y cerrar desde el ordenador.','Deja siempre un cierre por tiempo máximo en el propio controlador.'],
 d:['Tiendas de riego (electroválvulas latch de 9–12 V)','Controladores LoRaWAN de válvula de fabricantes como Milesight o Dragino'],
 o:['Si se corta la radio, la válvula debe cerrarse sola: compruébalo.','No sustituye al programador de riego.'],
 m:'Revisar la pila del controlador cada temporada.',a:'Pendiente de desarrollar el mando en la app, siempre con confirmación.',b:'controlador válvula LoRaWAN'};
D['Dendrómetro']={q:'Un sensor que abraza el tallo y mide su grosor con precisión de micras. El tallo encoge cuando falta agua, antes de que se vea la planta lacia.',
 nec:['Dendrómetro de tallo para tomate','Registrador o nodo LoRa'],
 p:['Pon 2–3 en plantas representativas de una nave.','Colócalos en un tramo de tallo sin hojas, sin apretar.','Mira la curva diaria: encoge de día y recupera de noche.','Si no recupera de noche, a la planta le falta agua.'],
 d:['Ecomatik y otros fabricantes científicos (pide presupuesto)','Phytech funciona como servicio con suscripción'],
 o:['Al subir la planta hay que recolocarlo.','Interpretarlo requiere práctica.'],
 m:'Recolocar cada pocas semanas.',a:'Para ensayo; se podría unir al índice de estrés.',b:'dendrómetro tallo',pro:1};
D['Flujo de savia']={q:'Sensores que calientan un poco el tallo y miden cuánto se lleva el agua: es la transpiración real de la planta.',
 nec:['Sensores de flujo de savia','Registrador','Asesoramiento técnico'],
 p:['Solo como ensayo en una nave.','Instalación según fabricante.','Comparar con el riego aplicado.'],
 d:['Implexx, Dynamax por distribuidor (pide presupuesto)'],
 o:['Caro y delicado; no para todas las naves.'],
 m:'Según fabricante.',a:'Solo ensayo.',b:'sap flow sensor',pro:1};
D['Cámara fija por nave']={q:'Una cámara de exterior en cada nave que hace fotos a horas fijas. La IA de la app las revisa y propone incidencias.',
 nec:['Cámara de exterior con wifi o cable de red (IP65 o más)','Wifi o cable hasta la nave','Enchufe o alimentación por cable de red (PoE)'],
 p:['Antes de comprar, comprueba con el móvil si llega el wifi a la nave.','Ponla alta, mirando a lo largo de la línea de cultivo.','Configura fotos a la misma hora (mejor luz difusa).','Revisa una semana las fotos antes de activar la IA.'],
 d:['Amazon.es, MediaMarkt o PcComponentes: busca «Reolink exterior» o «TP-Link Tapo exterior»'],
 o:['Sin wifi en las naves no funciona (y LoRa no sirve para fotos).','El agua y el blanqueo en la lente estropean la imagen.'],
 m:'Limpiar la lente cada mes.',a:'La IA de incidencias revisaría las fotos (por desarrollar la conexión).',b:'cámara Reolink exterior wifi'};
D['Cámara multiespectral']={q:'Una cámara que ve en bandas de luz que el ojo no ve (como el infrarrojo cercano) para medir el vigor de la planta.',
 nec:['Cámara multiespectral (normalmente en dron)','Programa de procesado'],
 p:['Úsala solo al aire libre.','Vuela con panel de calibración.','Procesa el mapa de vigor.'],
 d:['Fabricantes (MicaSense, Sentera) o el dron DJI Mavic 3 Multispectral'],
 o:['Bajo plástico pierde casi todo: no te sirve dentro del invernadero.'],
 m:'—',a:'Para parcelas al aire libre; la app ya trae Satélite.',b:'cámara multiespectral',pro:1};
D['Clorofilómetro (SPAD)']={q:'Una pinza que se pone en la hoja y dice lo verde que está. Detecta falta de nitrógeno antes de verla.',
 nec:['Clorofilómetro SPAD o atLEAF','Libreta o la app'],
 p:['Mide siempre la misma hoja (la última completamente desarrollada).','Haz 20–30 medidas por nave y saca la media.','Compara naves y semanas, no números sueltos.','Deja una zona bien abonada como referencia.'],
 d:['atLEAF (más barato): su web o tiendas online','Konica Minolta SPAD-502: distribuidores de instrumentación agrícola'],
 o:['Cambia con la variedad y la luz: compara siempre igual.'],
 m:'Pila; limpiar la ventana.',a:'Se puede apuntar en Notas por nave.',b:'atLEAF clorofilómetro'};
D['Refractómetro (grados Brix)']={q:'Pones una gota de zumo de tomate y te dice los grados Brix (azúcar). Calidad y momento de corte.',
 nec:['Refractómetro digital (0–32 % Brix)','Agua destilada para ponerlo a cero'],
 p:['Pon a cero con agua destilada.','Exprime una gota de varios tomates de la misma nave.','Apunta la media.','Compara naves y semanas.'],
 d:['Amazon.es: busca «refractómetro digital Brix»','Marcas profesionales: Atago, Hanna'],
 o:['Los ópticos baratos sirven pero hay que leer bien la raya.'],
 m:'Limpiar tras cada uso.',a:'Se puede apuntar en Notas o en el parte.',b:'refractómetro digital Brix'};
D['Contador de frutos por visión']={q:'Fotos de las plantas que una IA analiza para contar racimos y frutos y estimar kilos.',
 nec:['Fotos sistemáticas (carro, robot o a mano siempre igual)','La IA de la app'],
 p:['Elige una línea por nave.','Haz fotos cada semana desde el mismo sitio.','La IA cuenta y se compara con los kilos reales.','Ajusta hasta que acierte.'],
 d:['Servicios comerciales (carros de monitorización) o desarrollo propio con la app'],
 o:['Las hojas tapan frutos: cuenta de menos al principio.'],
 m:'—',a:'Base para «Previsión de kilos por nave».',b:''};
D['Trampas de feromona y placas de colores']={q:'Trampas con feromona (atraen al macho de Tuta) y placas adhesivas amarillas (mosca blanca, pulgón) o azules (trips).',
 nec:['Trampa delta o de agua con feromona de Tuta','Placas amarillas y azules','Rotulador para la fecha'],
 p:['Pon 1–2 trampas de feromona por nave a la altura de la planta.','Placas a la altura del ápice, subiéndolas con el cultivo.','Cuenta cada semana el mismo día y apúntalo en Plagas.','Cambia la feromona cuando diga el fabricante (4–6 semanas).'],
 d:['Tiendas de suministros agrícolas y cooperativas','Econex (Murcia) y casas de control biológico (Koppert, Biobest)','Amazon.es para placas adhesivas'],
 o:['Feromona caducada o al sol no atrae.','Contar «a ojo» sin apuntar no da fechas.'],
 m:'Cambiar placas cuando estén llenas o sucias.',a:'Plagas: con la primera captura calcula la siguiente generación.',b:'feromona Tuta absoluta trampa'};
D['Trampa inteligente con cámara']={q:'Una trampa con cámara, placa solar y 4G que hace la foto cada día y cuenta las capturas sola.',
 nec:['Trampa comercial con su suscripción','Cobertura móvil en la finca'],
 p:['Pregunta al fabricante si su modelo cuenta Tuta absoluta en tomate.','Pide una demo o una prueba de un mes.','Ponla en la nave con más presión de plaga.','Compara su conteo con el tuyo dos semanas.'],
 d:['Metos iScout (Pessl), Trapview, Topraq: web del fabricante o distribuidor en España'],
 o:['La cuota anual se suma al precio.','Si no tiene modelo para tu plaga, cuenta mal.'],
 m:'Cambiar placa y feromona como una trampa normal.',a:'Su conteo se puede meter en Plagas.',b:'Trapview trampa inteligente',pro:1};
D['Trampa casera con cámara']={q:'Una placa ESP32-CAM delante de la placa adhesiva hace una foto al día y la manda por wifi. La IA de la app cuenta los insectos.',
 nec:['ESP32-CAM con antena externa','Placa adhesiva','Caja impresa en 3D','Alimentación (enchufe o batería con placa solar)','Wifi en la nave'],
 p:['Comprueba que hay wifi en la nave.','Monta la cámara a 15–20 cm de la placa.','Programa una foto al día con buena luz.','Compara el conteo de la IA con el tuyo.'],
 d:['Amazon.es o AliExpress: busca «ESP32-CAM antena externa»'],
 o:['Sin wifi no hay foto.','Con mala luz la IA falla.'],
 m:'Cambiar la placa adhesiva.',a:'Mismo conteo por IA que «Contar placas con la foto del móvil».',b:'ESP32-CAM antena externa'};
D['Contar placas con la foto del móvil']={q:'Haces una foto a la placa adhesiva con el móvil y la IA de la app cuenta los insectos.',
 nec:['El móvil','La app con IA activada'],
 p:['Foto de frente, con la placa entera y buena luz.','Una foto por placa.','Revisa el número y corrige si hace falta.','Se guarda en Plagas.'],
 d:['Nada que comprar'],
 o:['Fotos movidas o con reflejos cuentan mal.'],
 m:'—',a:'Por desarrollar dentro de Plagas.',b:''};
D['Captador de esporas']={q:'Un aparato que aspira aire y recoge las esporas de hongos para analizarlas.',
 nec:['Captador','Laboratorio o servicio de análisis'],
 p:['Solo si hay un problema serio y repetido de mildiu u oídio.','Contrata el servicio de análisis.'],
 d:['Burkard y otros fabricantes (pide presupuesto)'],
 o:['Caro y lento para decidir tratamientos día a día.'],
 m:'Según fabricante.',a:'Plagas ya calcula el riesgo de botritis por clima.',b:'captador esporas',pro:1};
D['Modelos de riesgo por clima']={q:'Cálculos que la app ya hace con el clima: grados-día de Tuta y araña roja, riesgo de botritis, cambio de color y rugoso por contacto.',
 nec:['Apuntar el clima diario (o sensores)','Apuntar las capturas de las trampas'],
 p:['Ve a Riego → Mapa de la finca → Plagas.','Apunta la primera captura de Tuta.','Revisa cada semana el semáforo.','Ajusta los umbrales en Ajustes si tu técnico lo indica.'],
 d:['Nada que comprar'],
 o:['Sin datos de clima de tu nave el cálculo es aproximado.'],
 m:'—',a:'Plagas.',b:''};
D['Nariz electrónica']={q:'Sensores de gases que detectarían plagas o enfermedades por el olor.',
 nec:['—'],
 p:['No comprar todavía: no hay producto fiable para finca.','Revisarlo en un par de años.'],
 d:['—'],o:['Hoy son prototipos de investigación.'],m:'—',a:'—',b:''};
/* Robots, drones, red y control */
D['Robot de cosecha de tomate']={q:'Robots con brazo y cámara que localizan el tomate maduro y lo cortan.',
 nec:['Invernadero de alta tecnología: raíles de calefacción en el suelo, cultivo colgado y pasillos regulares'],
 p:['Seguirlo en ferias (Infoagro Exhibition en Almería, Fruit Attraction en Madrid).','Pedir una demo solo cuando trabajen sin raíles.','Calcular el coste por kilo contra la mano de obra actual.'],
 d:['eternal.ag, Four Growers, Tokuiten: contacto en su web'],
 o:['En parral o raspa y amagado hoy no funcionan.'],m:'—',a:'—',b:'robot cosecha tomate invernadero',pro:1};
D['Robot de deshojado']={q:'Un robot que recorre la línea por los raíles y quita las hojas bajas.',
 nec:['Invernadero con raíles de calefacción'],
 p:['Igual que el de cosecha: seguirlo hasta que funcione sin raíles.'],
 d:['Priva (Kompano): contacto en su web'],o:['Necesita raíles.'],m:'—',a:'—',b:'Priva Kompano',pro:1};
D['Carro o robot de vigilancia']={q:'Un carro con cámaras que recorre las líneas y hace un mapa de plagas, enfermedades y frutos.',
 nec:['Pasillos por donde pueda ir','Wifi o 4G','Contrato de servicio o compra'],
 p:['Pide una demo en una nave de prueba.','Compara su mapa de plagas con el tuyo durante un mes.','Calcula si te ahorra horas de técnico.'],
 d:['Ecoation (OKO) y otros: contacto en su web'],
 o:['Caro; mira el precio por hectárea y año.'],m:'Según contrato.',a:'Sus mapas podrían entrar en Plagas.',b:'Ecoation OKO',pro:1};
D['Robot propio para pasillos']={q:'Un carro pequeño hecho a medida que recorre tus pasillos y hace fotos para la IA de la app.',
 nec:['Plataforma con ruedas y motores','Cámara','Batería','Ordenador pequeño (Raspberry Pi o similar)','Tiempo de desarrollo'],
 p:['Empieza con un carro empujado a mano con la cámara: valida las fotos.','Después motoriza.','Por último, que siga la línea solo.'],
 d:['Piezas: tiendas de robótica (Amazon.es, AliExpress, BricoGeek)'],
 o:['Empezar por la autonomía en vez de por las fotos.'],m:'Batería y ruedas.',a:'Las fotos irían a la IA de incidencias.',b:'chasis robot 4WD'};
D['Carro de pulverización autónomo']={q:'Un carro que recorre la nave tratando solo, sin nadie respirando el producto.',
 nec:['Pasillos regulares','Suelo firme'],
 p:['Pide demo en ferias de Almería y Murcia.','Comprueba que gira en tus cabeceras.','Mira la homologación del equipo de aplicación.'],
 d:['Fabricantes de maquinaria de Almería y Murcia: busca «carro pulverización autónomo invernadero»'],
 o:['Las cabeceras estrechas y los desniveles lo paran.'],m:'Como cualquier equipo de tratamiento (ITEAF).',a:'Los tratamientos se apuntan en el cuaderno.',b:'carro pulverización autónomo invernadero',pro:1};
D['Robot con luz UV-C']={q:'Un robot que pasa de noche con luz ultravioleta para frenar el oídio sin productos.',
 nec:['Pasillos regulares'],p:['Seguir ensayos en tomate antes de pensar en comprar.'],
 d:['Saga Robotics (Thorvald): contacto en su web'],o:['Probado sobre todo en fresa y viña.'],m:'—',a:'—',b:'Saga Robotics Thorvald UV',pro:1};
D['Robot polinizador']={q:'Robot que vibra las flores en vez de los abejorros.',
 nec:['—'],p:['Seguir con abejorros: hoy son más baratos y fiables.'],
 d:['Arugga: contacto en su web'],o:['No compensa en tu finca hoy.'],m:'—',a:'—',b:'Arugga',pro:1};
D['Carro que sigue al operario']={q:'Un carro eléctrico que va detrás del trabajador con las cajas, sin empujarlo.',
 nec:['Pasillos sin escalones','Sitio de carga'],
 p:['Pide demo en una nave.','Mide cuánto tiempo se ahorra en una jornada de recolección.','Compara con el coste.'],
 d:['Fabricantes de carros autónomos (busca «carro autónomo sigue operario agrícola»)'],
 o:['Con pasillos de tierra blanda se atasca.'],m:'Batería y ruedas.',a:'El ahorro se vería en Rendimiento.',b:'carro autónomo sigue operario agricultura',pro:1};
D['Dron con cámara']={q:'Un dron pequeño con cámara para ver desde arriba cubiertas, balsas y caminos, y hacer tu propia ortofoto.',
 nec:['Dron (DJI Mini o Air)','Registro como operador en AESA','Formación A1/A3 (online y gratis en AESA)','Seguro de responsabilidad civil'],
 p:['Regístrate como operador en la web de AESA.','Haz el curso y examen A1/A3 online.','Contrata el seguro.','Mira en ENAIRE Drones si tu finca está en zona restringida (cerca de aeropuertos).','Practica en un sitio abierto antes de volar sobre las naves.'],
 d:['Tienda DJI, Amazon.es, MediaMarkt, PcComponentes'],
 o:['Volar sin registro ni seguro: multa.','El viento de Murcia: no vueles con rachas fuertes.'],
 m:'Hélices y baterías.',a:'Fotos a incidencias; ortofoto para los mapas.',b:'DJI Mini'};
D['Ortofoto propia de la finca']={q:'Con fotos del dron y un programa gratis sale una foto aérea de la finca, nítida y a tu escala.',
 nec:['Dron con cámara','Programa de vuelo automático (varía según el dron)','WebODM (gratis) y un ordenador'],
 p:['Planifica un vuelo en cuadrícula con 70–80 % de solape.','Vuela con sol alto y poco viento.','Carga las fotos en WebODM y genera la ortofoto.','Pásamela y la ponemos de fondo en los mapas de la app.'],
 d:['WebODM: opendronemap.org (gratis)','QGIS: qgis.org (gratis)'],
 o:['Poco solape = agujeros en la foto.','Las cubiertas de plástico brillan: mejor sin sol de frente.'],
 m:'Repetirla cuando cambie la finca.',a:'Fondo real de Mapa de la finca.',b:''};
D['Dron multiespectral']={q:'Dron con cámara multiespectral que hace mapas de vigor de las parcelas.',
 nec:['DJI Mavic 3 Multispectral','Registro AESA y formación','Programa de procesado'],
 p:['Úsalo solo en parcelas al aire libre.','Vuela con panel de calibración.','Compara el mapa con lo que ves en campo.'],
 d:['Distribuidores DJI Enterprise en España'],o:['Bajo plástico no ve el cultivo.'],m:'Hélices y baterías.',a:'La app ya trae Satélite para lo grande.',b:'DJI Mavic 3 Multispectral',pro:1};
D['Dron térmico']={q:'Dron con cámara térmica: fallos de riego, fugas y placas solares calientes.',
 nec:['DJI Mavic 3T o similar','Registro AESA y formación'],
 p:['Vuela a mediodía para ver estrés.','De madrugada para ver fugas de agua.'],
 d:['Distribuidores DJI Enterprise en España'],o:['Bajo plástico ve el plástico, no la planta.'],m:'Hélices y baterías.',a:'Fotos a incidencias.',b:'DJI Mavic 3T',pro:1};
D['Pulverizar con dron']={q:'Tratar fitosanitarios desde un dron.',nec:['—'],
 p:['No hacerlo: está prohibido en España salvo autorización excepcional de la comunidad autónoma.'],
 d:['—'],o:['Sanción y riesgo para la salud.'],m:'—',a:'—',b:''};
D['Imágenes de satélite gratis']={q:'Imágenes Sentinel-2 cada pocos días con índices de vigor.',nec:['Nada'],
 p:['Abre Satélite en la app.','Úsalo para parcelas al aire libre.'],
 d:['Gratis (Copernicus)'],o:['Píxel de 10 m: no ve plantas sueltas ni dentro del invernadero.'],m:'—',a:'Satélite.',b:''};
D['Foto aérea oficial (PNOA)']={q:'La foto aérea oficial de España, gratis, con una resolución de 15–25 cm.',
 nec:['Nada'],p:['Se puede poner de fondo en Mapa de la finca.','Citar la fuente: «PNOA cedido por © Instituto Geográfico Nacional».'],
 d:['Gratis en el Centro de Descargas del CNIG o por servicio WMS'],o:['Puede tener uno o dos años.'],m:'—',a:'Fondo de mapas (por desarrollar).',b:''};
D['Pasarela LoRaWAN 4G']={q:'La antena central que recibe todos los sensores LoRa de la finca y los manda a internet por 4G.',
 nec:['Dragino LPS8N EU868 (versión con 4G) u otra pasarela EU868 con 4G','SIM de datos','Enchufe en un sitio alto y céntrico','Antena exterior si hace falta más alcance'],
 p:['Elige un sitio alto y céntrico (almacén, caseta del cabezal).','Mete la SIM y enciéndela.','Entra en su página de configuración y conéctala a The Things Network.','Comprueba en TTN que aparece «conectada».','Con el primer sensor, recorre la finca mirando la señal.'],
 d:['Tienda oficial de Dragino en AliExpress o distribuidores LoRaWAN europeos (EU868, con 4G)'],
 o:['Comprar la versión sin 4G si no hay wifi.','Dentro de un almacén metálico la señal no sale: antena fuera.'],
 m:'Revisar cada mes en TTN que sigue conectada.',a:'Pieza base de todos los sensores.',b:'Dragino LPS8N 4G EU868'};
D['Red LoRaWAN gratuita']={q:'The Things Network: una red gratuita donde das de alta tu pasarela y tus sensores.',
 nec:['Cuenta gratuita en The Things Network','La pasarela'],
 p:['Crea la cuenta en thethingsnetwork.org.','Da de alta la pasarela (región Europa).','Crea una «aplicación» y añade cada sensor con sus códigos.','Crea la conexión (webhook) al servidor puente.'],
 d:['thethingsnetwork.org (gratis con uso justo)','ChirpStack si un día quieres tu propio servidor'],
 o:['Mandar datos cada minuto: con 10 minutos basta y cumple el uso justo.'],m:'—',a:'Por ahí llegarían los datos al servidor puente.',b:''};
D['SIM de datos']={q:'Una tarjeta SIM solo de datos para la pasarela.',nec:['SIM de datos barata o SIM IoT'],
 p:['Elige una tarifa con 1–2 GB al mes (sobra).','Desactiva el PIN antes de meterla en la pasarela.','Comprueba la cobertura de esa compañía en la finca.'],
 d:['Cualquier operadora; SIM IoT de prepago (ej. 1NCE): compara precio actual'],
 o:['SIM con PIN: la pasarela no conecta.'],m:'Recargar si es prepago.',a:'—',b:''};
D['Sensores con SIM (NB-IoT / LTE-M)']={q:'Sensores que llevan su propia SIM y no necesitan pasarela.',
 nec:['Sensor NB-IoT o LTE-M','Cuota por sensor'],
 p:['Útil para un punto suelto lejos de la pasarela.','Comprueba cobertura NB-IoT en la finca.'],
 d:['Fabricantes de sensores IoT (Milesight, Dragino tienen versiones NB-IoT)'],
 o:['Con muchos sensores las cuotas suman más que una pasarela.'],m:'Pagar la cuota.',a:'Llegaría igual al servidor puente.',b:'sensor NB-IoT'};
D['Wifi en las naves']={q:'Puntos de acceso de exterior para llevar wifi hasta las naves.',
 nec:['Puntos de acceso de exterior','Cable de red o enlace punto a punto desde el almacén'],
 p:['Solo si vas a poner cámaras.','Enlace desde el almacén con antenas punto a punto si está lejos.','Comprueba la señal en cada nave con el móvil.'],
 d:['Amazon.es, PcComponentes: busca «punto de acceso exterior» o «enlace punto a punto»'],
 o:['El plástico y la humedad debilitan el wifi.'],m:'—',a:'Para cámaras y trampas con foto.',b:'punto de acceso wifi exterior'};
D['Placa solar y batería para nodos']={q:'Placa pequeña + pila 18650 + cargador: el nodo funciona solo sin enchufe.',
 nec:['Placa solar de 6 V 2–3 W','Pila 18650 de marca','Cargador CN3791','Portapilas'],
 p:['Vienen en los diseños solares del Taller (N2–N6).','Orienta la placa al sur e inclinada unos 40°.','Comprueba la polaridad antes de conectar.'],
 d:['Amazon.es o AliExpress; pilas 18650 de marca en tiendas de baterías'],
 o:['Pilas 18650 de marcas falsas con capacidades imposibles (9.900 mAh).','Placa a la sombra de la cubierta.'],
 m:'Limpiar la placa; pila cada 2–3 años.',a:'—',b:'placa solar 6V 2W 18650 CN3791'};
D['Pasarela Modbus']={q:'Un aparato que lee por cable (RS485 Modbus) el controlador de clima o de riego y manda los datos por LoRa o internet.',
 nec:['Permiso y mapa de registros Modbus del fabricante del controlador','Pasarela RS485 a LoRaWAN (ej. Dragino RS485-LN) o a red'],
 p:['Pide al fabricante el mapa de registros Modbus y permiso.','Conecta la pasarela al puerto RS485 del controlador.','Configura qué registros leer.','Comprueba que los valores coinciden con la pantalla del controlador.'],
 d:['Dragino RS485-LN (LoRaWAN) en su tienda oficial','Conversores RS485 a red (Waveshare, USR IOT) en Amazon.es o AliExpress'],
 o:['Sin el mapa de registros es adivinar.','Tocar el controlador puede afectar a la garantía: con el instalador.'],
 m:'—',a:'Clima del controlador en la app sin fotos.',b:'Dragino RS485-LN'};
D['Servidor puente']={q:'Un pequeño programa en internet que recibe los datos de los sensores y los guarda en la app.',
 nec:['Cuenta de Cloudflare (la misma de la IA)','Configuración de TTN'],
 p:['Se monta una vez (lo hacemos juntos).','Se conecta TTN con un webhook.','Se prueba con un sensor.'],
 d:['Cloudflare Workers (plan gratuito)'],o:['Las claves solo en secretos de Cloudflare, nunca en el código.'],m:'Casi ninguno.',a:'Puerta de entrada de todos los sensores.',b:''};
D['Pegatinas QR o NFC por nave y elemento']={q:'Una pegatina en cada nave, trampa o depósito: la escaneas con el móvil y la app abre ese elemento.',
 nec:['Pegatinas QR impresas (plastificadas) o NFC NTAG215','Bridas o soporte'],
 p:['Se generan los códigos desde la app (por desarrollar).','Imprímelos y plastifícalos.','Pégalos en la puerta de cada nave y en cada trampa.'],
 d:['Pegatinas NFC NTAG215: Amazon.es','QR: impresora normal + plastificar'],
 o:['El sol borra la tinta: plastificar.'],m:'Cambiar las que se estropeen.',a:'Incidencia, trampa o clima en la nave correcta sin buscar.',b:'pegatinas NFC NTAG215'};
D['Pasarela casera']={q:'El diseño P del Taller: una Heltec V3 con enchufe que recibe los nodos del Taller y los manda por wifi.',
 nec:['Heltec WiFi LoRa 32 V3 (868 MHz)','Cargador USB','Wifi donde la pongas'],
 p:['Abre el diseño P en el Taller.','Carga el código.','Ponla junto al router.','Comprueba que llegan los nodos.'],
 d:['Tienda oficial de Heltec en AliExpress o Amazon.es'],
 o:['Necesita wifi: no sirve en las naves sin wifi.','No es una pasarela LoRaWAN: solo vale para los nodos del Taller.'],
 m:'—',a:'Para empezar sin comprar la pasarela LoRaWAN.',b:'Heltec WiFi LoRa 32 V3 868'};
D['Controlador de clima profesional']={q:'El ordenador de clima que ya tenéis: abre ventanas y controla el clima por compartimentos.',
 nec:['Ya lo tenéis'],
 p:['Haz foto del informe y usa «Leer informe» en Clima y estrés.','Pide al instalador si tiene salida Modbus o exportación.','Pide que la web vaya por https (ahora las contraseñas viajan sin cifrar).'],
 d:['El instalador'],o:['Revisa la hora del controlador: parecía adelantada.'],m:'Revisión anual del instalador.',a:'Clima y estrés → Leer informe.',b:''};
D['Control sencillo por nave']={q:'Un controlador básico que abre ventanas por temperatura en naves sin control.',
 nec:['Controlador básico','Motores con finales de carrera','Electricista'],
 p:['Pide presupuesto a tu instalador.','Siempre con cierre por viento y lluvia.','Prueba en una nave antes de ponerlo en todas.'],
 d:['Instaladores de invernadero de la zona'],o:['Sin sensor de viento puede romper ventanas.'],m:'Revisión anual.',a:'—',b:'controlador clima invernadero básico',pro:1};
D['Motores de ventanas con finales de carrera']={q:'Motorreductores que abren y cierran las ventanas, con finales de carrera para que paren solos.',
 nec:['Motorreductores para invernadero','Finales de carrera','Cuadro eléctrico','Electricista e instalador'],
 p:['Presupuesto con el instalador de invernaderos.','Siempre con cierre automático por viento y lluvia.','Probar los finales de carrera antes de dejarlos solos.'],
 d:['Instaladores de invernaderos de Almería y Murcia'],o:['Final de carrera mal ajustado = ventana rota.'],m:'Engrase y revisión anual.',a:'—',b:'motorreductor ventana invernadero',pro:1};
D['Nebulización (fog)']={q:'Boquillas que pulverizan agua a muy alta presión: baja la temperatura y sube la humedad.',
 nec:['Bomba de alta presión','Tuberías y boquillas','Agua filtrada (mejor osmotizada)','Controlador por humedad'],
 p:['Presupuesto por superficie.','Prueba en una nave.','Mira en Clima y estrés si baja el DPV y la temperatura.'],
 d:['Instaladores de nebulización para invernadero'],o:['Agua dura: atasca las boquillas.','De más: hojas mojadas = botritis.'],m:'Limpiar boquillas y filtros.',a:'Clima y estrés mide el efecto.',b:'nebulización alta presión invernadero',pro:1};
D['Malla de sombreo móvil']={q:'Pantalla de sombra que se abre y se cierra con motor: sombra solo cuando hace falta.',
 nec:['Estructura que lo permita','Pantalla y motor','Instalador'],
 p:['Presupuesto con el instalador.','Comparar con el coste del blanqueo y la luz que pierdes.'],
 d:['Instaladores de invernadero; fabricantes de pantallas térmicas'],o:['En parral puede no ser posible.'],m:'Revisión anual.',a:'—',b:'pantalla sombreo móvil invernadero',pro:1};
D['Relés por LoRa para bombas y válvulas']={q:'Un nodo LoRa con relés que puede encender o apagar algo desde lejos.',
 nec:['Controlador LoRaWAN con relés (ej. Dragino LT-22222-L)','Contactores en el cuadro','Electricista'],
 p:['Empieza con algo no crítico (una luz, un aviso).','El electricista lo conecta en el cuadro con contactor.','Deja siempre el mando manual y la seguridad local.'],
 d:['Dragino LT-22222-L en su tienda oficial o distribuidores LoRaWAN'],
 o:['Nunca conectar una bomba directamente al relé pequeño: contactor.','Si se corta la radio, que quede en seguro.'],
 m:'—',a:'Pendiente de desarrollar el mando en la app.',b:'Dragino LT-22222-L'};
D['Programador de riego con conexión']={q:'Programador de riego que deja ver o exportar los riegos reales.',
 nec:['Programador con API, Modbus o informe exportable'],
 p:['Pregunta a tu instalador qué modelo tenéis y si exporta.','Mientras tanto, foto del informe con «Leer informe».'],
 d:['Tu instalador de riego'],o:['Algunas marcas cobran por la conexión.'],m:'—',a:'Los riegos reales entrarían solos en Riego.',b:''};
D['Fichaje y ubicación']={q:'La app ya registra la entrada y salida con ubicación.',nec:['Nada'],p:['Ve a Fichar en la app.'],d:['—'],o:['—'],m:'—',a:'Fichar.',b:''};
D['Localizador GPS en tractores']={q:'Un localizador 4G en cada tractor que guarda por dónde ha ido y cuántas horas.',
 nec:['Localizador GPS 4G para vehículo (conectado a la batería)','SIM o cuota'],
 p:['Conéctalo a la batería del tractor (con un electricista o el taller).','Configura la app del fabricante.','Comprueba un día que coincide con lo que hizo.'],
 d:['Teltonika y otros por distribuidor; localizadores sencillos en Amazon.es'],
 o:['Los de pila duran poco: mejor a la batería.'],m:'Cuota.',a:'Horas de maquinaria por nave en el coste (por desarrollar).',b:'localizador GPS 4G vehículo'};
D['Telemetría del pulverizador']={q:'Caudalímetro y sensor de presión en el equipo de tratamiento que registran lo aplicado.',
 nec:['Ordenador de pulverizador con caudalímetro','Montaje en el equipo'],
 p:['Pide al taller o a la marca del equipo.','Comprueba con agua que mide bien.'],
 d:['ARAG y otros fabricantes de componentes para pulverizadores'],o:['Si no se calibra, apunta dosis falsas.'],m:'Calibrar cada temporada.',a:'El tratamiento iría solo al cuaderno.',b:'ordenador pulverizador caudalímetro ARAG',pro:1};
D['Pulseras contra el golpe de calor']={q:'Pulseras que vigilan la temperatura y el pulso del trabajador y avisan del golpe de calor.',
 nec:['Pulseras de seguridad laboral','Móvil o receptor'],
 p:['Prueba con 2–3 trabajadores en verano.','Pacta con ellos el uso de los datos.'],
 d:['Proveedores de seguridad laboral (busca «wearable estrés térmico trabajadores»)'],o:['Datos de salud: con consentimiento.'],m:'Cargar cada día.',a:'—',b:'wearable estrés térmico trabajadores',pro:1};
D['Registro de visitas']={q:'Apuntar quién entra de fuera y en qué naves: clave contra el rugoso.',
 nec:['La app (por desarrollar)','QR en la entrada'],p:['Se desarrolla en la app.','Cartel con QR a la entrada.'],d:['—'],o:['Si no se apunta siempre, no sirve.'],m:'—',a:'Plagas → rugoso sabría qué naves vigilar.',b:''};
D['Cámaras de seguridad']={q:'Cámaras de exterior en el almacén y la entrada.',
 nec:['Cámaras de exterior','Wifi o 4G','Cartel de zona videovigilada'],
 p:['Pon el cartel obligatorio.','Graba solo lo necesario.','Avisa a los trabajadores.'],
 d:['Amazon.es, MediaMarkt, PcComponentes'],o:['Protección de datos: cartel y aviso obligatorios.'],m:'—',a:'—',b:'cámara exterior 4G'};
D['Temperatura de la cámara frigorífica']={q:'Un sensor LoRa dentro de la cámara que avisa al móvil si sube la temperatura.',
 nec:['Sensor LoRaWAN de temperatura (con sonda de cable)','Pasarela'],
 p:['Pasa la sonda por la junta de la puerta (la de cable plano) o pon el sensor dentro.','Dalo de alta en la pasarela.','Pon el aviso (por desarrollar).'],
 d:['Dragino LHT65N o Milesight EM300-TH (EU868)'],o:['El metal de la cámara corta la radio: sensor fuera y sonda dentro.'],m:'Pila cada pocos años.',a:'Aviso al móvil (por desarrollar).',b:'Dragino LHT65N EU868'};
D['Báscula conectada en la recolección']={q:'Báscula que manda el peso de cada caja al móvil.',
 nec:['Báscula con Bluetooth o wifi'],p:['Prueba una en la nave.','Conectarla con la app (por desarrollar).'],
 d:['Marcas de básculas industriales (Gram, Baxtran) y Amazon.es'],o:['Polvo y agua: mínimo IP65.'],m:'Verificar con un peso conocido.',a:'Coste por kilo de cada nave en Rendimiento.',b:'báscula plataforma bluetooth'};
D['Trazabilidad con QR en palés y cajas']={q:'Etiqueta QR en cada palé con la nave, la fecha y la colla.',
 nec:['Impresora de etiquetas','Etiquetas','La app (por desarrollar)'],p:['Se desarrolla en la app.','Imprimir al cerrar el palé.'],
 d:['Impresoras de etiquetas térmicas: Amazon.es'],o:['La etiqueta térmica directa se borra con el sol y el calor: para palés que esperan fuera, mejor de transferencia térmica.'],m:'—',a:'Unido al cuaderno y los partes.',b:'impresora etiquetas térmica'};
D['Etiquetas RFID']={q:'Etiquetas que se leen por radio sin verlas.',nec:['Etiquetas RFID UHF','Lector'],
 p:['Solo con mucho volumen; con QR suele bastar.'],d:['Proveedores RFID'],o:['Caro de montar.'],m:'—',a:'—',b:'etiquetas RFID UHF',pro:1};
D['Sensor de etileno']={q:'Mide el etileno de la cámara, la hormona que madura la fruta.',nec:['Sensor de etileno'],
 p:['Solo si hay cámara de maduración o conservación larga.'],d:['Felix Instruments y otros por distribuidor'],o:['Caro.'],m:'Calibrar.',a:'—',b:'sensor etileno',pro:1};
D['Almacén de fitosanitarios vigilado']={q:'Sensor de temperatura y de puerta en el almacén de fitosanitarios.',
 nec:['Sensor LoRaWAN de temperatura','Sensor de puerta LoRaWAN','Pasarela'],
 p:['Pon el de temperatura a media altura.','El de puerta en el marco.','Aviso si pasa de 30–35 °C o se abre fuera de horario (por desarrollar).'],
 d:['Milesight WS301 o Dragino LDS02 (puerta); Dragino LHT65N (temperatura)'],o:['El imán del sensor de puerta debe quedar a menos de 1–2 cm con la puerta cerrada.','Almacén de chapa: el sensor dentro puede no llegar a la pasarela; pruébalo antes de fijarlo.'],m:'Pila cada pocos años.',a:'Aviso al móvil (por desarrollar).',b:'sensor puerta LoRaWAN'};
/* IA y lo que hace la app */
D['Diagnóstico por foto']={q:'Haces una foto a la planta y la IA dice qué puede ser y qué hacer.',nec:['El móvil'],
 p:['Abre una incidencia y pulsa la IA.','Foto de cerca y otra de la planta entera.','Revisa lo que propone con tu técnico.'],d:['—'],o:['Es una ayuda: lo grave, confírmalo con el técnico.'],m:'—',a:'Incidencias → IA.',b:''};
D['Clima y estrés']={q:'DPV, hoja–aire, punto de rocío y semáforo por nave.',nec:['Datos de clima (a mano, informe o sensores)'],
 p:['Riego → Mapa de la finca → Clima y estrés.','Apunta o lee el informe.','Calibra con 6 días de planta sana.'],d:['—'],o:['Sensor al sol = estrés falso.'],m:'—',a:'Clima y estrés.',b:''};
D['Previsión de plagas']={q:'Grados-día y riesgo de Tuta, araña roja, botritis, cambio de color y rugoso.',nec:['Clima y capturas'],
 p:['Riego → Mapa de la finca → Plagas.','Apunta capturas cada semana.'],d:['—'],o:['Sin capturas no hay fechas de generación.'],m:'—',a:'Plagas.',b:''};
D['Plazo de seguridad y cuaderno digital']={q:'Cuaderno de tratamientos con plazo de seguridad por nave y CSV del reglamento europeo.',nec:['Apuntar cada tratamiento'],
 p:['Apunta el tratamiento con nave y producto.','Mira el plazo antes de recolectar.','Exporta el CSV cuando te lo pidan.'],d:['—'],o:['Un tratamiento sin apuntar deja el plazo mal.'],m:'—',a:'Cuaderno.',b:''};
D['Coste de mano de obra por nave']={q:'Horas de las collas por nave y su coste.',nec:['Partes de trabajo','Precio de la hora en Ajustes'],
 p:['Pon el precio de la hora.','Mira Rendimiento.'],d:['—'],o:['Partes incompletos = coste falso.'],m:'—',a:'Rendimiento.',b:''};
D['Leer informes por foto']={q:'Foto de la pantalla o el informe y la IA pasa los datos a la app.',nec:['El móvil'],
 p:['Clima y estrés → Leer informe.','Revisa lo leído antes de guardar.'],d:['—'],o:['Foto torcida o con reflejos lee peor.'],m:'—',a:'Clima y estrés.',b:''};
D['Previsión de kilos por nave']={q:'Calcular los kilos de las próximas semanas por nave con partes, clima y conteo de frutos.',nec:['Partes con kilos','Clima','Conteo de frutos (opcional)'],
 p:['Pídelo y se desarrolla.','Primero con los kilos de temporadas anteriores.','Se ajusta comparando con lo real.'],d:['—'],o:['Sin datos de varias semanas no acierta.'],m:'—',a:'Por desarrollar.',b:''};
D['Riego por radiación automático']={q:'Que la app proponga regar cuando la radiación acumulada llegue a un valor, y ajuste con el drenaje.',nec:['Piranómetro','Drenaje automático','Desarrollo'],
 p:['Primero los dos sensores funcionando.','Después la app propone (no manda).','Se compara con lo que haces a mano.'],d:['—'],o:['Nunca automático sin seguridad local.'],m:'—',a:'Por desarrollar.',b:''};
D['Maqueta 3D en vivo de la finca']={q:'Una vista 3D de la finca con incidencias, collas, clima y plagas encima.',nec:['Ortofoto o PNOA','Desarrollo'],
 p:['Lo dejamos aparcado de momento.'],d:['—'],o:['—'],m:'—',a:'Por desarrollar.',b:''};
D['Asistente por chat']={q:'Preguntar a la IA sobre la finca con los datos de la app.',nec:['Nada'],p:['Abre el chat IA.'],d:['—'],o:['Revisa siempre lo importante.'],m:'—',a:'Chat IA.',b:''};
return D})();

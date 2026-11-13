# -*- coding: utf-8 -*-
"""Pasa la última versión del artefacto «RoboLab XXI» a Agro Fly (fuente/robolab/robolab.html).

Uso:  python3 robolab/aplicar.py <html del artefacto> <versión del artefacto>
      (desde la carpeta fuente; la versión es la que da la lectura del artefacto, p. ej. 1794570458-2f42)

Lo que hace, siempre sobre el artefacto tal cual lo haya dejado Juanjo:
  1. Revisa que no lleve nada que no deba ir a un repositorio público (claves, correos, servidores raros).
  2. Le pone lo de Agro Fly: three.js servido por la app, modo «dentro de Agro Fly» (la IA de la app, deja de
     dibujar con la pestaña escondida), la electroválvula de 12 V y los 4 ejemplos de Agro Fly delante.
  3. Escribe robolab.html y apunta la versión en origen.json.
Si algo imprescindible no encaja, no escribe nada y sale con código 2 (no se publica).
Si solo falla algo secundario (un texto), lo avisa y sigue (código 0).
"""
import hashlib, json, pathlib, re, sys

AQUI = pathlib.Path(__file__).resolve().parent
LIBS = AQUI.parent / 'libs' / 'three'
fallos, avisos = [], []

def rep(s, a, b, nombre, imprescindible=False):
    n = s.count(a)
    if n == 1: return s.replace(a, b)
    (fallos if imprescindible else avisos).append(f'{nombre}: no encuentro el sitio ({n} veces)')
    return s

def revisar(s):
    """Nada de secretos ni de servidores que no sean los de siempre."""
    if re.search(r'sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY', s):
        fallos.append('lleva algo que parece una clave: no se publica')
    for m in set(re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}', s)):
        if not re.match(r'.*@(\d|x\.)', m) and not m.startswith('three@'):
            fallos.append(f'lleva un correo ({m}): no se publica')
    hosts = set(re.findall(r'https?://([A-Za-z0-9.-]+)', s))
    raros = hosts - {'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'www.w3.org'}
    if raros: fallos.append('llama a servidores nuevos: ' + ', '.join(sorted(raros)))

def three_local(s):
    """Si el artefacto usa la misma versión de three.js que la que trae la app, se sirve desde la app."""
    m = re.search(r'<script type="importmap">\s*(\{.*?\})\s*</script>', s, re.S)
    if not m:
        fallos.append('no encuentro el importmap de three.js'); return s
    v = re.search(r'three@([\d.]+)', m.group(1))
    if not v:
        avisos.append('el importmap no usa three.js de jsdelivr: se deja como está'); return s
    local = (LIBS / 'VERSION').read_text().strip() if (LIBS / 'VERSION').exists() else '0.160.0'
    if v.group(1) != local:
        avisos.append(f'el artefacto usa three.js {v.group(1)} y la app trae {local}: se deja el de internet (sin conexión no abrirá hasta que se actualice libs/three)')
        return s
    imports = re.findall(r'from\s+[\'"](three/addons/[^\'"]+)[\'"]', s)
    falta = [i for i in imports if not (LIBS / pathlib.Path(i).name).exists()]
    if falta:
        avisos.append('piezas de three.js que la app no trae (' + ', '.join(falta) + '): se deja el de internet'); return s
    mapa = {'three': './three/three.module.min.js', **{i: './three/' + pathlib.Path(i).name for i in imports}}
    return s[:m.start(1)] + json.dumps({'imports': mapa}, separators=(',', ':')) + s[m.end(1):]

# Modo «dentro de Agro Fly»: un script normal antes del módulo, así no depende de cómo esté escrito RoboLab por dentro.
MODO_APP = r"""<script>/* Agro Fly: RoboLab dentro de la app */
window.EN_APP=(()=>{try{return window.parent!==window&&typeof parent.iaFotoJson==='function'}catch(e){return false}})();
window.IA_N=window.EN_APP?'la IA':'Claude';
if(window.EN_APP){
  /* con la pestaña escondida no se dibuja (no gasta batería); se mira cada medio segundo si vuelve */
  const raf=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=cb=>window.__pausa?setTimeout(()=>window.requestAnimationFrame(cb),500):raf(cb);
  document.documentElement.classList.add('enapp');
  addEventListener('DOMContentLoaded',()=>{const b=document.querySelector('#brand small');if(b)b.textContent='Laboratorio · Agro Fly'});
}
</script>
"""

EV12 = """M({id:'ev12',motor:true,valve:true,name:'Electroválvula 12 V',short:'riego 3/4"',w:44,d:34,noPcb:true,color:'#000',rows2:motorPins(14),style:'female',
  info:{sub:'Abre y cierra el agua de un sector de riego',specs:[['Tensión','12 V DC'],['Rosca','3/4"']],text:'Es la que abre el riego de cada sector. Nunca va directa a un pin: se maneja con un relé (o un MOSFET) y una fuente de 12 V. Da igual qué cable vaya a cada borne.'},
  decor:[['cx',4.5,42,0,-6,0,0xc9a13a,'m'],['b',16,11,14,0,-6,0,0xc9a13a,'m'],['c',6.5,13,0,-6,11,0x151515],['c',2.2,3,0,-6,24,0xd9dde1,'m']]});
"""

EJEMPLOS = """  {id:'af_suelo',name:'Agro Fly · Nodo de suelo',text:'ESP32 que mide la humedad y la temperatura del suelo de una nave y lo manda por radio LoRa a la pasarela.',
   parts:[['esp32',-60,0,0],['suelo',25,-70,0],['ds18b20',75,-45,0],['lora',50,45,0]],
   wires:[[0,'3V3',1,'VCC'],[0,'GND',1,'GND'],[0,'D34',1,'AO'],[0,'3V3',2,'VCC'],[0,'GND',2,'GND'],[0,'D4',2,'DATA'],[0,'3V3',3,'3.3V'],[0,'GND',3,'GND'],[0,'D18',3,'SCK'],[0,'D19',3,'MISO'],[0,'D23',3,'MOSI'],[0,'D5',3,'NSS'],[0,'D14',3,'RST'],[0,'D26',3,'DIO0']]},
  {id:'af_clima',name:'Agro Fly · Clima de la nave',text:'ESP32 con un DHT22 (temperatura y humedad del aire) que manda los datos por LoRa.',
   parts:[['esp32',-55,0,0],['dht22',40,-45,0],['lora',45,40,0]],
   wires:[[0,'3V3',1,'VCC'],[0,'D27',1,'DATA'],[0,'GND',1,'GND'],[0,'3V3',2,'3.3V'],[0,'GND',2,'GND'],[0,'D18',2,'SCK'],[0,'D19',2,'MISO'],[0,'D23',2,'MOSI'],[0,'D5',2,'NSS'],[0,'D14',2,'RST'],[0,'D26',2,'DIO0']]},
  {id:'af_ev',name:'Agro Fly · Electroválvula de un sector',text:'ESP32 que abre y cierra una electroválvula de 12 V con un relé, como el nodo de válvulas del cabezal.',
   parts:[['esp32',-75,0,0],['rele',5,0,0],['ev12',80,-40,0],['jack_dc',75,45,0]],
   wires:[[0,'VIN',1,'VCC'],[0,'GND',1,'GND'],[0,'D25',1,'IN'],[3,'+',1,'COM'],[1,'NO',2,'+'],[2,'−',3,'−']]},
  {id:'af_bidon',name:'Agro Fly · Nivel de bidón',text:'Arduino Nano con sensor de ultrasonidos en la tapa del bidón y pantalla que enseña lo que queda. Es de 5 V, así que el sensor va directo.',
   parts:[['nano',-50,0,0],['hcsr04',35,-45,0],['oled',45,40,0]],
   wires:[[0,'5V',1,'VCC'],[0,'D9',1,'TRIG'],[0,'D8',1,'ECHO'],[0,'GND',1,'GND'],[0,'5V',2,'VCC'],[0,'GND',2,'GND'],[0,'A5',2,'SCL'],[0,'A4',2,'SDA']]},
"""
PIEZAS_EJ = ['esp32', 'suelo', 'ds18b20', 'lora', 'dht22', 'rele', 'jack_dc', 'nano', 'hcsr04', 'oled']

def aplicar(s):
    revisar(s)
    s = rep(s, '<!doctype html><html><head><meta charset=utf8>', '<!doctype html><html lang="es"><head><meta charset=utf8><meta name="robots" content="noindex">', 'cabecera')
    s = three_local(s)
    s = rep(s, '<script type="importmap">', MODO_APP + '<script type="importmap">', 'modo dentro de Agro Fly', True)
    # electroválvula + ejemplos de Agro Fly (van juntos: los ejemplos usan la electroválvula)
    faltan = [p for p in PIEZAS_EJ if f"id:'{p}'" not in s]
    if faltan or 'const motorPins=' not in s or 'const M=' not in s:
        avisos.append('ejemplos de Agro Fly sin poner: faltan piezas en RoboLab (' + ', '.join(faltan or ['M/motorPins']) + ')')
    elif "id:'ev12'" in s:
        s = rep(s, 'const EXAMPLES=[\n', 'const EXAMPLES=[\n' + EJEMPLOS, 'ejemplos de Agro Fly')
    else:
        s = rep(s, 'const EXAMPLES=[\n', EV12 + 'const EXAMPLES=[\n' + EJEMPLOS, 'electroválvula y ejemplos de Agro Fly')
    s = rep(s, "res={level:weak?'warn':'ok',title:nm+' girando',", "res={level:weak?'warn':'ok',title:nm+(d.valve?' abierta':' girando'),", 'electroválvula «abierta»')
    s = rep(s, "const IDEAS=[", "const IDEAS=['Abrir la electroválvula de un sector a una hora','Medir la humedad del suelo de una nave',", 'ideas de Agro Fly')
    # la IA de la app para «Quiero hacer…»
    s = rep(s, "if(window.claude?.use){ sampleApi=await window.claude.use('sample'); }",
            "if(window.claude?.use){ sampleApi=await window.claude.use('sample'); }\n  else if(EN_APP&&parent.iaModo&&parent.iaModo()){ sampleApi={json:(p,o)=>new Promise((ok,ko)=>{ o?.signal?.addEventListener('abort',()=>ko({code:'cancelled'})); parent.iaFotoJson(p,[]).then(ok,ko) })} }",
            'IA de la app en «Quiero hacer…»')
    s = rep(s, "el.textContent=sampleApi?'Claude elige las piezas para tu idea.'", "el.textContent=sampleApi?(EN_APP?'La IA de Agro Fly elige las piezas para tu idea.':'Claude elige las piezas para tu idea.')", 'texto IA 1')
    s = rep(s, "'Claude está ocupado ahora mismo, así que uso un proyecto típico parecido.':'No he podido preguntar a Claude, así que uso un proyecto típico parecido.'",
            "(EN_APP?'La IA está ocupada':'Claude está ocupado')+' ahora mismo, así que uso un proyecto típico parecido.':'No he podido preguntar a '+IA_N+', así que uso un proyecto típico parecido.'", 'texto IA 2')
    s = rep(s, "if(s) s.textContent='Claude está eligiendo las piezas…'", "if(s) s.textContent=(EN_APP?'La IA':'Claude')+' está eligiendo las piezas…'", 'texto IA 3')
    s = rep(s, "pl.src==='claude'?'Plan de Claude':'Proyecto típico'", "pl.src==='claude'?'Plan de '+(EN_APP?'la IA':'Claude'):'Proyecto típico'", 'texto IA 4')
    return s

if __name__ == '__main__':
    if len(sys.argv) < 3: print(__doc__); sys.exit(1)
    src = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'); ver = sys.argv[2]
    out = aplicar(src)
    for a in avisos: print('AVISO:', a)
    for f in fallos: print('FALLO:', f)
    if fallos: print('No se cambia nada.'); sys.exit(2)
    (AQUI / 'robolab.html').write_text(out, encoding='utf-8')
    o = json.loads((AQUI / 'origen.json').read_text())
    o.update(version=ver, sha256=hashlib.sha256(src.encode()).hexdigest())
    (AQUI / 'origen.json').write_text(json.dumps(o, ensure_ascii=False, indent=1) + '\n')
    print(f'OK: RoboLab XXI {ver} pasado a Agro Fly ({len(out)} bytes, {len(avisos)} avisos)')

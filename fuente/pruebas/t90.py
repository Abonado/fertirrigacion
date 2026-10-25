"""Voz completa: material, recordatorios con hora, tareas (crear, leer y marcar hechas), llenados, fichar, cambiar de día,
observaciones y consultas (qué falta, resumen, mensajes, tiempo, depósitos) con deshacer de lo creado por voz."""
import asyncio, sys, json
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
FALSO = """
window.__rec=[];window.__starts=0;window.__dichos=[];
class FalsoRec{constructor(){this.activo=false;window.__rec.push(this)}
  start(){if(this.activo)throw new Error('InvalidStateError');this.activo=true;window.__starts++}
  stop(){if(!this.activo)return;this.activo=false;setTimeout(()=>this.onend&&this.onend(),10)}
  abort(){this.stop()}}
window.SpeechRecognition=FalsoRec;window.webkitSpeechRecognition=FalsoRec;
window.__oye=t=>{const r=window.__rec.find(x=>x.activo);if(!r)return false;const res=[{transcript:t,confidence:.9}];res.isFinal=true;r.onresult({resultIndex:0,results:[res]});if(!r.continuous)r.stop();return true};
// como el iPhone: el texto llega creciendo en el mismo resultado y a veces sin marca de final; la frase se cierra al acabar
window.__oyeIOS=(partes,final)=>{const r=window.__rec.find(x=>x.activo);if(!r)return false;for(const t of partes){const res=[{transcript:t,confidence:.9}];res.isFinal=false;r.onresult({resultIndex:0,results:[res]})}
  if(final){const res=[{transcript:partes[partes.length-1],confidence:.9}];res.isFinal=true;r.onresult({resultIndex:0,results:[res]})}r.stop();return true};
Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak(u){window.__dichos.push(u.text);setTimeout(()=>u.onend&&u.onend(),30)},cancel(){},getVoices(){return[]}}});
window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};
"""
pedidos = []
async def servidor(route):
    rq = route.request
    if rq.method == 'OPTIONS': return await route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST, OPTIONS'})
    pedidos.append(json.loads(rq.post_data))
    await route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps({'text': '**Sube** porque la planta absorbe agua y deja las sales.'}))
WX = {'current': {'temperature_2m': 21.4, 'relative_humidity_2m': 60, 'weather_code': 1, 'wind_speed_10m': 12, 'wind_gusts_10m': 25, 'wind_direction_10m': 90},
      'daily': {'time': ['2026-10-25', '2026-10-26'], 'weather_code': [1, 2], 'temperature_2m_max': [24.6, 23], 'temperature_2m_min': [14.2, 13], 'precipitation_sum': [0, 0], 'precipitation_probability_max': [10, 5],
                'wind_speed_10m_max': [20, 18], 'wind_gusts_10m_max': [38, 30], 'wind_direction_10m_dominant': [90, 90], 'et0_fao_evapotranspiration': [3.1, 3], 'sunrise': ['2026-10-25T08:00', '2026-10-26T08:01'], 'sunset': ['2026-10-25T18:50', '2026-10-26T18:49']}}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid', geolocation={'latitude': 37.42, 'longitude': -1.58}, permissions=['geolocation'])
        await ctx.add_init_script(FALSO)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.fulfill(content_type='application/json', body=json.dumps(WX), headers={'access-control-allow-origin': '*'}))
        await ctx.route('https://archive-api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='drenaje';renderAll();vzEncender(true)"); await pg.wait_for_timeout(500)
        async def oye(t, ms=900):
            n = await pg.evaluate("window.__dichos.length")
            for _ in range(30):
                if await pg.evaluate(f"window.__oye({json.dumps(t)})"): break
                await pg.wait_for_timeout(100)
            else: raise AssertionError('no escuchaba: ' + t)
            await pg.wait_for_timeout(ms)
            d = await pg.evaluate(f"window.__dichos.slice({n})"); print(f'  «{t}» →', d); return d
        # 1. día y hora dichos
        hoyF = await pg.evaluate("hoy()")
        c = await pg.evaluate("""(()=>{const f=x=>vzCuando(x);const r=[f('mañana a las 8 y media llamar'),f('el lunes revisar'),f('a las 5 de la tarde algo'),f('a las nueve menos cuarto de la noche x'),f('el día 3 x'),f('sin fecha nada')];return r.map(x=>[x.fecha,x.hora,x.resto])})()""")
        print('cuándo:', c)
        man = await pg.evaluate("(()=>{const d=new Date(hoy()+'T12:00:00');d.setDate(d.getDate()+1);return isoD(d)})()")
        assert c[0] == [man, '08:30', 'llamar'] and c[1][2] == 'revisar' and c[1][0] > hoyF and c[2][1] == '17:00' and c[3][1] == '20:45' and c[4][0][-2:] == '03' and c[5] == [None, None, 'sin fecha nada']
        # 2. material
        d = await oye('Agro pide 10 goteros de 2 litros', 1200)
        m = await pg.evaluate("Store.listCol('material',10).then(l=>l[0])"); print('material:', m['art'], m['cant'], m['ud'], m['urg'], m['cab'])
        assert m['art'] == 'Goteros de 2 litros' and m['cant'] == 10 and m['ud'] == 'unidades' and not m['urg'] and 'Pedido enviado' in d[0]
        d = await oye('Agro material urgente: 2 rollos de cinta de teflón para Franco', 1200)
        m = await pg.evaluate("Store.listCol('material',10).then(l=>l.find(x=>x.art.startsWith('Cinta')))"); print('material:', m['art'], m['cant'], m['ud'], m['urg'], m['cab'])
        assert m['art'] == 'Cinta de teflón' and m['cant'] == 2 and m['ud'] == 'rollos' and m['urg'] and m['cab'] == 'fra'
        d = await oye('Agro deshacer', 1200); assert 'pedido de material borrado' in d[0]
        assert await pg.evaluate("Store.listCol('material',10).then(l=>l.map(x=>x.art))") == ['Goteros de 2 litros']
        await oye('Agro hace falta una llave de bola de media', 1200)
        m = await pg.evaluate("Store.listCol('material',10).then(l=>l.find(x=>x.art.startsWith('Llave')))"); assert m and m['cant'] == 1, m
        # 3. notas con aviso
        d = await oye('Agro recuérdame mañana a las 8 y media llamar al técnico', 1200)
        nt = await pg.evaluate("(st.notas||[]).find(n=>n.texto==='Llamar al técnico')"); print('nota:', nt and (nt['texto'], nt['cuando']), d)
        assert nt and nt['cuando'] == man + 'T08:30' and 'mañana a las 08:30' in d[0]
        await oye('Agro nota en media hora mirar el filtro', 1200)
        nt = await pg.evaluate("(st.notas||[]).find(n=>n.texto==='Mirar el filtro')"); assert nt and nt['cuando'], nt
        # 4. tareas
        d = await oye('Agro tarea para mí el lunes: revisar los filtros de Franco', 1200)
        print('TAREAS', await pg.evaluate("Store.listCol('tareas',10).then(l=>l.map(x=>x.titulo))")); tk = await pg.evaluate("Store.listCol('tareas',10).then(l=>l.find(x=>x.titulo.startsWith('Revisar')))"); print('tarea:', tk['titulo'], tk['para'], tk['fecha'], d)
        assert tk['titulo'] == 'Revisar los filtros de Franco' and tk['para'] == 'juanjo.serrano3@gmail.com' and tk['fecha'] > hoyF
        await oye('Agro tarea urgente: limpiar el filtro de anillas', 1200)
        d = await oye('Agro ¿qué tareas tengo?', 1500); assert 'Limpiar el filtro de anillas' in d[0] and '1 urgente' in d[0] and 'Revisar' not in d[0]
        d = await oye('Agro tarea hecha: limpiar filtro anillas', 1500); assert d[0].startswith('Tarea hecha')
        assert await pg.evaluate("Store.listCol('tareas',10).then(l=>l.find(x=>x.titulo.startsWith('Limpiar')).hecha)") is True
        # 5. llenado completo y deshacer
        bn = await pg.evaluate("bidonesDe('gas').find(b=>b.principal==='hno3')")
        d = await oye('Agro he llenado el bidón nítrico', 2000); assert 'guardado' in d[0], d
        ll = await pg.evaluate(f"Store.listCol('llenados',10).then(l=>l.filter(x=>x.bidon==='{bn['id']}').length)"); assert ll == 1
        d = await oye('Agro deshacer', 1500); assert 'llenado borrado' in d[0]
        assert await pg.evaluate(f"Store.listCol('llenados',10).then(l=>l.filter(x=>x.bidon==='{bn['id']}').length)") == 0
        d = await oye('Agro llenado bidón nítrico 40', 1000); assert await pg.evaluate("st.tab") == 'rellenar' and await pg.evaluate("st.lf&&st.lf.add") == 40
        await pg.evaluate("st.lf=null")
        d = await oye('Agro ¿qué depósitos hay que llenar?'); assert d[0].startswith('Toca llenar') or d[0].startswith('Ningún')
        # 6. observaciones, qué falta, resumen
        await oye('Agro observaciones: se ha cambiado el filtro')
        assert await pg.evaluate("st.reg.obs.gas") == 'Se ha cambiado el filtro'
        await oye('Agro bandeja 3.1 850')
        d = await oye('Agro ¿qué me falta?'); assert 'falta' in d[0] and 'metros cúbicos' in d[0] and 'cambios sin guardar' in d[0]
        d = await oye('Agro resumen'); assert d[0].startswith('Gasolinera')
        # 7. cambiar de día (guarda antes lo pendiente)
        d = await oye('Agro ayer', 2500); ay = await pg.evaluate("st.fecha"); assert ay < hoyF and 'ayer' in d[0]
        assert await pg.evaluate("Store.getReg(hoy()).then(r=>r.obs.gas)") == 'Se ha cambiado el filtro', 'al cambiar de día se guarda lo pendiente'
        await oye('Agro hoy', 1500); assert await pg.evaluate("st.fecha") == hoyF
        # 8. mensajes y tiempo
        await oye('Agro mensaje: falta ácido en Franco', 1200)
        d = await oye('Agro ¿tengo mensajes?', 1200); assert 'mensaje pendiente' in d[0] and 'Falta ácido en Franco' in d[0]
        d = await oye('Agro ¿qué tiempo hace?', 1500); assert '21 grados' in d[0] and 'máxima de 25' in d[0], d
        # 9. fichar: la primera vez pide aceptar el aviso de ubicación
        d = await oye('Agro fichar entrada', 1500); print('fichar:', d)
        assert 'aviso de ubicación' in d[0] or 'cuenta' in d[0]
        if 'aviso' in d[0]:
            await pg.evaluate("localStorage.setItem('abono.ubic.aviso.'+miEmail(),'1')")
            d = await oye('Agro fichar entrada', 3000); assert d[0].startswith('Entrada fichada'), d
        # 10. ayuda: abre la chuleta en Ajustes
        await oye('Agro ayuda', 800)
        print('ayuda:', await pg.evaluate("[st.tab,!!$('#vz_ej'),$('#vz_ej')&&$('#vz_ej').open]"))
        assert await pg.evaluate("st.tab") == 'ajustes' and await pg.evaluate("$('#vz_ej')&&$('#vz_ej').open")
        await pg.locator('#vz_ej').screenshot(path='pruebas/salida/t90-chuleta.png')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

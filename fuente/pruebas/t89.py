"""Control por voz: palabra «Agro», números dichos con palabras, datos de drenaje, sectores, contador, bidones y balsa,
deshacer y guardar, notas, mensajes, incidencias en el plano y preguntas a la IA con respuesta hablada.
El reconocimiento y la voz del navegador se sustituyen por unos de prueba."""
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
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        await ctx.add_init_script(FALSO)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await ctx.route('https://ia.prueba.workers.dev/**', servidor)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='pla';st.cfg.iaUrl='https://ia.prueba.workers.dev';st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(600)
        # 0. números dichos con palabras
        t = await pg.evaluate("[vzToks('bandeja tres punto dos novecientos'),vzToks('sector cuatro ciento veinte minutos doce riegos'),vzToks('ce cuatro coma dos'),vzToks('pe hache seis coma cero cinco'),vzToks('cuatro mil cuatrocientos'),vzToks('treinta y cinco'),vzToks('m³ 460')]")
        print('números:', t)
        assert t == [['bandeja', '3.2', '900'], ['sector', '4', '120', 'minutos', '12', 'riegos'], ['ce', '4,2'], ['ph', '6,05'], ['4400'], ['35'], ['metroscubicos', '460']]
        # 1. se enciende en Ajustes y empieza a escuchar
        assert await pg.locator('#vzbtn').is_visible()
        await pg.check('[data-vz="on"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("vz.on&&vz.activo") and await pg.evaluate("localStorage.getItem('abono.voz')") == '1'
        ids = await pg.evaluate("(()=>{const c=cabById('gas');return{b31:c.sectores[0].bandejas[0].id,b32:c.sectores[0].bandejas[1].id,s4:c.sectores[1].id,n31:c.sectores[0].bandejas[0].nombre,n32:c.sectores[0].bandejas[1].nombre}})()")
        print(ids)
        async def oye(t, ms=700):
            n = await pg.evaluate("window.__dichos.length")
            for _ in range(30):
                if await pg.evaluate(f"window.__oye({json.dumps(t)})"): break
                await pg.wait_for_timeout(100)
            else: raise AssertionError('el micrófono no estaba escuchando: ' + t)
            await pg.wait_for_timeout(ms)
            d = await pg.evaluate(f"window.__dichos.slice({n})"); print(f'  «{t}» →', d); return d
        # 2. con el cabezal delante, varios datos de una bandeja
        d = await oye('Agro, Gasolinera bandeja 3.1 850 CE 4,2 pH 6,1')
        r = await pg.evaluate(f"[st.cab,st.reg.dren['{ids['b31']}'],st.reg.ceD['{ids['b31']}'],st.reg.phD['{ids['b31']}'],st.tab]"); print(r)
        assert r == ['gas', 850, 4.2, 6.1, 'drenaje'] and '850 mililitros' in d[0]
        assert await pg.locator(f'#dr_{ids["b31"]}').input_value() == '850'
        await pg.screenshot(path='pruebas/salida/t89-voz.png')
        # 3. sin «Agro» no se hace nada
        d = await oye('bandeja 3.2 900'); assert d == [] and await pg.evaluate(f"st.reg.dren['{ids['b32']}']") is None
        # 4. «Agro» a secas y la orden después, con números en palabras y la CE en µS
        d = await oye('agro', 500); assert d == [] and await pg.evaluate('Date.now()<vz.armado'), 'con «Agro» a secas espera la orden (sin hablar, para no cortar el micrófono)'
        d = await oye('bandeja tres punto dos novecientos ce cuatro mil cuatrocientos')
        assert await pg.evaluate(f"[st.reg.dren['{ids['b32']}'],st.reg.ceD['{ids['b32']}']]") == [900, 4.4]
        # 4b. iPhone: texto que crece y sin marca de final; «Agro» escrito de otras formas
        async def oye_ios(partes, final=False, ms=700):
            n = await pg.evaluate("window.__dichos.length")
            for _ in range(30):
                if await pg.evaluate(f"window.__oyeIOS({json.dumps(partes)},{'true' if final else 'false'})"): break
                await pg.wait_for_timeout(100)
            else: raise AssertionError('no escuchaba')
            await pg.wait_for_timeout(ms); d = await pg.evaluate(f"window.__dichos.slice({n})"); print(f'  iPhone {partes[-1]!r} →', d); return d
        d = await oye_ios(['Agro', 'Agro bandeja', 'Agro bandeja 3.2 950'])
        assert await pg.evaluate(f"st.reg.dren['{ids['b32']}']") == 950 and len(d) == 1, 'la frase se usa una sola vez al acabar'
        d = await oye_ios(['Hagro bandeja 3,2 960'], final=True); assert await pg.evaluate(f"st.reg.dren['{ids['b32']}']") == 960
        d = await oye('Ogro, bandeja 3.2 970'); assert await pg.evaluate(f"st.reg.dren['{ids['b32']}']") == 970
        # 4c. seguir sin «Agro» justo después de una orden de datos, y no hacer caso a una conversación
        d = await oye('Agro bandeja 3.1'); assert 'qué apunto' in d[0]
        await oye('870'); await oye('pH 6,2')
        assert await pg.evaluate(f"[st.reg.dren['{ids['b31']}'],st.reg.phD['{ids['b31']}']]") == [870, 6.2]
        d = await oye('mañana vamos al almacén'); assert d == []
        log = await pg.evaluate("vz.log.slice(0,3).map(x=>[x.t,x.u])"); print('registro:', log); assert log[0] == ['mañana vamos al almacén', False]
        # 5. sector, deshacer
        await oye('Agro sector 4 ciento veinte minutos doce riegos')
        assert await pg.evaluate(f"[st.reg.min['{ids['s4']}'],st.reg.rie['{ids['s4']}']]") == [120, 12]
        d = await oye('agro deshacer'); assert d == ['Deshecho'] and await pg.evaluate(f"st.reg.rie['{ids['s4']}']") is None
        # 6. valores que no cuadran no se apuntan
        d = await oye('agro bandeja 3.1 pH 61'); assert 'no me cuadra' in d[0] and await pg.evaluate(f"st.reg.phD['{ids['b31']}']") == 6.2
        # 7. contador, balsa y bidón
        await oye('Agro metros cúbicos 460'); await oye('agro CE balsa 1,5'); await oye('agro pe hache de salida 5,6')
        assert await pg.evaluate("[st.reg.m3.gas,st.reg.ceB.gas,st.reg.phS.gas,st.tab]") == [460, 1.5, 5.6, 'drenaje']
        bn = await pg.evaluate("bidonesDe('gas').find(b=>b.principal==='hno3')"); print('bidón nítrico:', bn['nombre'])
        d = await oye('agro bidón nítrico 9,7'); assert bn['nombre'] in d[0]
        assert await pg.evaluate(f"st.reg.cm['{bn['id']}']===9.7||st.reg.niv['{bn['id']}']===9.7")
        # 8. guardar
        d = await oye('agro guardar', 2500); assert d == ['Guardado']
        g = await pg.evaluate(f"Store.getReg(st.fecha).then(r=>[r.dren['{ids['b31']}'],r.m3.gas])"); print('guardado:', g); assert g == [870, 460]
        # 9. nota, mensaje e incidencia en el plano
        await oye('Agro, nota: llamar al técnico del riego', 1200)
        nt = await pg.evaluate("(st.notas||[]).map(n=>n.texto)"); print('notas:', nt); assert 'Llamar al técnico del riego' in nt
        await oye('Agro mensaje: el filtro de Gasolinera está sucio', 1200)
        ms = await pg.evaluate("Store.listMsgs().then(l=>l.map(m=>m.txt))"); print('mensajes:', ms); assert 'El filtro de Gasolinera está sucio' in ms
        d = await oye('Agro mensaje para Nadie: hola'); assert 'No encuentro' in d[0]
        d = await oye('Agro incidencia urgente nave 5 mosca blanca en la entrada', 1200); assert 'nave 5' in d[0]
        inc = await pg.evaluate("Store.listCol('incidencias',10).then(l=>l[0])"); print('incidencia:', inc['nave'], inc['tipo'], inc['prio'], inc['txt'])
        assert inc['nave'] == 5 and inc['tipo'] == 'plaga' and inc['prio'] == 'alta' and inc['cab'] == 'gas'
        # 10. pregunta a la IA: contesta corto y hablando, y queda en el asistente
        d = await oye('Agro ¿por qué sube la CE del drenaje?', 2000)
        assert d and d[-1].startswith('Sube porque') and '**' not in d[-1]
        assert 'voz alta' in pedidos[-1]['contexto'] and 'Por qué sube la CE' in pedidos[-1]['chat'][-1]['text']
        # 11. no entiende → lo dice; al hablar se para el micrófono y luego vuelve a escuchar
        d = await oye('agro patata frita'); assert 'No te he entendido' in d[0]
        assert await pg.evaluate("vz.activo") and await pg.evaluate("window.__starts") > 5
        # 12. si el navegador corta el micrófono, vuelve a escuchar solo
        n0 = await pg.evaluate("window.__starts"); await pg.evaluate("(()=>{const r=window.__rec.find(x=>x.activo);r.activo=false;r.onend()})()"); await pg.wait_for_timeout(800)
        assert await pg.evaluate("window.__starts") == n0 + 1 and await pg.evaluate("vz.activo")
        # 12b. iPhone colgado: el reconocedor no abre el micrófono ni contesta al pararlo → el vigilante lo tira y empieza otro
        n0 = await pg.evaluate("(()=>{const r=window.__rec.find(x=>x.activo);window.__colgado=r;r.stop=r.abort=()=>{};vz.audioOk=true;return window.__starts})()")
        await pg.wait_for_timeout(4500)
        assert await pg.evaluate("window.__starts") > n0 and await pg.evaluate("vz.activo&&vz.rec&&vz.rec!==window.__colgado"), 'el vigilante tiene que reiniciar la escucha'
        await pg.evaluate("vz.audioOk=false;window.__colgado.activo=false")   # el sistema acaba soltándolo
        d = await oye('Agro abre cuentas'); assert await pg.evaluate("st.tab") == 'cuentas'
        # 13. botón sin palabra clave (con la escucha apagada)
        await pg.evaluate("st.tab='ajustes';renderMain()"); await pg.wait_for_timeout(200); await pg.uncheck('[data-vz="on"]'); await pg.wait_for_timeout(300)
        assert not await pg.evaluate("vz.on") and not await pg.evaluate("window.__rec.some(x=>x.activo)")
        await pg.click('#vzbtn'); await pg.wait_for_timeout(300)
        d = await oye('abre drenaje'); assert await pg.evaluate("st.tab") == 'drenaje'
        await pg.wait_for_timeout(300); assert not await pg.evaluate("window.__rec.some(x=>x.activo)"), 'con la escucha apagada, el botón solo oye una orden'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""AGRO, el experto con avatar: voz natural del servidor (la boca sigue el audio; si falla, voz del móvil con aviso; «Voz: no» calla),
estados del avatar (escucha / piensa / habla), detalle solo en pantalla, y «Pasar con un técnico»: AGRO solo abre el formulario, la persona
lo confirma, se guarda la consulta y se avisa a los administradores; el administrador la ve, contesta por mensaje privado y la marca atendida."""
import asyncio, sys, json
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read(); WAV = open('pruebas/datos/voz-prueba.wav', 'rb').read()
VOZ = r"""window._dicho=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,cancel(){},getVoices(){return [{lang:'es-ES',name:'x'}]},speak(u){window._dicho.push(u.text);setTimeout(()=>u.onend&&u.onend(),10)}}});
window.SpeechSynthesisUtterance=function(t){this.text=t};
window._oir='';window.SpeechRecognition=function(){const r=this;this.start=()=>{setTimeout(()=>{r.onresult&&r.onresult({results:[Object.assign([{transcript:window._oir}],{isFinal:true})]});setTimeout(()=>r.onend&&r.onend(),20)},50)};this.stop=()=>{r.onend&&r.onend()}};
"""
IA = "window._prs=[];window._resp=[];window.iaFotoJson=async(pr,b,o)=>{window._prs.push(pr);const r=window._resp.shift();if(r&&r.error)throw r.error;return r};window._push=[];window.pushEnviar=(...a)=>window._push.push(a);0"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid', is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        voz = {'modo': 'ok', 'n': 0, 'textos': []}
        async def ia(r):
            rq = r.request
            if rq.method == 'GET': return await r.fulfill(content_type='application/json', body=json.dumps({'ok': True, 'configurado': True, 'proveedor': 'Claude', 'voz': True}), headers={'access-control-allow-origin': '*'})
            if rq.method == 'OPTIONS': return await r.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'})
            voz['n'] += 1; voz['textos'].append(json.loads(rq.post_data)['voz'])
            if voz['modo'] == 'creditos': return await r.fulfill(status=502, content_type='application/json', body='{"error":"creditos"}', headers={'access-control-allow-origin': '*'})
            await r.fulfill(body=WAV, content_type='audio/mpeg', headers={'access-control-allow-origin': '*'})
        await ctx.route('https://ia.prueba.workers.dev/**', ia)
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await ctx.add_init_script(VOZ)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate(IA); await pg.evaluate("cerrarSplash();st.cfg.iaUrl='https://ia.prueba.workers.dev';st.cfg.avisosUrl='https://av.prueba.workers.dev';st.finca='pinta';st.cab='gas';st.tab='hoy';renderAll()"); await pg.wait_for_timeout(600)
        # el botón es la cara de AGRO
        assert await pg.evaluate("!!document.querySelector('#agbtn svg.av-fab')") and await pg.get_attribute('#agbtn', 'aria-label') == 'Hablar con nuestro experto'
        # 1) abrir (gesto del usuario: desbloquea el audio) → título, avatar, aviso de que es IA y el servidor dice que hay voz
        await pg.evaluate("window._oir=''"); await pg.click('#agbtn'); await pg.wait_for_timeout(900)
        t = (await pg.text_content('#agp')).upper(); assert 'HABLAR CON NUESTRO EXPERTO' in t and 'EXPERTO VIRTUAL (IA)' in t and 'PASAR CON UN TÉCNICO' in t
        assert await pg.evaluate("window.IA_VOZ") is True and await pg.evaluate("!!agCtx&&agCtx.state") == 'running', await pg.evaluate("agCtx&&agCtx.state")
        assert await pg.get_attribute('#agp .av', 'data-e') in ('idle', 'listen')
        # 2) voz natural: pide el audio al servidor, NO usa la del móvil, la boca se mueve con el sonido y vuelve a cerrarse
        await pg.evaluate("window._dicho.length=0"); n0 = voz['n']
        await pg.evaluate("agHabla('Quedan 38 cm en el potásico. Rellénalo hoy.')")
        vs = set()
        for _ in range(14):
            await pg.wait_for_timeout(100); vs.add(await pg.evaluate("document.getElementById('av-boca').dataset.v"))
            if await pg.get_attribute('#agp .av', 'data-e') == 'talk': hablando = True
        assert voz['n'] == n0 + 1 and 'centímetros' in voz['textos'][-1], voz
        assert await pg.evaluate("window._dicho.length") == 0, 'con voz natural no habla el móvil'
        assert len(vs - {'0'}) >= 1, ('la boca no se mueve', vs)
        await pg.wait_for_timeout(1300); assert await pg.evaluate("[AG.hab,document.getElementById('av-boca').dataset.v]") == [False, '0'], 'al acabar, boca cerrada'
        # repetir la misma frase no vuelve a gastar voz (caché)
        await pg.evaluate("agHabla('Quedan 38 cm en el potásico. Rellénalo hoy.')"); await pg.wait_for_timeout(300); assert voz['n'] == n0 + 1, 'caché'
        await pg.evaluate("agCalla()")
        # 3) estados del avatar: piensa mientras la IA contesta
        await pg.evaluate("window.iaFotoJson=async()=>new Promise(()=>{});0"); await pg.fill('#agtxt', 'qué tiempo hace'); await pg.press('#agtxt', 'Enter'); await pg.wait_for_timeout(300)
        assert await pg.get_attribute('#agp .av', 'data-e') == 'think' and 'PENSANDO' in (await pg.text_content('#avcap')).upper()
        await pg.evaluate("AG.busy=false;AG.hist=[];agPinta()")
        # 4) detalle solo en pantalla: se lee «decir», se ve «ver»
        await pg.evaluate("window.iaFotoJson=async(pr,b,o)=>{window._prs.push(pr);return {decir:'Parece oidio.',ver:'1. Mira el envés de la hoja. 2. Quita las hojas bajas.',acciones:[]}};0")
        n1 = voz['n']; await pg.fill('#agtxt', 'las hojas se ponen blancas'); await pg.press('#agtxt', 'Enter'); await pg.wait_for_timeout(1500)
        assert 'MIRA EL ENVÉS' in (await pg.text_content('#agcv')).upper() and voz['textos'][-1] == 'Parece oidio.' and voz['n'] == n1 + 1, voz['textos']
        pr = await pg.evaluate("window._prs[window._prs.length-1]"); assert 'Eres AGRO, el experto de Agro FLY' in pr and '"tipo":"tecnico"' in pr and 'Eres una IA' in pr and '"ver"' in pr
        # 5) sin saldo de voz: habla el móvil, lo dice y no insiste con la voz de pago
        voz['modo'] = 'creditos'; await pg.evaluate("window._dicho.length=0;AG.cache.clear()"); n2 = voz['n']
        await pg.evaluate("agHabla('Prueba sin saldo.')"); await pg.wait_for_timeout(700)
        assert await pg.evaluate("window._dicho") == ['Prueba sin saldo.'] and 'SALDO' in (await pg.text_content('#agcv')).upper() and await pg.evaluate("window.IA_VOZ") is False
        await pg.evaluate("agHabla('Otra más.')"); await pg.wait_for_timeout(300); assert voz['n'] == n2 + 1, 'tras el fallo no vuelve a pedir voz de pago'
        # 6) «Voz: no» calla del todo
        await pg.click('#agvozt'); await pg.evaluate("window._dicho.length=0"); await pg.evaluate("agHabla('No me oyes')"); await pg.wait_for_timeout(300)
        assert await pg.evaluate("window._dicho.length") == 0 and 'VOZ: NO' in (await pg.text_content('#agvozt')).upper(); await pg.click('#agvozt')
        # 7) pasar con un técnico: AGRO solo abre el formulario; no se envía nada hasta que la persona confirma
        await pg.evaluate("NUBE.acc=NUBE.acc||{};NUBE.acc.emails=[...(NUBE.acc.emails||[]),'jefe@x.es'];NUBE.acc.info={...(NUBE.acc.info||{}),'jefe@x.es':{admin:true}}")
        await pg.evaluate("window.iaFotoJson=async()=>({decir:'Vale, preparo el aviso al técnico.',acciones:[{tipo:'tecnico',resumen:'Hojas blancas en la nave 3 desde hace una semana; se ha quitado la hoja baja.',urgente:true}]});0")
        await pg.fill('#agtxt', 'sí, avisa a un técnico'); await pg.press('#agtxt', 'Enter'); await pg.wait_for_timeout(1500)
        assert await pg.locator('#agtec').is_visible() and 'HOJAS BLANCAS EN LA NAVE 3' in (await pg.text_content('#agtec')).upper() and await pg.is_checked('#agtecu')
        assert await pg.evaluate("window._push.length") == 0 and (await pg.evaluate("Store.listCol('consultas')")) == [], 'sin confirmar no se envía nada'
        await pg.screenshot(path='pruebas/salida/t168-tecnico.png')
        await pg.fill('#agtecm', 'Llevo dos días sin poder tratar'); await pg.click('[data-ag="tec-envia"]'); await pg.wait_for_timeout(1200)
        cs = await pg.evaluate("Store.listCol('consultas')"); assert len(cs) == 1, cs; c = cs[0]
        assert c['email'] == 'juanjo.serrano3@gmail.com' and c['urgente'] is True and c['estado'] == 'nueva' and c['finca'] == 'pinta' and c['cab'] == 'gas' and c['mensaje'] == 'Llevo dos días sin poder tratar' and 'Hojas blancas' in c['resumen'] and any('blancas' in x['t'] for x in c['conv'])
        pu = await pg.evaluate("window._push"); assert len(pu) == 1 and pu[0][0] == ['jefe@x.es'] and pu[0][1].startswith('URGENTE') and pu[0][4] == 'consultas', pu
        assert await pg.locator('#agtec').is_hidden() and 'HE AVISADO AL TÉCNICO' in (await pg.text_content('#agcv')).upper()
        # cancelar el formulario no envía nada
        await pg.click('[data-ag="tecnico"]'); await pg.click('[data-ag="tec-no"]'); assert await pg.locator('#agtec').is_hidden() and len(await pg.evaluate("Store.listCol('consultas')")) == 1
        # sin nada que contar, no envía
        await pg.click('[data-ag="tecnico"]'); await pg.evaluate("AG.hist=[]"); await pg.click('[data-ag="tec-envia"]'); await pg.wait_for_timeout(300)
        assert len(await pg.evaluate("Store.listCol('consultas')")) == 1 and await pg.locator('#agtec').is_visible(); await pg.click('[data-ag="tec-no"]')
        await pg.click('[data-ag="cerrar"]')
        # 8) el administrador la ve en Equipo → Consultas al técnico, con aviso en Hoy; contesta por mensaje privado y queda atendida
        await pg.evaluate("st.cons=undefined;st.tab='hoy';renderAll()"); await pg.wait_for_timeout(800)
        av = await pg.evaluate("hoyAvisos().map(a=>a[1]+'|'+a[2])"); assert '1 consulta al técnico por atender|consultas' in av, av
        await pg.evaluate("st.hoyAv=true;renderMain()"); assert 'CONSULTA AL TÉCNICO POR ATENDER' in (await pg.text_content('#main')).upper()
        await pg.evaluate("st.tab='consultas';renderAll()"); await pg.wait_for_timeout(500)
        m = (await pg.text_content('#main')).upper(); assert 'CONSULTAS AL TÉCNICO' in m and 'URGENTE' in m and 'POR ATENDER' in m and 'LLEVO DOS DÍAS' in m and 'CONVERSACIÓN CON AGRO' in m
        assert await pg.locator('[data-cons="resp"]').count() == 0, 'no se responde a uno mismo'
        await pg.evaluate("st.cons[0].email='ana@x.es';st.cons[0].nombre='Ana';renderMain()"); await pg.wait_for_timeout(200)
        await pg.click('[data-cons="resp"]'); await pg.fill('[data-cons-txt]', 'Trata hoy con azufre y avísame'); await pg.click('[data-cons="resp-ok"]'); await pg.wait_for_timeout(800)
        pv = await pg.evaluate("st.priv"); assert pv and pv[0]['para'] == 'ana@x.es' and 'azufre' in pv[0]['txt'] and 'ana@x.es' in pv[0]['miembros']
        assert await pg.evaluate("window._push[window._push.length-1][0]") == ['ana@x.es']
        assert await pg.evaluate("st.cons[0].estado") == 'atendida' and 'ATENDIDA' in (await pg.text_content('#main')).upper()
        await pg.screenshot(path='pruebas/salida/t168-consultas.png')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

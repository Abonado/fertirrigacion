"""v212: RoboLab XXI dentro del Taller. Se abre en un marco que no se recarga al cambiar de pestaña ni al ponerlo a pantalla completa;
three.js lo sirve la propia app; trae los ejemplos de Agro Fly (nodo de suelo, clima, electroválvula con relé y nivel de bidón) y
la electroválvula de 12 V; si la IA de la app está puesta, «Quiero hacer…» la usa."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader']); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        ext = []
        async def red(r):
            u = r.request.url
            if 'gstatic.com' in u: return await r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in u else '')
            if 'open-meteo' in u: return await r.abort()
            if 'jsdelivr' in u or 'unpkg' in u: ext.append(u); return await r.abort()
            if 'fonts.g' in u: return await r.fulfill(body='')
            return await r.continue_()
        await ctx.route('**/*', red)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='robolab';renderCabs();renderTabs();renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.locator('#tabs [data-tab="robolab"]').count() == 1
        fr = pg.frame_locator('#rlfr'); f = None
        for _ in range(40):
            f = next((x for x in pg.frames if x.url.endswith('robolab.html')), None)
            if f and await f.evaluate("!document.getElementById('loading')"): break
            await pg.wait_for_timeout(250)
        assert f and await f.evaluate("!document.getElementById('loading')"), 'RoboLab no arranca'
        assert ext == [], ext                       # three.js sale de la app, no de otro servidor
        # marco encima del hueco de la pestaña
        r = await pg.evaluate("(()=>{const a=$('#rlslot').getBoundingClientRect(),b=$('#rlwrap').getBoundingClientRect();return [Math.round(a.top-b.top),Math.round(a.width-b.width),Math.round(a.height)]})()")
        assert r[0] == 0 and r[1] == 0 and r[2] >= 460, r
        assert await f.evaluate("document.getElementById('brandSub').textContent") == 'Laboratorio · Agro Fly'
        # mesa nueva: sale el nodo de suelo de Agro Fly; en Ejemplos están los cuatro
        await f.evaluate("document.querySelector('#tabs button[data-t=\"ex\"]').click()"); await pg.wait_for_timeout(200)
        ej = await f.evaluate("[...document.querySelectorAll('#items .tray-item b')].map(x=>x.textContent)")
        assert ej[:4] == ['Agro Fly · Nodo de suelo', 'Agro Fly · Clima de la nave', 'Agro Fly · Electroválvula de un sector', 'Agro Fly · Nivel de bidón'], ej
        res = {}
        for i in range(4):
            await f.evaluate(f"document.querySelectorAll('#items .tray-item')[{i}].click()"); await pg.wait_for_timeout(500)
            n = await f.evaluate("JSON.parse(localStorage.getItem('robolab-xxi')||'{}')")
            await f.evaluate("document.getElementById('play').click()"); await pg.wait_for_timeout(500)
            mon = await f.evaluate("[...document.querySelectorAll('#mbody .item')].map(x=>x.className.replace('item','').trim()+': '+x.querySelector('b').textContent)")
            res[ej[i]] = (len(n.get('parts', [])), len(n.get('wires', [])), mon)
            await f.evaluate("document.getElementById('play').click()"); await pg.wait_for_timeout(200)
        for k, v in res.items(): print(k, v)
        ev = res['Agro Fly · Electroválvula de un sector']
        assert ev[0] == 4 and ev[1] == 6 and any(x.startswith('ok: Electroválvula 12 V abierta') for x in ev[2]), ev
        assert not any(x.startswith('err') for v in res.values() for x in v[2]), res
        # marcar el marco: cambiar de pestaña y volver, y pantalla completa, sin recargar
        await f.evaluate("window.__marca=7")
        await pg.evaluate("st.tab='catalogo';renderTabs();renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.evaluate("$('#rlwrap').style.display") == 'none' and await f.evaluate("window.__pausa") is True
        await pg.evaluate("st.tab='robolab';renderTabs();renderMain()"); await pg.wait_for_timeout(300)
        assert await f.evaluate("window.__pausa") is False
        await pg.click('[data-rl="full"]'); await pg.wait_for_timeout(300)
        bb = await pg.locator('#rlwrap').bounding_box(); assert bb['y'] == 0 and bb['height'] == 900, bb
        await pg.screenshot(path='/tmp/rl_full.png')
        await pg.click('#rlwrap .rlsal')
        await pg.wait_for_timeout(300)
        assert await pg.locator('#rlwrap.rlfull').count() == 0
        f = next(x for x in pg.frames if x.url.endswith('robolab.html'))
        assert await f.evaluate("window.__marca") == 7
        await pg.screenshot(path='/tmp/rl_tab.png')
        # «Quiero hacer…» con la IA de la app
        await pg.evaluate("window.iaModo=()=>'servidor';window.iaFotoJson=async()=>({titulo:'Riego por humedad',explicacion:'Abre la válvula si el suelo está seco.',placa:'esp32',piezas:['suelo','rele','ev12'],extra:[],consejos:[]})")
        await f.evaluate("location.reload()"); await pg.wait_for_timeout(2500)
        f = next(x for x in pg.frames if x.url.endswith('robolab.html'))
        await f.evaluate("document.getElementById('btnAsk').click()"); await pg.wait_for_timeout(200)
        assert 'IA de Agro Fly' in await f.evaluate("document.getElementById('aSrc').textContent")
        await f.fill('#aIn', 'abrir el riego cuando el suelo esté seco'); await f.evaluate("document.getElementById('aGo').click()"); await pg.wait_for_timeout(800)
        t = await f.evaluate("document.getElementById('aOut').textContent"); assert 'Plan de la IA' in t and 'Electroválvula 12 V' in t, t[:300]
        # sin la contraseña del Taller (puesta) no se ve
        assert await pg.evaluate("(()=>{st.cfg.tallerClave={h:'x',s:'y'};tlRecordar(null);st.tab='robolab';renderMain();return !!$('#rlslot')})()") is False
        assert await pg.evaluate("$('#rlwrap').style.display") == 'none'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

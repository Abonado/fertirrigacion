"""v210: Planos (26 naves), Franco (11 parcelas) y Metálicos (28 naves, con la 0) dibujados como sus planos de riego.
Lo apuntado en las naves de antes pasa a la nave nueva; Instalación trae las electroválvulas y llaves del plano y sus tuberías;
en En vivo › Toda la finca, al tocar una nave sale su ficha del plano de riego."""
import asyncio, sys, json
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        docs = {'abonado_incidencias/i1': {'ts': '2026-11-01T10:00:00Z', 'fecha': '2026-11-01', 'cab': 'pla', 'finca': 'pinta', 'nave': 2, 'pasillo': 3, 'x': 100, 'y': 640, 'tipo': 'plaga', 'prio': 'media', 'txt': 'prueba', 'fotos': [], 'estado': 'abierta'},
                'abonado_tareas/t1': {'titulo': 'Atar', 'cab': 'fra', 'nave': 1, 'fecha': '2026-11-13', 'hecha': False, 'para': '', 'finca': 'pinta'}}
        await pg.evaluate("d=>localStorage.setItem('mockfb',JSON.stringify({docs:d,users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))", docs)
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        # naves de los planos
        n = await pg.evaluate("Object.fromEntries(['pla','fra','met'].map(k=>[k,MAPAS[k].naves.map(v=>v.n)]))")
        assert n['pla'] == list(range(1, 27)) and n['fra'] == list(range(1, 12)) and n['met'] == list(range(0, 28)), n
        # migración hecha una vez: incidencia y tarea en su nave nueva, con la de antes guardada
        assert await pg.evaluate("(st.cfg.mig||{}).navesPlanos") == 1
        i1 = await pg.evaluate("Store.listCol('incidencias',0).then(l=>l.find(x=>x.id==='i1'))")
        esp = await pg.evaluate("MAPAS.pla.naves.find(v=>dentro([100,640],v.p)).n")
        assert i1['nave'] == esp and i1['naveAntes'] == 2 and i1['navMig2'] == 1 and i1['pasillo'] is not None, i1
        t1 = await pg.evaluate("Store.listCol('tareas',0).then(l=>l.find(x=>x.id==='t1'))")
        assert t1['nave'] == 5 and t1['naveAntes'] == 1, t1
        # Instalación: electroválvulas y llaves del plano
        el = await pg.evaluate("Object.fromEntries(['pla','fra','met'].map(k=>[k,(st.cfg.inst[k].el||[]).map(x=>x.t).join('')]))")
        assert el['pla'].count('ev') == 14 and el['fra'].count('ev') == 22 and el['met'].count('ev') == 28 and el['met'].count('lla') == 2 and el['pla'].count('lla') == 1, el
        assert await pg.evaluate("st.cfg.inst.met.el.find(x=>x.n==='EV nave 0').nave") == 0
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='met';st.tab='instal';st.in.vista='cab';renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.locator('#insvg .inred path').count() > 50
        await pg.click('[data-inact="red"]'); await pg.wait_for_timeout(300)
        assert await pg.locator('#insvg .inred').count() == 0
        await pg.click('[data-inact="red"]'); await pg.wait_for_timeout(300)
        # Mapa de la finca de los Metálicos: 28 naves, con la 0, y la nave 0 se puede elegir en una tarea
        await pg.evaluate("st.tab='mapa';renderAll()"); await pg.wait_for_timeout(400)
        assert await pg.locator('#mapsvg [data-nave]').count() == 28 and await pg.locator('#mapsvg [data-nave="0"]').count() == 1
        assert 'Nave 0' in await pg.evaluate("vvNaveSel('x','data-x','met','0')")
        # En vivo › Toda la finca: tocar la nave 0 de los Metálicos saca su ficha del plano de riego
        await pg.evaluate("st.tab='vivo';st.vv.todo=true;renderAll()"); await pg.wait_for_timeout(1500)
        assert await pg.locator('#vvsvg [data-vv^="fcab:met:"]').count() >= 28
        await pg.dispatch_event('#vvsvg [data-vv="fcab:met:0"]', 'click'); await pg.wait_for_timeout(500)
        t = await pg.text_content('#vvfcab'); assert 'nave 0' in t.lower() and '32 × 100' in t and 'Esta nave' in t and 'Qué hay en el plano' in t, t[:300]
        assert await pg.evaluate("(()=>{const i=document.querySelector('#vvfcab img');return !!i&&i.complete&&i.naturalWidth>0})()")
        await pg.click('#vvfcab [data-act="vv-plano"]'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("[st.tab,st.pr]") == ['planriego', 'metalicos']
        await pg.evaluate("st.tab='vivo';st.vv.todo=true;st.vv.fcab={cab:'fra',n:7};renderAll()"); await pg.wait_for_timeout(800)
        t = await pg.text_content('#vvfcab'); assert 'Sector 2' in t and '5.168 m²' in t and 'EV 13' in t, t[:300]
        await pg.click('#vvfcab [data-act="vv-inst"]'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("[st.tab,st.cab,st.in.vista]") == ['instal', 'fra', 'cab']
        # En vivo de Planos: al tocar una nave, lo que tiene según el plano
        await pg.evaluate("st.tab='vivo';st.vv.todo=false;st.cab='pla';renderAll()"); await pg.wait_for_timeout(800)
        await pg.evaluate("st.vv.sel='nave:3';renderMain()"); await pg.wait_for_timeout(500)
        t = await pg.text_content('#vvdet'); assert 'EV naves 2-3' in t and 'PE 40' in t, t[:300]
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

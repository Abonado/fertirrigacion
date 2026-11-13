"""v213: el personal de campo tiene el mismo menú que el de riego. Al entrar sale «Hoy» (saludo, avisos, fichar, su colla y los
cuadros de cada apartado); abajo Hoy, Personal, Trabajo, Finca y Más (Mensajes, Notas y Ajustes); el atrás vuelve a Hoy."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 400, 'height': 860}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("""cerrarSplash();st.finca='pinta';st.collas=[{id:'c1',nombre:'Colla Pepe',finca:'pinta',jefeEmail:'juanjo.serrano3@gmail.com',miembros:[{n:'A'},{n:'B'}]}];st.jorDias=999;
            st.cinc=[{id:'i1',colla:'c1',estado:'abierta',urg:true}];st.ctar=[{id:'t1',colla:'c1',fecha:'2026-11-01',hecha:false}];entrarArea('campo')"""); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.tab") == 'choy'
        assert await pg.evaluate("[...document.querySelectorAll('#grupos .grp')].map(b=>b.dataset.grupo)") == ['choy', 'cpersonal', 'ctrabajo', 'cfinca', 'cmasg']
        assert 'Buen' in await pg.text_content('#hoysal')
        assert await pg.locator('.hoynot.bad').count() == 1 and await pg.locator('.hoyfich [data-tab="cubic"]').count() == 1
        assert 'Parte de hoy sin guardar' in await pg.text_content('.hoycol')
        filas = await pg.evaluate("[...document.querySelectorAll('.hoyfila h3')].map(h=>h.textContent)")
        assert filas == ['Personal', 'Trabajo', 'Finca', 'Mensajes y notas'], filas
        await pg.click('[data-hoyav]'); await pg.wait_for_timeout(300)
        av = await pg.evaluate("[...document.querySelectorAll('.hoyav .hoyai')].map(b=>b.dataset.tab)")
        assert av == ['casist', 'cincid', 'ctareas'], av
        # insignias en Personal y Trabajo
        assert await pg.evaluate("[...document.querySelectorAll('#grupos .grp')].filter(b=>b.querySelector('.bdg')).map(b=>b.dataset.grupo)") == ['cpersonal', 'ctrabajo']
        # Personal: sus pestañas; el atrás vuelve a Hoy
        await pg.click('.grp[data-grupo="cpersonal"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("[st.tab,[...document.querySelectorAll('#tabs .tab')].map(b=>b.dataset.tab)]") == ['casist', ['casist', 'corend', 'coparte', 'cogente']]
        assert await pg.text_content('#fbackT') == 'Hoy'
        await pg.click('header .fback'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.tab") == 'choy'
        # Más: Mensajes, Notas y Ajustes; dentro de Mensajes sigue encendido «Más»
        await pg.click('.grp[data-grupo="cmasg"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("[...document.querySelectorAll('.masg h3')].map(h=>h.textContent)") == ['Mensajes', 'Notas', 'Ajustes']
        await pg.click('.masg [data-tab="cmensajes"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("document.querySelector('#grupos .grp[aria-pressed=\"true\"]').dataset.grupo") == 'cmasg'
        # el de riego sigue igual
        await pg.evaluate("st.tab='hoy';renderAll()"); await pg.wait_for_timeout(500)
        g = await pg.evaluate("[st.tab,[...document.querySelectorAll('#grupos .grp')].map(b=>b.dataset.grupo)]"); assert g[1] == ['hoy', 'riego', 'almacen', 'datos', 'mas'], g
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

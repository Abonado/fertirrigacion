"""Finca en vivo: el encargado da de alta un tractor, manda un trabajo con tractor a la nave 2 y una colla a la nave 4;
en el dibujo la colla aparece en su nave y el tractor sale de la caseta hacia la suya. Se puede tocar, girar y ver mañana."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("""(async()=>{await Store.addCol('collas',{nombre:'Colla Pepe',finca:'pinta',jefeEmail:'',activa:true,ent:'07:00',sal:'14:30',
          miembros:[{id:'a',n:'Ana'},{id:'b',n:'Luis'},{id:'c',n:'Rosa'}]});st.collas=null;await loadCollas()})()""")
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='vivo';renderAll()"); await pg.wait_for_timeout(1500)
        assert 'Sin trabajos con nave' in await pg.evaluate("document.querySelector('#main').textContent")
        # el encargado da de alta el tractor
        await pg.fill('#vv_mqn', 'Tractor 1'); await pg.select_option('#vv_mqt', 'tractor'); await pg.click('[data-act="vv-mq-add"]'); await pg.wait_for_timeout(500)
        mq = await pg.evaluate("st.cfg.maquinas"); print('máquinas:', mq); assert mq[0]['n'] == 'Tractor 1'
        assert await pg.locator('#vvsvg [data-vv^="maq:"]').count() == 1, 'tractor aparcado en la caseta'
        # tarea general con tractor a la nave 2
        await pg.evaluate("st.tab='tareas';renderAll()"); await pg.wait_for_timeout(500)
        await pg.click('[data-act="t-nueva"]'); await pg.wait_for_timeout(200)
        await pg.fill('#tf_titulo', 'Sulfatar'); await pg.select_option('#tf_cab', 'gas'); await pg.wait_for_timeout(300)
        await pg.select_option('#tf_nave', '2'); await pg.select_option('#tf_maq', mq[0]['id']); await pg.click('[data-act="t-crear"]'); await pg.wait_for_timeout(600)
        t = await pg.evaluate("st.tareas[0]"); print('tarea:', t['titulo'], t['cab'], t['nave'], t['maq']); assert t['nave'] == 2 and t['maq'] == mq[0]['id']
        await pg.evaluate("st.tFil='pend';renderMain()"); assert 'nave 2' in await pg.evaluate("document.querySelector('#main').textContent")
        # tarea de la colla a la nave 4
        await pg.evaluate("st.tab='ctareas';renderAll()"); await pg.wait_for_timeout(800)
        await pg.click('[data-act="ca-tar-nueva"]'); await pg.wait_for_timeout(200)
        await pg.fill('#ct_t', 'Bajar planta'); await pg.select_option('#ct_cab', 'gas'); await pg.wait_for_timeout(300); await pg.select_option('#ct_nave', '4')
        await pg.click('[data-act="ca-tar-crear"]'); await pg.wait_for_timeout(600)
        c = await pg.evaluate("st.ctar[0]"); print('tarea colla:', c['titulo'], c['cab'], c['nave']); assert c['nave'] == 4 and c['cab'] == 'gas'
        # el dibujo
        await pg.evaluate("st.tab='vivo';renderAll()"); await pg.wait_for_timeout(800)
        n = await pg.locator('#vvsvg [data-vv^="ct:"] .vvp').count(); print('personas de la colla:', n); assert n == 3
        assert await pg.locator('#vvsvg [data-vv^="maq:"] animateMotion').count() == 1, 'el tractor va de camino'
        txt = await pg.evaluate("document.querySelector('#main').textContent"); assert 'Sulfatar' in txt and 'Bajar planta' in txt
        await pg.wait_for_timeout(6000); await pg.screenshot(path='pruebas/salida/t81-vivo.png', full_page=False)
        await pg.locator('#vvsvg [data-vv^="ct:"]').first.dispatch_event('click'); await pg.wait_for_timeout(400)
        d = await pg.evaluate("document.querySelector('#vvdet').textContent"); print('detalle:', d[:90]); assert 'Colla Pepe' in d and '3 personas' in d
        await pg.click('#main .vvfila[data-vv^="t:"]'); await pg.wait_for_timeout(300)
        assert 'Tractor 1' in await pg.evaluate("document.querySelector('#vvdet').textContent")
        await pg.click('[data-act="vv-rot"][data-d="1"]'); await pg.wait_for_timeout(300); assert await pg.locator('#vvsvg [data-vv^="ct:"] .vvp').count() == 3
        for cab in ['pla', 'fra']:
            await pg.evaluate(f"st.cab='{cab}';renderMain()"); await pg.wait_for_timeout(300); await pg.locator('#vvwrap').screenshot(path=f'pruebas/salida/t81-{cab}.png'); assert await pg.locator('#vvsvg .vvn').count() >= 4
        await pg.evaluate("st.cab='gas';renderMain()"); await pg.click('[data-act="vv-dia"][data-d="man"]'); await pg.wait_for_timeout(300)
        assert 'para mañana' in await pg.evaluate("document.querySelector('#main').textContent")
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

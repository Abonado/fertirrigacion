"""M³ del mes (la hoja del contador): por zona día y acumulado, total de Planos + Gasolinera (comparten cabezal), Franco aparte,
contador del día 1 → lo que debería marcar y diferencia con el real; Excel. Y la barra de «Guardar» ya no queda tapada en el
ordenador ni por el menú de abajo ni por el botón de AGRO."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
def solapa(a, b): return a and b and not (a['x']+a['width'] <= b['x'] or b['x']+b['width'] <= a['x'] or a['y']+a['height'] <= b['y'] or b['y']+b['height'] <= a['y'])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        for vw, vh in ((1366, 768), (390, 844)):
            ctx = await b.new_context(service_workers='block', viewport={'width': vw, 'height': vh}, locale='es-ES', timezone_id='Europe/Madrid', accept_downloads=True)
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
            await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
            await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
            await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
            await pg.reload(); await pg.wait_for_timeout(600)
            await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
            await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.m3mes='2026-09';st.hist=[{fecha:'2026-09-02',m3:{pla:212,gas:244,fra:100}},{fecha:'2026-09-03',m3:{pla:200,gas:230}},{fecha:'2026-10-01',m3:{pla:150,gas:160,fra:90}},{fecha:'2026-10-02',m3:{pla:999}}];st.tab='m3mes';renderAll()")
            await pg.wait_for_timeout(500)
            G = await pg.evaluate("m3Grupos(fincaAct()).map(g=>g.slice().sort().join('+'))"); print(G); assert 'gas+pla' in G and 'fra' in G, G
            heads = await pg.locator('.m3t thead tr:first-child th').all_text_contents(); print(heads)
            assert any('Total' in h and 'Planos' in h and 'Gasolinera' in h for h in heads)
            filas = await pg.locator('.m3t tbody tr').count(); assert filas == 31, filas   # 30 días de septiembre + total
            txt = await pg.locator('.m3t').inner_text()
            r1 = await pg.locator('.m3t tbody tr').nth(0).inner_text(); r2 = await pg.locator('.m3t tbody tr').nth(1).inner_text(); r30 = await pg.locator('.m3t tbody tr').nth(29).inner_text(); print(r1, '|', r2, '|', r30)
            assert '456' in r1 and '430' in r2 and '886' in r2 and '412' in r2, 'suma de Planos+Gasolinera y acumulado'
            assert '1196' in r30.replace('.', '') and '1196' in (await pg.locator('.m3t tr.tot').inner_text()).replace('.', ''), 'el registro del 1 de octubre es el riego del 30 de septiembre'
            # contador
            await pg.locator('[data-m3c="ini"][data-g="gas+pla"]').fill('545057'); await pg.locator('[data-m3c="ini"][data-g="gas+pla"]').dispatch_event('change'); await pg.wait_for_timeout(300)
            c = await pg.locator('.m3c').first.inner_text(); print(c.replace('\n', ' ')); assert '546253' in c.replace('.', ''), c
            await pg.locator('[data-m3c="fin"][data-g="gas+pla"]').fill('546300'); await pg.locator('[data-m3c="fin"][data-g="gas+pla"]').dispatch_event('change'); await pg.wait_for_timeout(300)
            assert '+47 M³' in (await pg.locator('.m3c').first.inner_text()).upper()
            # la barra de guardar sale y no la tapa nada
            assert await pg.locator('#savebar').is_visible()
            sb = await pg.locator('#savebar .wrap').bounding_box(); bn = await pg.locator('#grupos').bounding_box(); ag = await pg.locator('#agbtn').bounding_box() if await pg.locator('#agbtn').is_visible() else None
            btn = await pg.locator('#savebar button').last.bounding_box()
            print(vw, 'savebar', sb, 'nav', bn, 'agro', ag)
            assert not solapa(btn, bn), 'el menú tapa el botón de guardar'; assert not solapa(btn, ag), 'AGRO tapa el botón de guardar'
            assert not solapa(sb, bn), 'el menú tapa la barra'; assert not solapa(sb, ag), 'AGRO encima de la barra'
            await pg.screenshot(path=f'pruebas/salida/t126-{vw}.png')
            await pg.click('#savebar button >> nth=-1'); await pg.wait_for_timeout(1200)
            assert await pg.evaluate("st.cfg.contador['gas+pla']['2026-09'].ini") == 545057
            assert await pg.evaluate("document.body.classList.contains('consave')") is False
            # Excel
            async with pg.expect_download() as d: await pg.click('[data-m3="xlsx"]')
            dl = await d.value; assert dl.suggested_filename.endswith('2026-09.xlsx'), dl.suggested_filename
            # octubre: Franco con 90, el 2 de octubre lleva lo de Planos del día 1
            await pg.evaluate("st.hist=[{fecha:'2026-10-02',m3:{pla:999}}];st.m3mes='2026-10';renderMain()"); await pg.wait_for_timeout(200)
            assert '999' in await pg.locator('.m3t tbody tr').nth(0).inner_text()
            await ctx.close()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

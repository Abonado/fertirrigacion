"""Riego → Cálculo del aforo: 6 piquetas por bandeja (10 min), las que se salen de 300–400 ml en rojo y se marcan como cambiadas,
aforo = suma ÷ 10, se guarda con el día y el encargado lo pone como caudal de la bandeja. También que los ml de drenaje se ven en el PC."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def entrar(b, w, h):
    ctx = await b.new_context(service_workers='block', viewport={'width': w, 'height': h}, locale='es-ES', timezone_id='Europe/Madrid')
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
    await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
    await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
    await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
    await pg.reload(); await pg.wait_for_timeout(600)
    await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
    await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='drenaje';renderAll()"); await pg.wait_for_timeout(500)
    return ctx, pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # 1. PC: la casilla de ml del drenaje tiene que verse entera (antes quedaba en una raya)
        ctx, pg, errs = await entrar(b, 1366, 800)
        bj = await pg.evaluate("cabById('gas').sectores[0].bandejas[0].id")
        w = await pg.evaluate(f"$('#dr_{bj}').getBoundingClientRect().width"); print('ancho casilla ml en PC:', w); assert w >= 60
        assert await pg.locator('#vzbtn').count() == 0, 'el control por voz está quitado'
        # 2. aforo
        await pg.click('#tabs [data-tab="aforo"]'); await pg.wait_for_timeout(500)
        ids = await pg.evaluate("cabById('gas').sectores[0].bandejas.map(b=>b.id)")
        for i, v in enumerate([350, 360, 340, 355, 345, 250]):
            await pg.fill(f'#af_{ids[0]}_{i}', str(v))
        await pg.wait_for_timeout(300)
        r = await pg.text_content(f'[data-out="afr_{ids[0]}"]'); print('resultado:', r)
        assert 'Suma 2000 ml' in r and '200,0 ml/min' in r and 'Cambiar la piqueta 6' in r
        assert await pg.locator(f'#af_{ids[0]}_5').evaluate("i=>i.closest('.afq').classList.contains('fuera')")
        assert await pg.locator(f'[data-afc="{ids[0]}"][data-i="5"]').is_visible() and not await pg.locator(f'[data-afc="{ids[0]}"][data-i="0"]').is_visible()
        await pg.check(f'[data-afc="{ids[0]}"][data-i="5"]'); await pg.wait_for_timeout(200)
        r = await pg.text_content(f'[data-out="afr_{ids[0]}"]'); assert 'cambiadas' in r and 'Cambiar la piqueta' not in r
        # la otra bandeja a medias
        for i, v in enumerate([330, 340, 335]):
            await pg.fill(f'#af_{ids[1]}_{i}', str(v))
        await pg.wait_for_timeout(200); r2 = await pg.text_content(f'[data-out="afr_{ids[1]}"]'); assert 'faltan 3 piquetas' in r2
        s = await pg.text_content('[data-out="afsum"]'); print('resumen:', s); assert '1 de 4 bandejas aforadas' in s
        await pg.screenshot(path='pruebas/salida/t91-aforo-pc.png', full_page=True)
        # 3. se guarda con el día
        await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1800)
        g = await pg.evaluate(f"Store.getReg(st.fecha).then(r=>r.afo['{ids[0]}'])"); print('guardado:', {k: g[k] for k in ('piq', 'cam', 'aforo', 'min')})
        assert g['aforo'] == 200 and g['cam'] == [5] and g['piq'] == [350, 360, 340, 355, 345, 250] and g['min'] == 10
        # 4. el encargado lo pone como caudal de la bandeja
        await pg.click(f'[data-afap="{ids[0]}"]'); await pg.wait_for_timeout(2500)
        c = await pg.evaluate(f"Store.getConfig().then(c=>c.cabezales.find(x=>x.id==='gas').sectores[0].bandejas.find(x=>x.id==='{ids[0]}').caudal)"); print('caudal guardado:', c)
        assert c == 200 and await pg.evaluate(f"bandeja('{ids[0]}').caudal") == 200
        g = await pg.evaluate(f"Store.getReg(st.fecha).then(r=>r.afo['{ids[0]}'])"); assert g['aplicado'] and g['caudalAnt'] == 209
        assert 'antes 209' in await pg.text_content(f'[data-out="afr_{ids[0]}"]')
        # 5. al volver al día se ven los datos
        await pg.evaluate("loadFecha(diaRiego(hoy())).then(()=>loadFecha(hoy()))"); await pg.wait_for_timeout(1500)
        assert await pg.input_value(f'#af_{ids[0]}_5') == '250'
        print('errs', errs); e1 = list(errs); await ctx.close()
        # 6. móvil
        ctx, pg, errs = await entrar(b, 430, 900)
        await pg.evaluate("st.tab='aforo';renderAll()"); await pg.wait_for_timeout(500)
        w = await pg.evaluate(f"$('#af_{ids[0]}_0').getBoundingClientRect().width"); print('ancho piqueta en móvil:', w); assert w >= 60
        await pg.screenshot(path='pruebas/salida/t91-aforo-movil.png', full_page=True)
        print('errs', errs); await b.close(); sys.exit(1 if errs or e1 else 0)
asyncio.run(main())

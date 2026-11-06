"""Stock del almacén (v198): lo que queda en sacos bien grande, para cuántos días con una barra y la raya del mínimo, el estado,
y lo urgente arriba. En el PC es una tabla con cabecera; en el móvil, una ficha por abono. El mínimo y el saco se siguen cambiando."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def abrir(b, w, h):
    ctx = await b.new_context(service_workers='block', viewport={'width': w, 'height': h}, locale='es-ES', timezone_id='Europe/Madrid')
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
    await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
    await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
    await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
    await pg.reload(); await pg.wait_for_timeout(600)
    await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
    # kno3: 412,5 kg, gasta 10/día → 41 días; k2so4: 60 kg y mínimo 100 → pedir; mkp: 50 kg, gasta 10/día → 5 días; kcl: 0 sin consumo
    await pg.evaluate("""(()=>{cerrarSplash();st.finca='pinta';st.cab='gas';const a=almAct(),d=n=>{const x=new Date();x.setDate(x.getDate()-n);return isoD(x)};
      st.alm=[{p:'kno3',tipo:'entrada',qty:712.5,fecha:d(29),alm:a,ts:'1'},{p:'kno3',tipo:'salida',qty:-300,fecha:d(5),alm:a,ts:'2'},
              {p:'k2so4',tipo:'entrada',qty:60,fecha:d(10),alm:a,ts:'3'},{p:'mkp',tipo:'entrada',qty:350,fecha:d(20),alm:a,ts:'4'},{p:'mkp',tipo:'salida',qty:-300,fecha:d(3),alm:a,ts:'5'}];
      st.cfg.stockMin[a+'|k2so4']=100;st.tab='almacen';renderAll()})()"""); await pg.wait_for_timeout(800)
    return pg, errs, ctx
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # PC
        pg, errs, ctx = await abrir(b, 1280, 900)
        assert await pg.is_visible('.stk-hd'), 'cabecera de la tabla en el PC'
        orden = await pg.evaluate("[...document.querySelectorAll('.stk-f')].map(f=>f.dataset.stk)"); print(orden)
        assert orden[0] == 'k2so4' and orden[1] == 'mkp', 'lo urgente arriba: primero para pedir, luego pocos días'
        kn = await pg.text_content('[data-stk="kno3"]'); print(kn)
        assert '16 sacos' in kn and '+ 12,5 kg' in kn and '412,5 kg en total' in kn and 'Para 41 días' in kn and 'Gasta 10,0 kg/día' in kn, kn
        assert 'Pedir' in await pg.text_content('[data-stk="k2so4"]') and 'Pocos días' in await pg.text_content('[data-stk="mkp"]')
        # las columnas están alineadas: la cantidad de todas las filas empieza en la misma x
        xs = await pg.evaluate("[...document.querySelectorAll('.stk-q')].map(e=>Math.round(e.getBoundingClientRect().left))"); assert len(set(xs)) == 1, xs
        w = await pg.evaluate("document.querySelector('[data-stk=\"kno3\"] .stk-bar i').style.width"); assert w == '68.8%', w
        # el mínimo se sigue cambiando
        await pg.fill('#mn_kno3', '500'); await pg.locator('#mn_kno3').dispatch_event('change'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("stockRow('kno3').k") == 'bad'
        await pg.evaluate("st.tab='almacen';renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.locator('[data-stk="kno3"] .stk-bar em').count() == 1
        await pg.locator('.stk').screenshot(path='pruebas/salida/t141-pc.png')
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 1280, ancho
        e1 = list(errs); await ctx.close()
        # móvil
        pg, errs, ctx = await abrir(b, 420, 900)
        assert not await pg.is_visible('.stk-hd')
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 420, ancho
        await pg.locator('[data-stk="kno3"]').screenshot(path='pruebas/salida/t141-movil.png')
        print('errs', e1 + errs); await b.close(); sys.exit(1 if e1 or errs else 0)
asyncio.run(main())

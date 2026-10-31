"""Mezclas: tabla de compatibilidad de fertilizantes (C, R, I) del tablón; aviso en la Receta y al Rellenar si un bidón lleva dos
productos que no van juntos; comprobar dos productos; cambiar el tipo de un producto en la tabla."""
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
        # la tabla tal cual está en el tablón
        t = await pg.evaluate("[mezDe('sk','nca'),mezDe('que','ani'),mezDe('smg','sk'),mezDe('nk','sam'),mezDe('map','smi'),mezDe('nam','urea'),mezDe('sam','urea'),mezDe('clk','nmg'),mezDe('que','afo'),mezDe('smi','smi')]")
        print(t); assert t == ['I', 'I', 'R', 'R', 'I', 'C', 'I', 'C', 'R', 'C']
        assert await pg.evaluate("mezBidon({productos:[{p:'ca',dosis:1},{p:'k2so4',dosis:1},{p:'kno3',dosis:2}]}).map(x=>x.r).join()") == 'I'
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='receta';renderAll()"); await pg.wait_for_timeout(600)
        # el potásico lleva sulfato potásico con sulfatos de zinc y manganeso: se reduce la solubilidad
        av = (await pg.text_content('[data-out="mez_pot_gas"]')).upper(); print(av); assert 'OJO AL MEZCLAR' in av and 'SULFATO POTÁSICO' in av and 'SULFATO DE ZINC' in av
        # tabla y comprobar dos
        await pg.click('[data-mezdet] summary'); await pg.wait_for_timeout(200)
        assert await pg.locator('table.mezt tbody tr').count() == 15 and await pg.locator('table.mezt td.bad').count() == 20
        await pg.select_option('[data-mezc="a"]', 'ca'); await pg.wait_for_timeout(200); await pg.select_option('[data-mezc="b"]', 'mkp'); await pg.wait_for_timeout(300)
        assert 'INCOMPATIBLES' in (await pg.text_content('[data-mezdet]')).upper()
        await pg.screenshot(path='pruebas/salida/t124-mezclas.png', full_page=True)
        # cambiar el tipo de un producto
        await pg.select_option('[data-mezt="trad"]', ''); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.cfg.mezTipo.trad===''&&mezTipo('trad')===''&&st.dirtyCfg")
        # al rellenar también avisa
        await pg.evaluate("st.tab='rellenar';st.fillB={gas:'pot_gas'};renderAll()"); await pg.wait_for_timeout(400)
        assert 'OJO AL MEZCLAR' in (await pg.text_content('#main')).upper()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

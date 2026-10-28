"""Ajustes por apartados: las tarjetas se agrupan en apartados cerrados; al tocar uno se abre, lo que se escribe sigue funcionando,
y la app recuerda cuáles tenías abiertos. Un trabajador ve solo sus apartados."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','pepe@demo.es':'pepe1234'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("""(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'pepe@demo.es'])];a.info={...a.info,'pepe@demo.es':{nombre:'Pepe'}};await NUBE.db.doc('acceso/usuarios').set(a);
          cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='ajustes';renderAll()})()"""); await pg.wait_for_timeout(1000)
        g = await pg.locator('#main .ajh b').all_inner_texts(); print('apartados:', g); assert len(g) == 6
        assert await pg.locator('#main .ajb:not([hidden])').count() == 0, 'empiezan cerrados'
        alto = await pg.evaluate("document.body.scrollHeight"); print('alto de la pantalla:', alto); assert alto < 2000
        assert await pg.locator('#al_llenado').is_hidden()
        await pg.click('[data-ajt="avisos"]'); await pg.wait_for_timeout(200)
        assert await pg.locator('#al_llenado').is_visible()
        await pg.fill('#al_llenado', '30'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.cfg.alertas.llenado") == 30 and await pg.locator('#al_llenado').is_visible(), 'se puede escribir y el apartado sigue abierto'
        await pg.evaluate("renderMain()"); await pg.wait_for_timeout(200); assert await pg.locator('#al_llenado').is_visible(), 'al repintar sigue abierto'
        await pg.click('[data-ajt="avisos"]'); await pg.wait_for_timeout(200); assert await pg.locator('#al_llenado').is_hidden()
        await pg.click('[data-ajt="usuarios"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='pruebas/salida/t99-ajustes.png', full_page=True)
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1200)
        await pg.reload(); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(600)
        assert await pg.locator('[data-ajt="usuarios"]').get_attribute('aria-expanded') == 'true' and await pg.locator('[data-ajt="avisos"]').get_attribute('aria-expanded') == 'false', 'recuerda los abiertos'
        # trabajador
        await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.fill('#nb_em', 'pepe@demo.es'); await pg.fill('#nb_pw', 'pepe1234'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(600)
        g2 = await pg.locator('#main .ajh b').all_inner_texts(); print('trabajador:', g2); assert 0 < len(g2) < 6
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

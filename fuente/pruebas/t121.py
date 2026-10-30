"""Botón de recargar arriba (flecha): recarga la app; con cambios sin guardar pregunta antes y, si se cancela, no recarga."""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(800)
        bt = pg.locator('#recargar'); assert await bt.is_visible(); bb = await bt.bounding_box(); print('botón:', bb); assert bb['y'] < 120 and bb['x'] + bb['width'] <= 430
        await pg.screenshot(path='pruebas/salida/t121-recargar.png', clip={'x': 0, 'y': 0, 'width': 430, 'height': 260})
        # con cambios sin guardar: pregunta; cancelar = no recarga
        await pg.evaluate("window._marca=1;st.dirtyReg=true;renderSave()")
        pg.once('dialog', lambda d: asyncio.ensure_future(d.dismiss())); await bt.click(); await pg.wait_for_timeout(800)
        assert await pg.evaluate("window._marca") == 1, 'no ha recargado'
        # sin cambios: recarga
        await pg.evaluate("st.dirtyReg=false;renderSave()")
        async with pg.expect_navigation(timeout=8000): await bt.click()
        await pg.wait_for_timeout(800); assert await pg.evaluate("window._marca===undefined"), 'ha recargado'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

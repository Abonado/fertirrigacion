"""Menú abajo: barra fija con Hoy, Riego, Almacén, Datos y Más; Hoy con avisos y accesos grandes; Más con Equipo, Notas, Taller y Ajustes;
estando en una pantalla de Más se marca Más y arriba salen sus pestañas; entrar a la app abre Hoy."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid', is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.ultArea={};entrarArea('riego')"); await pg.wait_for_timeout(800)
        assert await pg.evaluate("st.tab") == 'hoy', 'al entrar, Hoy'
        nav = await pg.locator('#grupos .grp span').all_inner_texts(); print(nav); assert [x.upper() for x in nav] == ['HOY', 'RIEGO', 'ALMACÉN', 'DATOS', 'MÁS']
        bb = await pg.locator('#grupos').bounding_box(); assert bb['y'] + bb['height'] >= 840, 'abajo del todo'
        assert await pg.locator('#tabs').is_hidden()
        t = (await pg.text_content('#main')).upper(); assert 'PARA MIRAR' in t and 'CUENTAS DEL DÍA' in t and 'INFORME DEL MES' in t
        # un aviso: cosas del almacén para pedir → lleva al Almacén (y la insignia sale en la barra)
        await pg.evaluate("window._ins=insignias;window.insignias=()=>({..._ins(),almacen:2});renderAll()"); await pg.wait_for_timeout(200)
        assert '2 COSAS DEL ALMACÉN' in (await pg.text_content('#main')).upper() and '2' in await pg.text_content('#grupos [data-grupo="almacen"]')
        await pg.screenshot(path='pruebas/salida/t122-hoy.png')
        await pg.click('.hoyai.warn'); await pg.wait_for_timeout(400); assert await pg.evaluate("st.tab") == 'almacen' and await pg.locator('#grupos [data-grupo="almacen"][aria-pressed="true"]').count() == 1
        await pg.evaluate("window.insignias=window._ins;renderAll()")
        # acceso grande
        await pg.click('#grupos [data-grupo="hoy"]'); await pg.wait_for_timeout(300); await pg.click('.hoyt[data-tab="informe"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.tab") == 'informe' and await pg.locator('#grupos [data-grupo="datos"][aria-pressed="true"]').count() == 1
        # Más
        await pg.click('#grupos [data-grupo="mas"]'); await pg.wait_for_timeout(300)
        t = (await pg.text_content('#main')).upper(); assert all(x in t for x in ['EQUIPO', 'NOTAS', 'TALLER', 'AJUSTES']) and await pg.locator('#cabs').is_hidden()
        await pg.screenshot(path='pruebas/salida/t122-mas.png')
        await pg.click('#main [data-tab="tareas"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.tab") == 'tareas' and await pg.locator('#grupos [data-grupo="mas"][aria-pressed="true"]').count() == 1
        tabs = [x.upper() for x in await pg.locator('#tabs .tab').all_inner_texts()]; print(tabs); assert 'TAREAS' in tabs and 'MENSAJES' in tabs
        # la barra de guardar queda por encima de la de abajo
        await pg.evaluate("st.dirtyReg=true;renderSave()"); sb = await pg.locator('#savebar').bounding_box(); assert sb['y'] + sb['height'] <= bb['y'] + 2, (sb, bb)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

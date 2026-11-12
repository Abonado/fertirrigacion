"""Navegación más clara: «Entrar» justo bajo la foto de la finca; al entrar en Riego se elige la zona (cabezal) en un submenú y dentro
se ve grande, y solo se cambia con «Cambiar zona»; en Hoy cada apartado (Riego…) con sus cuadros desplazables; «Fichar hoy» botón verde;
el atrás (de la app y del móvil) desde cualquier apartado lleva a Hoy, desde Hoy a las zonas."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort()); await ctx.route('https://archive-api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();abrirFincas()"); await pg.wait_for_timeout(400)
        # 1) el botón de entrar va justo debajo de la foto
        assert await pg.evaluate("(()=>{const c=document.querySelector('.fcard');const go=c.querySelector('.go'),ph=c.querySelector('.ph');return go.parentElement.firstElementChild===go&&go.getBoundingClientRect().top-ph.getBoundingClientRect().bottom<30})()"), 'entrar bajo la foto'
        await pg.click('[data-act="finca-go"][data-id="pinta"]'); await pg.wait_for_timeout(400)
        if await pg.evaluate("st.ov==='areas'"): await pg.click('[data-act="area-go"][data-a="riego"]'); await pg.wait_for_timeout(400)
        # 2) submenú de zonas
        assert await pg.evaluate("st.ov") == 'zonas' and await pg.locator('.zcard').count() == 4   # con los Metálicos
        t = (await pg.text_content('#fincas')).upper(); assert 'ELIGE LA ZONA' in t and 'PLANOS' in t and 'GASOLINERA' in t and 'FRANCO' in t
        await pg.click('[data-act="zona-go"][data-z="fra"]'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("[st.tab,st.cab,$('#fincas').hidden]") == ['hoy', 'fra', True]
        assert 'FRANCO' in (await pg.text_content('#cabs')).upper() and await pg.locator('#cabs [data-cab]').count() == 0, 'no hay botones para cambiar de zona sin querer'
        # 3) Hoy: «Riego» y debajo sus cuadros, desplazables, sin que la página se salga de ancho
        h = await pg.locator('.hoyfila h3').all_inner_texts(); print(h); assert h[0].upper() == 'RIEGO'
        assert await pg.evaluate("(()=>{const r=document.querySelector('.hoyfila[data-fila=riego] .hoyrow');return r.scrollWidth>r.clientWidth+50&&getComputedStyle(r).overflowX==='auto'})()"), 'se desplaza'
        assert await pg.evaluate("document.documentElement.scrollWidth") <= 390, 'la página no se sale de ancho'
        # 4) Fichar hoy: botón verde, letras blancas, encima de las filas
        fb = await pg.evaluate("(()=>{const e=document.querySelector('.hoyfich .btn'),c=getComputedStyle(e);return [c.backgroundColor,c.color]})()"); print('fichar', fb)
        assert fb == ['rgb(29, 107, 71)', 'rgb(255, 255, 255)']
        # cambiar de zona a propósito: vuelve al apartado en el que estabas
        await pg.click('.hoyfila[data-fila="riego"] .hoyt[data-tab="drenaje"]'); await pg.wait_for_timeout(400)
        await pg.click('#cabs [data-act="zonas"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.ov") == 'zonas' and await pg.locator('.zcard .zact').count() == 1
        await pg.click('[data-act="zona-go"][data-z="pla"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("[st.tab,st.cab]") == ['drenaje', 'pla']
        # 5) atrás desde un apartado → Hoy (botón de la app y atrás del móvil)
        await pg.click('header .fback'); await pg.wait_for_timeout(300); assert await pg.evaluate("st.tab") == 'hoy'
        await pg.click('.hoyt[data-tab="cuentas"]'); await pg.wait_for_timeout(300)
        await pg.go_back(); await pg.wait_for_timeout(400); assert await pg.evaluate("[st.tab,$('#fincas').hidden]") == ['hoy', True]
        await pg.evaluate("st.tab='informe';renderAll()"); await pg.wait_for_timeout(300)
        await pg.go_back(); await pg.wait_for_timeout(400); assert await pg.evaluate("st.tab") == 'hoy'
        # desde Hoy → zonas; desde zonas → menú / fincas
        await pg.go_back(); await pg.wait_for_timeout(400); assert await pg.evaluate("[st.ov,$('#fincas').hidden]") == ['zonas', False]
        await pg.go_back(); await pg.wait_for_timeout(400); assert await pg.evaluate("st.ov") in ('areas', 'fincas')
        await pg.screenshot(path='pruebas/salida/t129.png')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

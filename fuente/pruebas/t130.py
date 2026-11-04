"""iPhone: con el teclado abierto se esconden el menú de abajo y AGRO; al cerrarlo, si Safari deja la parte visible más grande que la que usa
para lo fijo (el fallo de «la barra se queda a media pantalla»), el menú, la barra de guardar y AGRO se bajan a su sitio."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
# visualViewport de mentira para simular el teclado del iPhone
VV = r"""(()=>{const t=new EventTarget();t.height=844;t.offsetTop=0;t.width=390;Object.defineProperty(window,'visualViewport',{configurable:true,get:()=>t});window._vv=t})()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await ctx.add_init_script(VV)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='drenaje';renderAll()"); await pg.wait_for_timeout(400)
        assert await pg.locator('#grupos').is_visible()
        # se abre el teclado: la parte visible baja 300 px
        await pg.focus('#main input[inputmode="decimal"]')
        await pg.evaluate("window._vv.height=544;window._vv.dispatchEvent(new Event('resize'))"); await pg.wait_for_timeout(450)
        assert await pg.evaluate("document.body.classList.contains('teclado')"), 'con teclado'
        assert await pg.locator('#grupos').is_hidden() and await pg.locator('#agbtn').is_hidden(), 'el menú y AGRO se esconden con el teclado'
        # se cierra el teclado pero Safari se queda con lo fijo 300 px más arriba (la parte visible es más grande que la que usa)
        await pg.evaluate("Object.defineProperty(window,'innerHeight',{configurable:true,get:()=>544});window._vv.height=844;document.activeElement.blur()"); await pg.wait_for_timeout(700)
        assert not await pg.evaluate("document.body.classList.contains('teclado')")
        fix = await pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--vvfix').trim()"); print('fix', fix); assert fix == '300px', fix
        tr = await pg.evaluate("getComputedStyle(document.getElementById('grupos')).translate"); print('translate', tr); assert '300px' in tr
        # cuando Safari se arregla solo, vuelve a 0
        await pg.evaluate("Object.defineProperty(window,'innerHeight',{configurable:true,get:()=>844});window._vv.dispatchEvent(new Event('resize'))"); await pg.wait_for_timeout(200)
        assert await pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--vvfix').trim()") == '0px'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

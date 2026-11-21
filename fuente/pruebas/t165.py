"""v232: el menú de abajo se mide y se recoloca solo. Si la marca fija de abajo no coincide con el borde inferior de la parte visible
(Safari lo deja a media pantalla sin avisar), el menú, la barra de guardar y AGRO se bajan; con zoom no se toca; cuando cuadra vuelve a 0."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
VV = r"""(()=>{const t=new EventTarget();t.height=844;t.offsetTop=0;t.width=390;t.scale=1;Object.defineProperty(window,'visualViewport',{configurable:true,get:()=>t});window._vv=t})()"""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='drenaje';renderAll()"); await pg.wait_for_timeout(1500)
        g = lambda: pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--vvfix').trim()")
        assert await g() in ('0px', ''), 'normal: sin desplazamiento'
        r0 = await pg.evaluate("document.getElementById('grupos').getBoundingClientRect().bottom"); assert abs(r0 - 844) < 2, r0
        # Safari deja lo fijo 200 px más arriba sin avisar (innerHeight no cambia): se mide con la marca y se corrige a los ~0,6 s
        await pg.evaluate("Object.defineProperty(window,'innerHeight',{configurable:true,get:()=>window._ih||844});window._ih=1044;window._vv.height=1044"); await pg.wait_for_timeout(1900)
        assert await g() == '200px', await g()
        tr = await pg.evaluate("getComputedStyle(document.getElementById('grupos')).translate"); assert '200px' in tr, tr
        assert await pg.evaluate("!!document.getElementById('fixsonda')")
        # con zoom (pellizco) no se toca
        await pg.evaluate("window._vv.scale=2"); await pg.wait_for_timeout(1500)
        assert await g() == '0px', await g()
        # vuelve a cuadrar: 0
        await pg.evaluate("window._vv.scale=1;window._ih=844;window._vv.height=844"); await pg.wait_for_timeout(1500)
        assert await g() == '0px', await g()
        # un salto momentáneo (menos de 250 ms) no mueve nada
        await pg.evaluate("window._ih=900;window._vv.height=900;window._vv.dispatchEvent(new Event('resize'));setTimeout(()=>{window._ih=844;window._vv.height=844},120)"); await pg.wait_for_timeout(1500)
        assert await g() == '0px', await g()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""v217: en la cabecera, el botón de la fecha («Hoy») no tapa la impresora: al tocar la impresora se imprime y no se abre el calendario."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='met';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.locator('#imprimir:not([hidden])').count() == 1
        # aunque el selector de fecha se haga muy ancho (como en el iPhone), no sale del botón «Hoy»
        await pg.evaluate("document.querySelector('#fecha').style.width='400px';document.querySelector('#fecha').style.minWidth='400px'")
        quien = await pg.evaluate("(()=>{const r=document.querySelector('#imprimir').getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e.closest('#imprimir')?'imprimir':e.id||e.tagName})()")
        assert quien == 'imprimir', quien
        assert await pg.evaluate("getComputedStyle(document.querySelector('#fechaL')).overflow") == 'hidden'
        # tocar la impresora imprime
        await pg.evaluate("window.__imp=0;window.print=()=>{window.__imp++};0")
        await pg.click('#imprimir'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("window.__imp") == 1
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

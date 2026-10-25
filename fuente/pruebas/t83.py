"""Los partes (grande, pequeño, PDF, recibidos y Datos totales) llevan la fecha del día del riego: el anterior al día en que se apunta."""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='pla'")
        assert await pg.evaluate("diaRiego('2026-03-01')") == '2026-02-28' and await pg.evaluate("diaRiego('2027-01-01')") == '2026-12-31'
        ayer = await pg.evaluate("fD(diaRiego(hoy()))"); print('fecha del parte:', ayer)
        g = await pg.evaluate("parteHoja('pla').L7.v"); pq = await pg.evaluate("parteHojaP('pla').N8.v"); print(g, '|', pq)
        assert g == 'FECHA: ' + ayer and pq == 'FECHA: ' + ayer
        assert ayer.replace('/', '-') in await pg.evaluate("parteNombre(parteData('pla'),'pequeno')")
        await pg.evaluate("st.tab='parte';renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.evaluate("fLarga(diaRiego(hoy()))") in await pg.evaluate("document.querySelector('#main').textContent")
        await pg.evaluate("st.tab='global';renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.evaluate("fLarga(diaRiego(hoy()))") in await pg.evaluate("document.querySelector('#main h3').textContent")
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

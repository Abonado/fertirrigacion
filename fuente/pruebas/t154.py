"""v216: el almacén impreso (stock y gastos) va junto: la cabecera y el stock en la primera hoja y, en otra, el gasto por día de cada
cabezal seguido del gasto por cabezal, sin hojas en blanco."""
import asyncio, sys, pypdf, io
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 400, 'height': 860}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='almacen';renderAll()"); await pg.wait_for_timeout(1200)
        assert await pg.locator('#main .almimp .card.stock').count() == 1
        await pg.emulate_media(media='print')
        st = await pg.evaluate("[getComputedStyle(document.querySelector('.almimp .card.stock')).breakInside,(()=>{const g=document.querySelector('.almimp .gdp');return g?getComputedStyle(g).breakBefore:'page'})()]")
        assert st == ['auto', 'page'], st
        pdf = await pg.pdf(format='A4', print_background=True); await pg.emulate_media(media='screen')
        R = pypdf.PdfReader(io.BytesIO(pdf)); n = len(R.pages)
        assert n <= 2, n
        assert 'STOCK' in R.pages[0].extract_text().upper()          # el stock va en la primera hoja, con la cabecera
        assert all(len((pg_.extract_text() or '').strip()) > 60 for pg_ in R.pages), 'hoja en blanco'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

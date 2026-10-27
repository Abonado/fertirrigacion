"""Parte grande: en la fila de abajo de cada sector (X-5) la media de sus bandejas (CE, pH, volumen total, drenaje y %),
en verde y negrita y con «MEDIA» delante, tanto en el Excel como en el PDF."""
import asyncio, sys, openpyxl
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 1100, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid', accept_downloads=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort()); await ctx.route('https://archive-api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # Gasolinera: sector 3 con dos bandejas, sector 4 solo con minutos (sin drenaje: no lleva media)
        await pg.evaluate("""cerrarSplash();st.finca='pinta';st.cab='gas';const c=cabById('gas'),r=st.reg,[s3,s4]=c.sectores;
          r.min[s3.id]=120;r.min[s4.id]=100;const[b1,b2]=s3.bandejas;r.dren[b1.id]=8000;r.dren[b2.id]=9000;r.ceD[b1.id]=4.2;r.ceD[b2.id]=4.5;r.phD[b1.id]=6.1;r.phD[b2.id]=6.4;
          st.tab='parte';renderAll()""")
        await pg.wait_for_timeout(600)
        V = await pg.evaluate("parteHoja('gas')"); r0, r4 = await pg.evaluate("ptFilas(cabById('gas')).map(x=>x.row)"); m, m4 = r0 + 4, r4 + 4
        fila = {k[0]: V[k]['v'] for k in [f'{c}{m}' for c in 'AEFGHI'] if k in V}; print(f'fila {m} (sector 3, fila 3-5):', fila)
        b1, b2 = await pg.evaluate("cabById('gas').sectores[0].bandejas.map(b=>b.caudal)")
        vol = (120 * b1 / 1000 + 120 * b2 / 1000) / 2; pc = (8000 * 100 / (120 * b1) + 9000 * 100 / (120 * b2)) / 2
        assert fila == {'A': 'MEDIA', 'E': '4350', 'F': 6.25, 'G': round(vol, 2), 'H': 8500, 'I': round(pc, 1)}, fila
        assert f'A{m4}' not in V and f'E{m4}' not in V, 'sin datos de drenaje no hay media'
        async with pg.expect_download() as dl: await pg.click('[data-act="parte-xlsx"][data-tipo="grande"]')
        ruta = 'pruebas/salida/t92-parte.xlsx'; await (await dl.value).save_as(ruta)
        ws = openpyxl.load_workbook(ruta).active
        for ref in [f'{c}{m}' for c in 'AEFGHI']:
            c = ws[ref]; print(ref, repr(c.value), c.font.b, c.font.color.rgb if c.font.color else None)
            assert c.font.b and c.font.color is not None and c.font.color.rgb == 'FF14783D', ref
        assert ws[f'A{m}'].value == 'MEDIA' and ws[f'H{m}'].value == 8500 and not (ws[f'E{r0}'].font.color and ws[f'E{r0}'].font.color.rgb == 'FF14783D'), 'solo la fila de la media va en verde'
        assert ws[f'E{r0}'].value == '4200' and ws[f'E{r0+1}'].value == '4500'
        async with pg.expect_download() as dl: await pg.click('[data-act="parte-pdf"][data-tipo="grande"]')
        pdf = 'pruebas/salida/t92-parte.pdf'; await (await dl.value).save_as(pdf); print('pdf:', pdf)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

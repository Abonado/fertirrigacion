"""Imprimir: en las pantallas que son documentos sale el botón de imprimir arriba (no en Hoy); al darle se imprime con una cabecera
(finca, apartado, fecha) y sin menús, barra de guardar, AGRO ni botones."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        for vw, vh in ((390, 844), (1366, 768)):
            ctx = await b.new_context(service_workers='block', viewport={'width': vw, 'height': vh}, locale='es-ES', timezone_id='Europe/Madrid')
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
            await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
            await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
            await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
            await pg.reload(); await pg.wait_for_timeout(600)
            await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
            await pg.evaluate("window._pr=[];window.print=()=>window._pr.push([document.title,document.getElementById('printhead').textContent]);0")
            await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='hoy';renderAll()"); await pg.wait_for_timeout(300)
            assert await pg.locator('#imprimir').is_hidden(), 'en Hoy no sale'
            await pg.evaluate("st.m3mes='2026-09';st.hist=[{fecha:'2026-09-02',m3:{pla:212,gas:244}}];st.tab='m3mes';renderAll()"); await pg.wait_for_timeout(300)
            assert await pg.locator('#imprimir').is_visible(), 'en M³ del mes sale'
            await pg.screenshot(path=f'pruebas/salida/t127-cab-{vw}.png', clip={'x': 0, 'y': 0, 'width': vw, 'height': 140})
            await pg.click('#imprimir'); await pg.wait_for_function("window._pr.length", timeout=10000)
            t, h = (await pg.evaluate("window._pr"))[0]; print(t, '|', h)
            assert t.startswith('M³ del mes - Pinta Santos') and 'AGRO FLY TECHNOLOGY' in h.upper() and 'IMPRESO EL' in h.upper()
            await pg.wait_for_timeout(4200); assert 'M³' not in await pg.title(), 'vuelve el título'
            # cómo queda en papel: sin cabecera de la app, menú, botones ni AGRO; con la cabecera de impresión
            await pg.evaluate("st.dirtyCfg=true;renderSave()"); await pg.emulate_media(media='print')
            vis = await pg.evaluate("['.top','#grupos','#savebar','#agbtn','#printhead','[data-m3=\"xlsx\"]'].map(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).display:'-'})"); print(vis)
            assert vis[:4] == ['none'] * 4 or vis[3] == '-', vis
            assert vis[4] == 'block' and vis[5] == 'none', vis
            if vw == 1366: await pg.pdf(path='pruebas/salida/t127.pdf', format='A4')
            await pg.emulate_media(media='screen'); await pg.evaluate("st.dirtyCfg=false;renderSave()")
            for tab in ('informe', 'cuaderno', 'historial', 'receta'):
                await pg.evaluate(f"st.tab='{tab}';renderAll()"); await pg.wait_for_timeout(200); assert await pg.locator('#imprimir').is_visible(), tab
            await ctx.close()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""v235: boletín de drenajes cada 30 min. Servidor (node: pruebas/datos/prueba-boletin-drenajes.mjs) y la tarjeta «Boletín de drenajes» de Ajustes
(apagado por defecto, se enciende, cambia el tramo y el horario, se guarda en cfg.boletin)."""
import asyncio, sys, subprocess, json
from playwright.async_api import async_playwright
r = subprocess.run(['node', 'pruebas/datos/prueba-boletin-drenajes.mjs', '../servidor/puente-worker.js'], capture_output=True, text=True, timeout=90)
print(r.stdout[-200:], r.stderr); assert 'BOLETIN DRENAJES OK' in r.stdout
r = subprocess.run(['node', 'pruebas/datos/prueba-resumen-diario.mjs', '../servidor/puente-worker.js'], capture_output=True, text=True, timeout=90)
assert 'RESUMEN DIARIO OK' in r.stdout, r.stdout[-300:] + r.stderr
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='ajustes';st.ajAb=new Set(['avisos']);renderAll()"); await pg.wait_for_timeout(300)
        # 1) la tarjeta está dentro de «Avisos y alertas», apagada y con 30 min / 8 / 19
        ok = lambda c, m: (_ for _ in ()).throw(AssertionError(m)) if not c else None
        ok(await pg.locator('h3:text-is("Boletín de drenajes")').count() == 1, 'tarjeta')
        ok(not await pg.is_checked('[data-k="cfg.bd.on"]'), 'apagado por defecto')
        ok(await pg.input_value('#bd_cada') == '30' and await pg.input_value('#bd_des') == '8' and await pg.input_value('#bd_has') == '19', 'valores por defecto')
        # 2) se enciende y se cambia: queda en cfg.boletin
        await pg.check('[data-k="cfg.bd.on"]'); await pg.select_option('#bd_cada', '15'); await pg.select_option('#bd_des', '7'); await pg.select_option('#bd_has', '21'); await pg.wait_for_timeout(300)
        B = await pg.evaluate('st.cfg.boletin'); ok(B == {'on': True, 'cada': 15, 'desde': 7, 'hasta': 21}, json.dumps(B))
        # 3) se vuelve a apagar y no toca el resumen diario
        await pg.uncheck('[data-k="cfg.bd.on"]'); await pg.wait_for_timeout(200)
        ok((await pg.evaluate('st.cfg.boletin')).get('on') is False and not await pg.evaluate('st.cfg.resumen&&st.cfg.resumen.on===false'), 'apagar')
        ok(not errs, str(errs)); print('T171 OK'); print('errs', errs)
        await b.close()
asyncio.run(main())

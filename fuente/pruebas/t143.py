"""Almacén: «Ajustar inventario» a mano. Cada abono del stock tiene su botón «Ajustar» (solo el gestor) que lleva al recuadro, justo
debajo del stock, con ese abono elegido; se pone lo contado (sacos o kilos) y el stock de la app pasa a ser eso, con su movimiento de ajuste."""
import asyncio, sys
from playwright.async_api import async_playwright
exec(open('pruebas/t141.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg, errs, ctx = await abrir(b, 390, 844)
        # el recuadro va justo después del stock
        orden = await pg.evaluate("[...document.querySelectorAll('#main section.card h3')].map(x=>x.textContent)"); print(orden)
        assert orden.index('Ajustar inventario') == orden.index('Stock') + 1, orden
        assert await pg.locator('.stt [data-stkaj]').count() == 3, 'un botón por abono del stock'
        # «Ajustar» en el sulfato potásico: lo elige y lleva al recuadro
        await pg.click('[data-stkaj="k2so4"]'); await pg.wait_for_timeout(600)
        assert await pg.input_value('#aj_p') == 'k2so4'
        assert await pg.evaluate("document.getElementById('almaj').getBoundingClientRect().top") < 400, 'el recuadro queda a la vista'
        assert await pg.evaluate("stockDe('k2so4',almAct())") == 60
        await pg.fill('#aj_real', '45'); await pg.locator('#aj_real').dispatch_event('input'); await pg.wait_for_timeout(200)
        assert 'diferencia -15' in (await pg.text_content('[data-out="ajn"]')), await pg.text_content('[data-out="ajn"]')
        await pg.click('[data-act="aj-save"]'); await pg.wait_for_timeout(800)
        assert await pg.evaluate("stockDe('k2so4',almAct())") == 45, 'el stock pasa a ser lo contado'
        mv = await pg.evaluate("st.alm.find(m=>m.tipo==='ajuste')"); print(mv)
        assert mv['p'] == 'k2so4' and mv['qty'] == -15
        assert '45,0 kg' in await pg.text_content('[data-stk="k2so4"] .stq')
        await pg.screenshot(path='pruebas/salida/t143.png', full_page=True)
        # sin ser gestor no hay botones ni recuadro
        await pg.evaluate("window.esGestor=()=>false;renderMain()"); await pg.wait_for_timeout(300)
        g = await pg.evaluate("typeof esGestor==='function'&&esGestor()")
        if not g: assert await pg.locator('[data-stkaj]').count() == 0 and await pg.locator('#almaj').count() == 0
        anc = await pg.evaluate("document.documentElement.scrollWidth"); assert anc <= 390, anc
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

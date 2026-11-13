"""Planos de riego de Pinta Santos (v209): en Mapa de la finca hay una pestaña «Planos de riego» (solo en Pinta Santos) con el mapa de la
finca; al tocar una zona se abre su plano, se acerca y aleja, y debajo va lo que hay en el plano, cómo se lee y lo que falta por confirmar."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='pla';st.tab='instal';renderAll()"); await pg.wait_for_timeout(400)
        # la pestaña está en el selector del mapa de la finca
        assert await pg.locator('.mfsel [data-tab="planriego"]').count() == 1
        await pg.click('.mfsel [data-tab="planriego"]'); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("st.tab") == 'planriego'
        # mapa de la finca con sus 7 zonas para tocar
        zs = await pg.evaluate("[...document.querySelectorAll('#prv [data-plano]')].map(e=>e.dataset.plano).sort()")
        assert zs == ['alto', 'encane', 'entrada', 'franco', 'gasolinera', 'metalicos', 'planos'], zs
        t = await pg.text_content('#main'); assert 'Toca una zona' in t and 'Falta por confirmar' in t
        # tocar Franco abre su plano (imagen que carga), su ficha y la leyenda
        await pg.dispatch_event('#prv [data-plano="franco"]', 'click'); await pg.wait_for_timeout(800)
        assert await pg.evaluate("st.pr") == 'franco'
        ok = await pg.evaluate("(()=>{const i=document.querySelector('#prv img.prsvg');return !!i&&i.complete&&i.naturalWidth>0})()"); assert ok
        t = await pg.text_content('#main'); assert '46.997 m²' in t and 'Goma del agua' in t and 'Cómo se lee el plano' in t and 'Cuentas de Franco' in t, t[:400]
        # zoom: + dos veces, ajustar
        await pg.click('[data-przoom="+"]'); await pg.click('[data-przoom="+"]'); await pg.wait_for_timeout(200)
        w = await pg.evaluate("[document.querySelector('#prv').clientWidth,document.querySelector('.prin').offsetWidth]"); assert w[1] > 2 * w[0] - 4, w
        await pg.click('[data-przoom="0"]'); await pg.wait_for_timeout(200)
        w = await pg.evaluate("[document.querySelector('#prv').clientWidth,document.querySelector('.prin').offsetWidth]"); assert abs(w[1] - w[0]) < 3, w
        # todos los planos cargan
        for z in ['metalicos', 'entrada', 'planos', 'alto', 'encane']:
            await pg.click(f'[data-prsel="{z}"]'); await pg.wait_for_timeout(700)
            ok = await pg.evaluate("(()=>{const i=document.querySelector('#prv img.prsvg');return !!i&&i.complete&&i.naturalWidth>0})()"); assert ok, z
        # la Gasolinera aún no tiene plano: lo dice y lleva a su plano de naves
        await pg.click('[data-prsel="gasolinera"]'); await pg.wait_for_timeout(300)
        assert 'todavía no está pasado' in await pg.text_content('#main')
        await pg.click('[data-prtab="mapa"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("[st.tab,st.cab]") == ['mapa', 'gas']
        # cuentas desde la ficha
        await pg.evaluate("st.tab='planriego';st.pr='metalicos';renderMain()"); await pg.wait_for_timeout(300)
        await pg.click('[data-prtab="cuentas"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("[st.tab,st.cab]") == ['cuentas', 'met']
        # imprimir el mapa de la finca va en horizontal
        await pg.evaluate("st.tab='planriego';st.pr='finca';renderMain();piePrepara()")
        assert 'landscape' in await pg.evaluate("document.getElementById('pieStyle').textContent")
        # fuera de Pinta Santos la pestaña no sale
        assert await pg.evaluate("st.finca='fuente';st.cab='mt2';tabPermitida('planriego')") is False
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

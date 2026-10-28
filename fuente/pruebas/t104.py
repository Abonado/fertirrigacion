"""Rendimiento de las collas → coste de mano de obra por nave: con los partes que ya se rellenan (gente, horas, trabajos con nave y
kilos) y el coste de la hora que pone el encargado, salen horas, coste, kg/h y €/kg por nave y en qué labores se van las horas."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 1100, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # 2 personas de 8:00 a 16:30 con 30 min de descanso (8 h cada una); recolectar en la nave 2 (1.200 kg) y destallar en la nave 3
        await pg.evaluate("""(()=>{st.collas=[{id:'c1',nombre:'Colla Pepe',finca:'pinta',miembros:[]}];st.jorDias=999;const g={a:{e:'pre',ent:'08:00',sal:'16:30'},b:{e:'pre',ent:'08:00',sal:'16:30'}};
          st.jor={j1:{id:'j1',colla:'c1',collaNombre:'Colla Pepe',fecha:hoy(),pau:30,gente:g,trabajos:[{labor:'recolectar',cab:'gas',nave:2,kg:1200},{labor:'destallar',cab:'gas',nave:3}]}};
          cerrarSplash();st.finca='pinta';st.co.per='7';st.tab='corend';renderAll()})()"""); await pg.wait_for_timeout(800)
        assert 'Coste de mano de obra por nave' in await pg.text_content('#main')
        assert 'Pon el coste de la hora' in await pg.text_content('#main')
        await pg.fill('#co_precio', '10'); await pg.locator('#co_precio').dispatch_event('change'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.cfg.coste.hora") == 10 and await pg.evaluate("st.dirtyCfg") is True
        filas = await pg.evaluate("[...document.querySelectorAll('#main table.rendt')].find(t=>t.textContent.includes('€/kg')).querySelectorAll('tbody tr').length")
        txt = await pg.evaluate("[...document.querySelectorAll('#main table.rendt')].find(t=>t.textContent.includes('€/kg')).innerText"); print(txt)
        assert filas == 3
        t = txt.lower()
        assert 'gasolinera · nave 2\t8,0\t80 €\t1200\t150,0\t0,07 €' in t, 'nave 2: 8 h, 80 €, 1.200 kg, 150 kg/h, 0,07 €/kg'
        assert 'gasolinera · nave 3\t8,0\t80 €' in t and 'total\t16,0\t160 €\t1200\t75,0\t0,13 €' in t
        await pg.screenshot(path='pruebas/salida/t104-coste.png', full_page=True)
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500); assert (await pg.evaluate("Store.getConfig().then(c=>c.coste)"))['hora'] == 10
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

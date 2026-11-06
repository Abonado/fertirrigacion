"""Ajuste del riego (v196): barra verde arriba con lo que está regando ahora (del lector del uCrop), gris si no riega o si el
lector lleva más de 20 min sin mandar. Y Almacén → Material ya no sale «undefined» (su filtro chocaba con el del mapa)."""
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
        # Material: el título sale bien al abrirlo (antes «undefined»), también después de pasar por el mapa
        for antes in ['hoy', 'mapa']:
            await pg.evaluate(f"cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='{antes}';renderAll()"); await pg.wait_for_timeout(500)
            await pg.evaluate("st.tab='material';renderAll()"); await pg.wait_for_timeout(800)
            t = await pg.text_content('#main'); assert 'undefined' not in t, (antes, t[:300])
        await pg.evaluate("st.tab='mapa';renderAll()"); await pg.wait_for_timeout(500)
        assert 'Incidencias abiertas' in await pg.text_content('#main')
        # Lector del uCrop: regando el sector 4, 5 min de 8
        await pg.evaluate("""(()=>{const t=Date.now()-60000,d=hoy();st.lec=[{id:'UCR-GAS_'+d,dev:'UCR-GAS',nodo:'UCR',cab:'gas',fecha:d,ts:new Date(t).toISOString(),
          p:[{t,v:{dren:[{n:1,act:0}],ext:{},estado:{prog:'SE04ENCAÑE',valv:'3',t:'00:05:00',tt:'00:08:00',act:12.4,regando:true}}}]}];st.tab='ajriego';renderAll()})()"""); await pg.wait_for_timeout(900)
        bar = pg.locator('#main .ajv'); assert await bar.count() == 1
        assert 'on' in (await bar.get_attribute('class'))
        t = await bar.text_content(); print(t)
        assert 'Regando ahora' in t and 'Sector 4 (ENCAÑE)' in t and 'Válvula 3' in t and '05:00 de 08:00' in t and '12,4 m³/h' in t, t
        w = await pg.evaluate("document.querySelector('.ajv-bar i').style.width"); assert w == '62.5%', w
        # la barra va lo primero de la pestaña
        assert await pg.evaluate("document.querySelector('#main').firstElementChild.classList.contains('ajv')")
        await bar.screenshot(path='pruebas/salida/t139-regando.png')
        # no riega
        await pg.evaluate("st.lec[0].p[0].v.estado={prog:'',regando:false,espera:'SE05'};renderMain()"); await pg.wait_for_timeout(300)
        t = await pg.text_content('#main .ajv'); assert 'Ahora no está regando' in t and 'SE05' in t, t
        # lector parado hace 45 min
        await pg.evaluate("st.lec[0].p[0].t=Date.now()-45*60000;st.lec[0].p[0].v.estado.regando=true;renderMain()"); await pg.wait_for_timeout(300)
        t = await pg.text_content('#main .ajv'); assert 'Sin datos de la máquina' in t and 'hace 45 min' in t, t
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 420, ancho
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

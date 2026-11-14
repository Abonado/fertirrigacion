"""v215: mejoras de la libreta. (1) Hoy no se repinta si no ha cambiado nada; (2) baños, pantanos y demás de la finca se ponen en
Instalación y salen en el Mapa de la finca; (3) un llenado repetido en poco tiempo pregunta antes de guardarse y dos toques seguidos
solo guardan uno; (4) el parte diario impreso sale en 3 hojas."""
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
        # 1) Hoy: si no cambia nada, no se repinta
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='hoy';renderAll()"); await pg.wait_for_timeout(400)
        await pg.evaluate("document.querySelector('#main').firstElementChild.__marca=1;renderMain();renderMain()")
        assert await pg.evaluate("document.querySelector('#main').firstElementChild.__marca") == 1
        await pg.evaluate("st.tab='riego';renderMain();st.tab='hoy';renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.evaluate("document.querySelector('#main').firstElementChild.__marca") is None   # al volver de otra pestaña, sí
        # 2) baño y pantano en Instalación › salen en el Mapa de la finca
        await pg.evaluate("st.tab='instal';st.in.vista='cab';st.in.modo='poner';renderAll()"); await pg.wait_for_timeout(400)
        assert await pg.locator('.chip[data-inact="tipo"][data-v="bano"]').count() == 1 and await pg.locator('.chip[data-inact="tipo"][data-v="pant"]').count() == 1
        await pg.evaluate("inEdit('gas',x=>{x.el.push({id:'b1',t:'bano',n:'Baño de la entrada',x:500,y:400,sid:'',nave:null,pas:null,min:null,max:null,nota:'',sk:'',bj:''});x.el.push({id:'p1',t:'pant',n:'Pantano',x:600,y:450,sid:'',nave:null,pas:null,min:null,max:null,nota:'',sk:'',bj:''})})")
        await pg.evaluate("st.tab='mapa';renderAll()"); await pg.wait_for_timeout(600)
        assert await pg.locator('#mapsvg .mfin').count() == 2
        t = await pg.text_content('#main'); assert 'Baño / aseo' in t and 'Pantano / balsa' in t
        # 3) llenado repetido
        await pg.evaluate("st.tab='rellenar';renderAll()"); await pg.wait_for_timeout(400)
        async def llenar():
            await pg.evaluate("lfOpen('llenado');st.lf.add=20;st.lf.final=30;st.lf.hora='10:15';st.lf.igual=true;renderMain()"); await pg.wait_for_timeout(200)
        n0 = await pg.evaluate("st.llen.length")
        await llenar(); await pg.evaluate("Promise.all([lfSave(),lfSave()])"); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.llen.length") == n0 + 1          # dos toques seguidos: uno
        await llenar(); await pg.click('[data-act="lf-save"]'); await pg.wait_for_timeout(500)
        assert await pg.locator('.banner.dup').count() == 1 and await pg.evaluate("st.llen.length") == n0 + 1
        assert 'contará doble' in await pg.text_content('.banner.dup')
        await pg.click('[data-act="lf-dup-si"]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.llen.length") == n0 + 2          # si es otro de verdad, se guarda
        # otro depósito o otras medidas: no pregunta
        await pg.evaluate("lfOpen('llenado');st.lf.add=25;st.lf.final=30;st.lf.hora='11:00';st.lf.igual=true"); await pg.evaluate("lfSave()"); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.llen.length") == n0 + 3
        # 4) parte impreso en 3 hojas
        await pg.evaluate("st.tab='parte';renderAll()"); await pg.wait_for_timeout(1200)
        await pg.emulate_media(media='print'); pdf = await pg.pdf(format='A4', print_background=True); await pg.emulate_media(media='screen')
        n = len(pypdf.PdfReader(io.BytesIO(pdf)).pages); assert n == 3, n
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

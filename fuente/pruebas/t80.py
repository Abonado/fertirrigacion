"""CE del drenaje en µS/cm: se escribe 4400 (o 4,4), se guarda 4,4 mS y se ve 4400 en drenaje, partes y Datos totales."""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='drenaje';renderAll()"); await pg.wait_for_timeout(600)
        ids = await pg.evaluate("cabById('gas').sectores[0].bandejas.map(b=>b.id)")
        await pg.fill(f'#ceD_{ids[0]}', '4400'); await pg.fill(f'#ceD_{ids[1]}', '4,6'); await pg.wait_for_timeout(300)
        v = await pg.evaluate(f"[st.reg.ceD['{ids[0]}'],st.reg.ceD['{ids[1]}']]"); print('guardado (mS):', v); assert v == [4.4, 4.6]
        await pg.evaluate("renderMain()"); await pg.wait_for_timeout(300)
        shown = await pg.input_value(f'#ceD_{ids[1]}'); print('se ve:', shown); assert shown in ('4600', '4.600')
        txt = await pg.evaluate("document.querySelector('#main').textContent"); assert '4500' in txt and 'µS' in txt, 'media del sector en µS'
        hoja = await pg.evaluate("Object.entries(parteHoja('gas')).filter(([k,v])=>/^E\\d+$/.test(k)).map(([k,v])=>v&&v.v!==undefined?v.v:v).filter(v=>v!=null).slice(0,2)")
        print('parte grande, columna CE:', hoja)
        await pg.evaluate("st.tab='global';renderAll()"); await pg.wait_for_timeout(500)
        assert '4500' in await pg.evaluate("document.querySelector('#main').textContent")
        # límite en Ajustes: 4000 µS = 4 mS
        await pg.evaluate("st.tab='ajustes';st.ajAb=new Set(AJ_GR.map(g=>g[0]));renderAll()"); await pg.wait_for_timeout(400)
        assert await pg.input_value('#al_ceMax') in ('4000', '4.000')
        await pg.fill('#al_ceMax', '5000'); await pg.wait_for_timeout(200); assert await pg.evaluate("st.cfg.alertas.ceMax") == 5
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

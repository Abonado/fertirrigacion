"""Mapa de la finca → Clima y estrés: se apunta aire, humedad y hojas por nave; la app calcula DPV, hoja − aire y punto de rocío,
pone el semáforo en la nave, dice la causa probable cruzando con el drenaje y la CE del día, se guarda en el día, calibra la «planta sana»
con medidas de plantas bien regadas y los umbrales se pueden cambiar."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # las fórmulas
        v = await pg.evaluate("[pvs(25),pvs(30),pvs(30)*(1-.7),esRocio(15,95)]"); print('PVS 25, PVS 30, DPV 30/70, rocío 15/95:', [round(x, 2) for x in v])
        assert [round(x, 2) for x in v] == [3.17, 4.24, 1.27, 14.21]
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(300)
        await pg.click('#tabs .tab:has-text("Mapa de la finca")'); await pg.wait_for_timeout(400)
        await pg.click('.mfsel [data-tab="estres"]'); await pg.wait_for_timeout(500)
        assert 'Clima y estrés · ' in await pg.text_content('#main h3') and await pg.locator('#essvg [data-esz]').count() == 6
        # drenaje y CE de hoy normales
        await pg.evaluate("const c=cabById('gas');c.sectores.forEach(s=>{st.reg.min[s.id]=120;s.bandejas.forEach(bj=>{st.reg.dren[bj.id]=9000;st.reg.ceD[bj.id]=3.1})})")
        # nave 1: todo bien
        await pg.locator('#essvg [data-esz="n1"]').dispatch_event('click'); await pg.wait_for_timeout(300)
        await pg.fill('#es_ta', '25'); await pg.fill('#es_hr', '75')
        for i, t in enumerate(['23,5', '23,8', '24']): await pg.fill(f'[data-es="h"][data-i="{i}"]', t)
        await pg.wait_for_timeout(400)
        r1 = await pg.evaluate("esCalc(st.reg.clima['gas:n1'],esU())"); print('nave 1:', round(r1['dpv'], 2), round(r1['dt'], 2), r1['niv'])
        assert round(r1['dpv'], 2) == 0.79 and r1['niv'] == 0 and 'Bien' in await pg.text_content('#main .essem')
        # nave 3: aire seco y hoja caliente con drenaje y CE normales → rojo, raíz o goteros, incidencia
        await pg.locator('#essvg [data-esz="n3"]').dispatch_event('click'); await pg.wait_for_timeout(300)
        await pg.fill('#es_ta', '30'); await pg.fill('#es_hr', '30'); await pg.fill('[data-es="h"][data-i="0"]', '32'); await pg.fill('[data-es="h"][data-i="1"]', '31,6'); await pg.wait_for_timeout(400)
        r3 = await pg.evaluate("esCalc(st.reg.clima['gas:n3'],esU())"); print('nave 3:', round(r3['dpv'], 2), round(r3['dt'], 2), r3['niv'], [m[1] for m in r3['mot']])
        assert round(r3['dpv'], 2) == 2.97 and round(r3['dt'], 1) == 1.8 and r3['niv'] == 2
        t = await pg.text_content('#main [data-out="esres"]'); assert 'raíz y los goteros' in t and 'µS/cm' in t
        assert await pg.locator('#essvg [data-esz="n3"] polygon').get_attribute('fill') == '#c0392b' and await pg.locator('#essvg [data-esz="n1"] polygon').get_attribute('fill') == '#2e8b57'
        assert '1' in (await pg.locator('.mfsel [data-tab="estres"]').inner_text()), 'el selector cuenta las naves en rojo'
        await pg.screenshot(path='pruebas/salida/t98-estres.png', full_page=True)
        # con poco drenaje la causa es falta de agua; con CE alta, salinidad
        await pg.evaluate("const c=cabById('gas');c.sectores.forEach(s=>s.bandejas.forEach(bj=>{st.reg.dren[bj.id]=800}));renderMain()"); await pg.wait_for_timeout(200)
        assert 'faltar agua' in await pg.text_content('#main [data-out="esres"]')
        await pg.evaluate("const c=cabById('gas');c.sectores.forEach(s=>s.bandejas.forEach(bj=>{st.reg.dren[bj.id]=9000;st.reg.ceD[bj.id]=9}));renderMain()"); await pg.wait_for_timeout(200)
        assert 'salinidad' in await pg.text_content('#main [data-out="esres"]')
        await pg.evaluate("const c=cabById('gas');c.sectores.forEach(s=>s.bandejas.forEach(bj=>{st.reg.ceD[bj.id]=3.1}));renderMain()"); await pg.wait_for_timeout(200)
        # incidencia en la nave
        await pg.click('[data-esact="incid"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("[st.tab,st.mNueva&&st.mNueva.nave]") == ['mapa', 3]
        await pg.evaluate("st.mNueva=null;st.tab='estres';renderAll()"); await pg.wait_for_timeout(300)
        # se guarda en el día
        await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1800)
        c = await pg.evaluate("Store.getReg(st.fecha).then(r=>r.clima)"); print('guardado:', c)
        assert c['gas:n1']['ta'] == 25 and c['gas:n3']['h'] == [32, 31.6] and c['gas:n3'].get('hora')
        # calibración: 6 medidas de planta sana → índice de estrés hídrico
        await pg.evaluate("st.cfg.estres={cal:[0.5,0.8,1.0,1.3,1.6,2.0].map((d,i)=>({id:'x'+i,dpv:d,dt:-0.5-1.5*d}))};renderMain()"); await pg.wait_for_timeout(300)
        cal = await pg.evaluate("esCal()"); print('calibración:', cal); assert cal['n'] == 6 and round(cal['a'], 2) == -0.5 and round(cal['b'], 2) == -1.5
        w = await pg.evaluate("esCalc(st.reg.clima['gas:n3'],esU()).cwsi"); print('índice de estrés nave 3:', w); assert w is not None and round(w, 2) == 0.75  # (1,8 + 4,955) / (4 + 4,955)
        await pg.click('[data-esact="cal"]'); await pg.wait_for_timeout(300); assert await pg.evaluate("st.cfg.estres.cal.length") == 7
        # umbrales editables
        await pg.click('[data-esact="aj"]'); await pg.wait_for_timeout(300)
        await pg.fill('#esu_dpvMax', '3,5'); await pg.fill('#esu_dpvHi', '3'); await pg.fill('#esu_dtRojo', '2'); await pg.wait_for_timeout(300)
        r3b = await pg.evaluate("esCalc(st.reg.clima['gas:n3'],esU()).niv"); print('nave 3 con umbrales cambiados:', r3b); assert r3b == 1
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500)
        g = await pg.evaluate("Store.getConfig().then(c=>c.estres)"); assert g['dpvMax'] == 3.5 and len(g['cal']) == 7
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

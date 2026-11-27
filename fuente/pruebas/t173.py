"""v237: m³ de Franco por contadores (sectores 1 y 2 · sectores 3 y 4). El total del cabezal es la suma; cada contador se reparte solo
entre sus sectores; se cambia en Fincas y cabezales. En Datos → M³ del mes salen las columnas de cada contador y se eligen los cabezales del Excel."""
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
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(4000)
        # 1) Franco pasa solo (una vez) a dos contadores y queda guardado
        assert await pg.evaluate("cabById('fra').m3g") == 2
        g = await pg.evaluate("Store.getConfig().then(c=>({m:c.cabezales.find(x=>x.id==='fra').m3g,mig:c.mig.m3Franco}))"); assert g == {'m': 2, 'mig': 1}, g
        assert await pg.evaluate("cabById('gas').m3g") is None
        # 2) Cuentas de Franco: dos campos y el total es la suma
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='fra';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(300)
        assert await pg.locator('#m3_fra').count() == 0
        l = await pg.text_content('.m3gr'); assert 'm³ Sectores 1 y 2' in l and 'm³ Sectores 3 y 4' in l and 'Total del cabezal' in l, l
        await pg.fill('#m3g_fra_0', '70'); await pg.locator('#m3g_fra_0').dispatch_event('input'); await pg.wait_for_timeout(200)
        assert await pg.evaluate("st.reg.m3.fra") is None, 'con un solo contador no hay total'
        await pg.fill('#m3g_fra_1', '40,5'); await pg.locator('#m3g_fra_1').dispatch_event('input'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.reg.m3.fra") == 110.5
        assert '110,5 m³' in await pg.text_content('[data-out="m3t"]')
        mods = await pg.evaluate("[...st.regMod]"); assert 'm3.fra' in mods and 'm3g.fra_0' in mods and 'm3g.fra_1' in mods, mods
        # 3) reparto por sectores: cada contador entre sus sectores (por minutos y caudal)
        r = await pg.evaluate("""(()=>{const c=cabById('fra');c.sectores.forEach((s,i)=>st.reg.min[s.id]=[30,10,20,20][i]);st.cfg.sectInfo={};const m=m3Sectores('fra').m;return c.sectores.map(s=>+m[s.id].toFixed(3))})()""")
        assert abs(r[0] + r[1] - 70) < 1e-6 and abs(r[2] + r[3] - 40.5) < 1e-6 and abs(r[0] - 52.5) < 1e-6 and abs(r[2] - 20.25) < 1e-6, r
        # 4) se guarda el día y vuelve igual
        await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1500)
        d = await pg.evaluate("Store.getReg(st.fecha).then(r=>({m:r.m3.fra,g:r.m3g}))"); assert d['m'] == 110.5 and d['g'] == {'fra_0': 70, 'fra_1': 40.5}, d
        # 5) Datos → M³ del mes: columnas de los contadores, elegir cabezales y el Excel
        await pg.evaluate("""st.hist=[normReg({m3:{fra:110,gas:50,pla:30},m3g:{fra_0:70,fra_1:40}},'2026-11-11'),normReg({m3:{fra:100,gas:45,pla:25},m3g:{fra_0:60,fra_1:40}},'2026-11-12')];
          st.reg=normReg({},'2026-11-28');st.fecha='2026-11-28';st.m3mes='2026-11';st.tab='m3mes';renderAll()"""); await pg.wait_for_timeout(400)
        t = await pg.text_content('table.m3t thead'); assert 'Franco · Sectores 1 y 2' in t and 'Franco · Sectores 3 y 4' in t, t
        tot = await pg.text_content('table.m3t tr.tot'); assert '130 m³' in tot and '80 m³' in tot and '210 m³' in tot, tot
        await pg.evaluate("window.__sh=null;window.xlsxBlob=sh=>{window.__sh=sh;return new Blob(['x'])};window.saveBlob=(bl,n)=>{window.__n=n}")
        for c in ['gas', 'pla', 'met']:
            if await pg.locator(f'[data-m3s="{c}"]').count(): await pg.uncheck(f'[data-m3s="{c}"]')
        await pg.wait_for_timeout(300)
        t = await pg.text_content('table.m3t thead'); assert 'Gasolinera' not in t and 'Planos' not in t and 'Franco' in t, t
        await pg.click('[data-m3="xlsx"]'); await pg.wait_for_timeout(300)
        sh = await pg.evaluate("window.__sh"); n = await pg.evaluate("window.__n"); hd = sh[0]['rows'][2]
        assert 'Franco · Sectores 1 y 2 (día)' in hd and 'Franco (día)' in hd and not any('Gasolinera' in x for x in hd), hd
        assert n == 'm3-franco-2026-11.xlsx', n
        fila = sh[0]['rows'][3 + 9]; assert fila[1] == 70 and fila[3] == 40 and fila[5] == 110, fila
        for c in ['fra', 'gas', 'pla', 'met']:
            if await pg.locator(f'[data-m3s="{c}"]').count(): await pg.uncheck(f'[data-m3s="{c}"]')
        await pg.wait_for_timeout(300); assert 'Marca al menos un cabezal' in await pg.text_content('#main')
        # 6) en Fincas y cabezales se vuelve a un contador
        await pg.evaluate("st.tab='estructura';st.edAb=new Set(['fra']);renderAll()"); await pg.wait_for_timeout(300)
        sel = '[data-edv="cab.m3g"][data-id="fra"]'
        if not await pg.locator(sel).count():
            await pg.locator('.edf summary, [data-ed="toggle"][data-id="fra"]').first.click(); await pg.wait_for_timeout(300)
        o = await pg.text_content(sel); assert 'Dos: Sectores 1 y 2 · Sectores 3 y 4' in o, o
        await pg.select_option(sel, '1'); await pg.wait_for_timeout(200); assert await pg.evaluate("cabById('fra').m3g") is None
        await pg.evaluate("st.tab='cuentas';st.cab='fra';renderAll()"); await pg.wait_for_timeout(300); assert await pg.locator('#m3_fra').count() == 1
        # ninguna pantalla falla
        await pg.evaluate("cabById('fra').m3g=2")
        for t in await pg.evaluate("TABS.map(t=>t[0])"):
            await pg.evaluate(f"st.tab='{t}';try{{renderAll()}}catch(e){{window.__e=(window.__e||[]).concat('{t}: '+e.message)}}"); await pg.wait_for_timeout(80)
        fallos = await pg.evaluate("window.__e||[]"); assert not fallos, fallos
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

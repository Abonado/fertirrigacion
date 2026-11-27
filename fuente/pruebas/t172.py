"""v236: cuentas por árbol (LA TORRE). Un cabezal nuevo se pone en «Suelo: % del técnico, por árbol» con 3216 árboles;
depósito de 30,3 L/cm con nitrato al 20 % (× 200): 10 cm → 303 L × 200 g/L ÷ 3216 = 18,8 g por árbol. Los Metálicos siguen por hectárea."""
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
        # 1) en el editor: cabezal nuevo LA TORRE en Pinta Santos
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='estructura';renderAll()"); await pg.wait_for_timeout(300)
        await pg.fill('[data-ednc="pinta"]', 'LA TORRE'); await pg.click('[data-ed="add-cab"][data-id="pinta"]'); await pg.wait_for_timeout(300)
        cid = await pg.evaluate("st.cfg.cabezales.find(c=>c.nombre==='LA TORRE').id")
        sel = f'[data-edv="cab.tipo"][data-id="{cid}"]'
        assert await pg.input_value(sel) == 'receta', 'un cabezal nuevo va por receta'
        await pg.select_option(sel, 'arbol'); await pg.wait_for_timeout(300)
        c = await pg.evaluate(f"cabById('{cid}')"); assert c['suelo'] is True and c['arboles'] == 1000, c
        ar = f'[data-edv="cab.arboles"][data-id="{cid}"]'
        await pg.fill(ar, '3216'); await pg.locator(ar).dispatch_event('input'); await pg.wait_for_timeout(200)
        assert await pg.evaluate(f"cabById('{cid}').arboles") == 3216
        # depósito de 30,3 L/cm con nitrato potásico
        await pg.click(f'[data-ed="add-dep"][data-id="{cid}"]'); await pg.wait_for_timeout(200)
        await pg.fill('#ed_dn', 'Depósito abono'); await pg.select_option('#ed_dp', 'kno3'); await pg.fill('#ed_dl', '30,3')
        await pg.click(f'[data-ed="add-dep-ok"][data-id="{cid}"]'); await pg.wait_for_timeout(300)
        did = await pg.evaluate(f"bidonesDe('{cid}')[0].id")
        # 2) en Receta: el % del técnico (20 %) y los árboles
        await pg.evaluate(f"st.cab='{cid}';st.tab='receta';renderMain()"); await pg.wait_for_timeout(300)
        r = await pg.text_content('.rsuelo'); assert 'por árbol' in r and 'Árboles' in r and 'Hectáreas' not in r, r
        assert await pg.input_value(f'#arb_{cid}') == '3216'
        await pg.fill(f'#pct_{did}_kno3', '20'); await pg.locator(f'#pct_{did}_kno3').dispatch_event('change'); await pg.wait_for_timeout(250)
        r = await pg.text_content('.rsuelo'); assert '÷ 3216 árboles = gramos por árbol' in r and '× 200' in r, r
        # 3) en Cuentas: 10 cm gastados → 303 L, 60,6 kg, 18,8 g por árbol; 9 m³ → 2,8 L por árbol
        await pg.evaluate(f"st.tab='cuentas';renderMain()"); await pg.wait_for_timeout(300)
        await pg.fill(f'#m3_{cid}', '9'); await pg.locator(f'#m3_{cid}').dispatch_event('input'); await pg.wait_for_timeout(200)
        await pg.evaluate(f"st.reg.cm['{did}']=10;renderMain()"); await pg.wait_for_timeout(300)
        t = await pg.text_content(f'[data-out="t_{did}"]'); print(t)
        assert '60,6 kg' in t and '18,8 g/árbol' in t and '÷ 3216 árboles' in t and '10 cm × 30,3 L/cm = 303 L' in t, t
        s = await pg.text_content('[data-out="sum"]'); print(s)
        assert 'Agua por árbol' in s and '2,8 L/árbol' in s and '18,8 g/árbol' in s, s
        # 4) se guarda; y cambiar los árboles cambia la cuenta
        await pg.evaluate(f"st.tab='receta';renderMain()"); await pg.wait_for_timeout(200)
        await pg.fill(f'#arb_{cid}', '3000'); await pg.locator(f'#arb_{cid}').dispatch_event('change'); await pg.wait_for_timeout(250)
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500)
        g = await pg.evaluate(f"Store.getConfig().then(c=>({{c:c.cabezales.find(x=>x.id==='{cid}'),k:c.bidones.find(x=>x.id==='{did}').kgPrincipal}}))")
        assert g['c']['suelo'] and g['c']['arboles'] == 3000 and g['k'] == 200 and g['c']['nombre'] == 'LA TORRE', g
        await pg.evaluate(f"st.tab='cuentas';renderMain()"); await pg.wait_for_timeout(300)
        t = await pg.text_content(f'[data-out="t_{did}"]'); assert '20,2 g/árbol' in t, t
        # 5) volver a «receta» quita el suelo; los Metálicos siguen por hectárea
        await pg.evaluate("st.tab='estructura';renderAll()"); await pg.wait_for_timeout(300)
        if not await pg.locator(sel).count(): await pg.click(f'[data-ed="toggle"][data-id="{cid}"]'); await pg.wait_for_timeout(200)
        await pg.select_option(sel, 'receta'); await pg.wait_for_timeout(200)
        c = await pg.evaluate(f"cabById('{cid}')"); assert not c.get('suelo') and 'arboles' not in c, c
        await pg.evaluate("st.cab='met';st.tab='cuentas';st.reg.cm.pot_met=10;renderMain()"); await pg.wait_for_timeout(300)
        k = await pg.text_content('[data-out="t_pot_met"]'); assert 'kg/ha' in k and 'árbol' not in k, k
        # ninguna pantalla falla con un cabezal por árbol
        await pg.evaluate(f"const c=cabById('{cid}');c.suelo=true;c.arboles=3216;st.cab='{cid}'")
        for t in await pg.evaluate("TABS.map(t=>t[0])"):
            await pg.evaluate(f"st.tab='{t}';try{{renderAll()}}catch(e){{window.__e=(window.__e||[]).concat('{t}: '+e.message)}}"); await pg.wait_for_timeout(100)
        fallos = await pg.evaluate("window.__e||[]"); assert not fallos, fallos
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

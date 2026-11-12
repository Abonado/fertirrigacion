"""Metálicos (v208): cabezal de cultivo en suelo en Pinta Santos, con almacén común con Franco. Las cuentas van por el % que dice
el técnico y por hectárea: potásico cm × 31 × 120 (12 %) y ácido cm × 20 × 100 (10 %, fosfórico en L y sulfato monoamónico en kg),
÷ 6,7 ha. Al hacer el depósito, el ácido se pone en cm y el resto es agua, como los demás líquidos."""
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
        # el alta se hace sola (una vez) y queda guardada
        c = await pg.evaluate("Store.getConfig().then(c=>({cab:c.cabezales.find(x=>x.id==='met'),fin:c.fincas.find(x=>x.id==='pinta').cabezales,alm:c.almacenes.find(x=>x.cabezales.includes('met')),bid:c.bidones.filter(x=>x.cabezales.includes('met')).map(x=>[x.id,x.lpcm,x.kgPrincipal,x.productos.map(y=>y.p)]),mig:c.mig}))"); print(c)
        assert c['cab']['nombre'] == 'Metálicos' and c['cab']['suelo'] and c['cab']['ha'] == 6.7 and 'met' in c['fin']
        assert c['alm']['id'] == 'fra' and c['alm']['cabezales'] == ['fra', 'met'] and c['alm']['nombre'] == 'Franco y Metálicos'
        assert c['bid'] == [['pot_met', 31, 120, ['kno3']], ['aci_met', 20, 100, ['h3po4', 'sma']]], c['bid']
        assert await pg.evaluate("pn('sma')") == 'Sulfato monoamónico'
        # cuentas: 67 m³, 10 cm de cada depósito
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='met';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(500)
        await pg.fill('#m3_met', '67'); await pg.locator('#m3_met').dispatch_event('input'); await pg.wait_for_timeout(200)
        await pg.evaluate("st.reg.cm.pot_met=10;st.reg.cm.aci_met=10;renderMain()"); await pg.wait_for_timeout(300)
        kg = await pg.evaluate("kgDia('met')"); print(kg)
        assert abs(kg['kno3'] - 37.2) < 1e-9 and abs(kg['h3po4'] - 20) < 1e-9 and abs(kg['sma'] - 20) < 1e-9
        k = await pg.text_content('[data-out="t_pot_met"] tr[data-sp="kno3"]'); print(k)
        assert '12 %' in k and '37,2 kg' in k and '5,55 kg/ha' in k
        a = await pg.text_content('[data-out="t_aci_met"]'); assert '20,0 L' in a and '2,99 L/ha' in a and '20,0 kg' in a and '2,99 kg/ha' in a and '10 cm × 20 L/cm = 200 L' in a, a
        sm = await pg.text_content('[data-out="sum"]'); print(sm); assert '10,0 m³/ha' in sm and '5,55 kg/ha' in sm
        # el técnico cambia: potásico al 10 %, ácido al 12 % (el monoamónico sigue al 10 %), y monoamónico al 8 %
        await pg.evaluate("st.tab='receta';renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.input_value('#pct_pot_met_kno3') == '12' and await pg.input_value('#ha_met') == '6,7'
        for sel, v in [('#pct_pot_met_kno3', '10'), ('#pct_aci_met_h3po4', '12'), ('#pct_aci_met_sma', '8')]:
            await pg.fill(sel, v); await pg.locator(sel).dispatch_event('change'); await pg.wait_for_timeout(250)
        kg = await pg.evaluate("kgDia('met')"); print(kg)
        assert abs(kg['kno3'] - 31) < 1e-9 and abs(kg['h3po4'] - 24) < 1e-9 and abs(kg['sma'] - 16) < 1e-9, kg
        await pg.fill('#ha_met', '5'); await pg.locator('#ha_met').dispatch_event('change'); await pg.wait_for_timeout(200)
        assert await pg.evaluate("st.dirtyCfg") is True
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500)
        g = await pg.evaluate("Store.getConfig().then(c=>({ha:c.cabezales.find(x=>x.id==='met').ha,kp:c.bidones.find(x=>x.id==='pot_met').kgPrincipal}))"); assert g == {'ha': 5, 'kp': 100}, g
        # hacer el depósito del ácido (10 cm = 200 L): ácido en L y en cm, monoamónico en kg y el resto agua
        await pg.evaluate("st.tab='rellenar';st.fillB.met='aci_met';st.fill.aci_met=10;renderMain()"); await pg.wait_for_timeout(300)
        f = await pg.text_content('[data-out="fill"]'); print(f)
        assert '200 L' in f and '24,0 L' in f and '1,2 cm' in f and '16,0 kg' in f and '8,8 cm' in f, f
        # el almacén de Franco y Metálicos cuenta lo gastado por los Metálicos
        assert await pg.evaluate("almDeCab('met')") == 'fra'
        # ninguna pantalla falla con el cabezal en suelo
        tabs = await pg.evaluate("TABS.map(t=>t[0])")
        for t in tabs:
            await pg.evaluate(f"st.tab='{t}';try{{renderAll()}}catch(e){{window.__e=(window.__e||[]).concat('{t}: '+e.message)}}"); await pg.wait_for_timeout(120)
        fallos = await pg.evaluate("window.__e||[]"); assert not fallos, fallos
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

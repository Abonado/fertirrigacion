"""CM de bidones: la hoja diaria con los cm gastados de cada bidón del cabezal (los mismos de Cuentas del día) y la pérdida aparte con su
motivo; lo perdido no cuenta como abono aplicado (litros, dosis y kg), pero el día se guarda con la pérdida; hoja de los últimos días."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid', is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='cmbid';renderAll()"); await pg.wait_for_timeout(800)
        info = await pg.evaluate("(()=>{const bs=bidonesDe('gas'),b=bs.find(x=>x.cabezales.length===1)||bs[0];return {n:bs.length,id:b.id,lpcm:b.lpcm,nom:b.nombre,solo:b.cabezales.length===1}})()"); print(info)
        assert await pg.locator('.cmbr').count() == info['n'] and 'CM DE BIDONES · GASOLINERA' in (await pg.text_content('#main')).upper()
        assert 'CM DE BIDONES' in (await pg.text_content('#tabs')).upper()
        i = info['id']
        await pg.fill(f'#cb_{i}', '20'); await pg.fill(f'#cp_{i}', '2'); await pg.select_option(f'#cpm_{i}', 'Fuga'); await pg.wait_for_timeout(300)
        r = (await pg.text_content(f'[data-out="cmb_{i}"]')).upper(); print(r); assert 'GASTADO 20,0 CM' in r and 'PERDIDO 2,0 CM' in r and 'FUGA' in r and 'AL CULTIVO 18,0 CM' in r
        if info['solo']:
            L = await pg.evaluate(f"litros(bid('{i}'),'gas')"); assert abs(L - 18 * info['lpcm']) < 0.01, L
        assert await pg.evaluate("st.dirtyReg") and await pg.evaluate(f"st.regMod.has('perd.{i}')&&st.regMod.has('perdM.{i}')")
        await pg.screenshot(path='pruebas/salida/t123-cm.png', full_page=True)
        # se ve en Cuentas del día
        await pg.evaluate("st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(400); assert 'PÉRDIDA APUNTADA: 2,0 CM' in (await pg.text_content('#main')).upper()
        # guardar
        await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1500)
        g = await pg.evaluate("Store.getReg(st.fecha)"); assert g['perd'][i] == 2 and g['perdM'][i] == 'Fuga' and g['cm'][i] == 20, g.get('perd')
        # hoja de días anteriores
        await pg.evaluate(f"""(()=>{{const d=n=>{{const x=new Date(st.fecha+'T12:00:00');x.setDate(x.getDate()-n);return isoD(x)}};st.hist=[{{fecha:d(1),cm:{{'{i}':15}},perd:{{}}}},{{fecha:d(2),cm:{{'{i}':10}},perd:{{'{i}':1}}}},...(st.hist||[]).filter(r=>r.fecha===st.fecha)];st.tab='cmbid';renderAll()}})()""")
        await pg.wait_for_timeout(400)
        rows = await pg.locator('table.cmbt tbody tr').all_inner_texts(); print(rows); assert len(rows) == 4 and rows[-1].upper().startswith('TOTAL')
        assert '−1,0' in rows[2] and (str(round((20+15+10)*info['lpcm'])) in rows[-1].replace('.', ''))
        # tocar un día lo abre aquí mismo
        await pg.click('[data-cmbd]:not(:has(b))'); await pg.wait_for_timeout(800); assert await pg.evaluate("st.tab") == 'cmbid' and await pg.evaluate("st.fecha") != await pg.evaluate("hoy()")
        # lectura de la regla: hoy − la anterior; y con el bidón hecho a una hora
        await pg.evaluate(f"""(async()=>{{await loadFecha(hoy());const d=new Date(hoy()+'T12:00:00');d.setDate(d.getDate()-1);st.hist=[{{fecha:isoD(d),cm:{{}},vac:{{'{i}':87}}}}];st.reg.vac={{}};st.reg.hT={{}};st.reg.hA={{}};st.reg.hD={{}};st.tab='cmbid';renderAll()}})()""")
        await pg.wait_for_timeout(800)
        assert '87,0 CM' in (await pg.text_content('.cmbr')).upper()
        await pg.fill(f'#cv_{i}', '125'); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"st.reg.cm['{i}']") == 38 and await pg.input_value(f'#cb_{i}') == '38'
        c = (await pg.text_content(f'[data-out="cmbc_{i}"]')).upper(); print(c); assert '125,0 − 87,0 = 38,0 CM GASTADOS' in c
        await pg.select_option(f'#ch_{i}', 'hora'); await pg.wait_for_timeout(300)
        await pg.fill(f'#chh_{i}', '09:30'); await pg.fill(f'#cha_{i}', '130'); await pg.fill(f'#cv_{i}', '40'); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"st.reg.cm['{i}']") == 83
        c = (await pg.text_content(f'[data-out="cmbc_{i}"]')).upper(); print(c); assert 'HOY A LAS 09:30' in c and '(130,0 − 87,0) + (40,0 − 0,0) = 43,0 + 40,0 = 83,0 CM GASTADOS' in c
        await pg.screenshot(path='pruebas/salida/t123-lectura.png', full_page=True)
        await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1500)
        g = await pg.evaluate("Store.getReg(st.fecha)"); assert g['vac'][i] == 40 and g['hA'][i] == 130 and g['hT'][i] == 'hora' and g['cm'][i] == 83
        # todos los bidones pasan a «se llena cuando hace falta» (una sola vez)
        await pg.evaluate("(async()=>{for(const c of [st.cfg,st.savedCfg]){for(const b of c.bidones)b.modo='diario';c.mig={...(c.mig||{}),modoManual:0}}await migModoManual()})()"); await pg.wait_for_timeout(800)
        assert await pg.evaluate("st.cfg.bidones.every(b=>modoDep(b)==='manual')&&st.savedCfg.mig.modoManual===1")
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

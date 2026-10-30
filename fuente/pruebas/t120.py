"""Informe del mes: balance de cada almacén (stock al empezar + entradas − salidas ± ajustes = stock final o de hoy) con lo gastado según
las cuentas de sus cabezales al lado y aviso si no cuadra; el abono gastado por cabezal; y lo mismo en el Excel."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid', accept_downloads=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        info = await pg.evaluate("""(()=>{cerrarSplash();st.finca='pinta';st.cab='gas';const P=Object.keys(st.cfg.productos),A=almacenes(),a0=A[0],c0=a0.cabezales[0],mes=hoy().slice(0,7),ant=(()=>{const d=new Date(mes+'-15');d.setMonth(d.getMonth()-1);return isoD(d).slice(0,7)})();
          st.mes=mes;const p=P[0],q=P[1];
          st.alm=[{id:'m1',ts:'1',fecha:ant+'-10',tipo:'entrada',alm:a0.id,p,qty:500},{id:'m2',ts:'2',fecha:ant+'-20',tipo:'salida',alm:a0.id,p,qty:-100},
            {id:'m3',ts:'3',fecha:mes+'-02',tipo:'entrada',alm:a0.id,p,qty:250},{id:'m4',ts:'4',fecha:mes+'-03',tipo:'salida',alm:a0.id,p,qty:-120},{id:'m5',ts:'5',fecha:mes+'-04',tipo:'ajuste',alm:a0.id,p,qty:-10},
            {id:'m6',ts:'6',fecha:mes+'-05',tipo:'entrada',alm:a0.id,p:q,qty:40}];
          const kg={};kg[p]=60;kg[q]=5;window._h=[{fecha:mes+'-02',m3:{[c0]:100},resumen:{[c0]:{kg}}},{fecha:mes+'-03',m3:{[c0]:110},resumen:{[c0]:{kg}}},{fecha:ant+'-28',m3:{[c0]:90},resumen:{[c0]:{kg}}}];window._a=st.alm;st.hist=window._h;
          st.tab='informe';renderAll();return {p:prod(p).n,q:prod(q).n,alm:a0.nombre,cab:cabNombre(c0)}})()""")
        await pg.wait_for_timeout(600); print(info)
        t = (await pg.text_content('#main')).upper()
        assert 'SE VA RELLENANDO CADA DÍA' in t and ('ALMACÉN ' + info['alm'].upper() + ' · BALANCE DEL MES') in t, t[:600]
        rows = await pg.locator('table.balt tbody tr').all_inner_texts(); print(rows)
        i = [k for k, x in enumerate(rows) if x.upper().startswith(info['p'].upper())][0]
        # inicio 400, +250, −120, −10, final 520, gastado 120 (2 días × 60) → cuadra con las salidas (sin aviso)
        assert 'GASTADO SEGÚN LAS CUENTAS 120,0' in rows[i].upper() and 'NO CUADRA' not in rows[i].upper() and rows[i+1].split('\t') == ['400,0', '+250,0', '−120,0', '−10,0', '520,0'], rows[i:i+2]
        j = [k for k, x in enumerate(rows) if x.upper().startswith(info['q'].upper())][0]
        assert 'NO CUADRA: +10,0' in rows[j].upper() and rows[j+1].split('\t') == ['0,0', '+40,0', '—', '—', '40,0'], rows[j:j+2]
        assert await pg.evaluate("document.querySelector('table.balt').scrollWidth<=document.querySelector('table.balt').parentElement.clientWidth+2"), 'cabe en el móvil'
        assert 'ABONO APLICADO' in t
        await pg.screenshot(path='pruebas/salida/t120-informe.png', full_page=True)
        tb = await pg.evaluate("informeTablas(informeData(st.mes)).find(x=>x.hoja==='Almacén')"); print(tb['cab'], tb['filas'][:2])
        assert tb['cab'][2] == 'Inicio' and any(f[2] == 400 and f[6] == 520 and f[7] == 120 for f in tb['filas'])
        # --- qué sale: lo de siempre, luego se cambia a mano y se guarda
        assert await pg.evaluate("informeTablas(informeData(st.mes)).map(t=>t.hoja).join()") == 'Resumen,Abonos,Almacén'
        await pg.click('[data-infdet] summary'); await pg.wait_for_timeout(200)
        await pg.click('[data-infsel="sec"][value="abonos"]'); await pg.click('[data-infsel="sec"][value="movs"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-infact="guardar"]'); await pg.wait_for_timeout(1500); await pg.evaluate("st.hist=window._h;st.alm=window._a;renderMain()")
        c = await pg.evaluate("st.savedCfg.informe"); print('guardado:', c); assert 'movs' in c['sec'] and 'abonos' not in c['sec']
        t = (await pg.text_content('#main')).upper(); assert await pg.locator('h3:text-is("Abono aplicado")').count() == 0 and 'MOVIMIENTOS DE ALMACÉN' in t and 'BALANCE DEL MES' in t
        assert await pg.evaluate("informeTablas(informeData(st.mes)).map(t=>t.hoja).join()") == 'Resumen,Almacén,Movimientos'
        # --- pedido con palabras (IA simulada): solo un producto, solo el primer cabezal, abonos y clima
        await pg.evaluate(f"""window._pr='';window.iaFotoJson=async(pr)=>{{window._pr=pr;return {{sec:['abonos','almacen','clima','inventado'],cabs:[almacenes()[0].cabezales[0]],prods:[Object.keys(st.cfg.productos)[0]],mes:null,explica:'Solo el nitrato de Gasolinera.'}}}};renderMain()""")
        await pg.wait_for_timeout(200)
        if await pg.locator('#inf_ia').count():
            await pg.fill('#inf_ia', 'solo el nitrato de gasolinera con el clima'); await pg.click('[data-infact="ia"]'); await pg.wait_for_timeout(600)
            assert 'solo el nitrato de gasolinera' in await pg.evaluate("window._pr") and 'SOLO EL NITRATO DE GASOLINERA.' in (await pg.text_content('#main')).upper()
            B = await pg.evaluate("st.infB"); assert B['sec'] == ['abonos', 'almacen', 'clima'] and len(B['cabs']) == 1 and len(B['prods']) == 1, B
            await pg.click('[data-infact="guardar"]'); await pg.wait_for_timeout(1500); await pg.evaluate("st.hist=window._h;st.alm=window._a;renderMain()")
            d = await pg.evaluate("(()=>{const d=informeData(st.mes);return {cabs:d.cabs.map(x=>x.c.id),prods:Object.keys(d.tot),bal:d.alms.flatMap(a=>a.b.map(x=>x.p)),hojas:informeTablas(d).map(t=>t.hoja)}})()"); print(d)
            assert len(d['cabs']) == 1 and len(d['prods']) == 1 and d['bal'] == d['prods'] and d['hojas'] == ['Abonos', 'Almacén', 'Clima']
            await pg.screenshot(path='pruebas/salida/t120-que-sale.png', full_page=True)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

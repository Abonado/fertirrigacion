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
          const kg={};kg[p]=60;kg[q]=5;st.hist=[{fecha:mes+'-02',m3:{[c0]:100},resumen:{[c0]:{kg}}},{fecha:mes+'-03',m3:{[c0]:110},resumen:{[c0]:{kg}}},{fecha:ant+'-28',m3:{[c0]:90},resumen:{[c0]:{kg}}}];
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
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

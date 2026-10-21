"""Hoja mensual «Cambios de receta»: la receta del día 1 y una columna por cada cambio guardado; PDF con el formato de la hoja."""
import asyncio, sys, subprocess
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid', accept_downloads=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # receta del día 1 (como la hoja en papel) y un cambio hoy
        r = await pg.evaluate("""(async()=>{cerrarSplash();st.finca='pinta';st.cab='gas';
          const mes=hoy().slice(0,7),b=st.cfg.bidones.find(x=>x.cabezales.includes('gas')&&x.principal==='kno3');
          const set=(c,kg,d)=>{const x=c.bidones.find(y=>y.id===b.id);x.kgPrincipal=kg;for(const[p,v]of Object.entries(d)){const q=x.productos.find(y=>y.p===p);if(q)q.dosis=v}};
          const c0=clone(st.cfg);set(c0,54,{kno3:35,k2so4:25,mkp:5,mn:0.75,zn:0.75,h3po4:8});
          await Store.addCambio({ts:mes+'-01T09:00:00.000Z',fecha:mes+'-01',lineas:['Receta de inicio de mes'],por:'Antonio',receta:fotoDe(c0)});
          st.cfg.cultivo=st.cfg.cultivo||{};st.cfg.cultivo.gas={...(st.cfg.cultivo.gas||{}),cultivo:'Tomate',variedad:'Durasol'};
          set(st.cfg,45,{kno3:25,k2so4:25,mkp:5,mn:0.75,zn:0.75,h3po4:8});st.dirtyCfg=true;await saveCfg();
          st.hist=null;st.cambios=null;await loadHist_();st.tab='parte';renderAll();
          const H=hojaReceta('gas',mes),k=H.abonos.find(a=>a.k===b.id+'|kno3');
          return {fechas:H.fechas,abonos:H.abonos.map(a=>a.n),cultivo:H.cultivo,campana:H.campana,kno3:k.cel.map(x=>[+x.c1.toFixed(2),+x.c2.toFixed(1),x.sal,+x.cte.toFixed(2)]),obs:H.obs.length}})()""")
        print(r)
        assert len(r['fechas']) == 2 and r['fechas'][0].endswith('-01')
        assert r['kno3'][0] == [54, 270, 35, 18.52] and r['kno3'][1] == [45, 225, 25, 22.22]
        assert r['cultivo'] == 'Durasol (tomate)'
        await pg.wait_for_timeout(800)
        assert await pg.locator('.hrt td.hrc').count() > 0
        el = pg.locator('.hrt').first; await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(200)
        await pg.screenshot(path='pruebas/salida/t76-app.png', full_page=True)
        async with pg.expect_download() as dl: await pg.click('[data-act="hr-pdf"]')
        d = await dl.value; await d.save_as('pruebas/salida/t76.pdf'); print('PDF:', d.suggested_filename)
        subprocess.run(['pdftoppm', '-r', '110', '-png', 'pruebas/salida/t76.pdf', 'pruebas/salida/t76'], check=True)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

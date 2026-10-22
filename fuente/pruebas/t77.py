"""«Todo junto»: cuentas y drenaje del día de todas las fincas en una pantalla, solo para encargados y administrador."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 400, 'height': 860}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','pepe@demo.es':'pepe1234'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # cuentas de ayer en dos cabezales de Pinta Santos (uno con el drenaje fuera de límites) y nada en La Fuente
        await pg.evaluate("""(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'pepe@demo.es'])];a.info={...a.info,'pepe@demo.es':{nombre:'Pepe'}};await NUBE.db.doc('acceso/usuarios').set(a);
          cerrarSplash();const d=new Date();d.setDate(d.getDate()-1);await loadFecha(isoD(d));const r=st.reg;
          for(const cid of ['pla','gas']){const c=cabById(cid);r.m3[cid]=c.ejM3;marcaReg('m3.'+cid);
            for(const s of c.sectores){r.min[s.id]=s.ejMin;marcaReg('min.'+s.id);for(const bj of s.bandejas){r.dren[bj.id]=bj.ejDren;marcaReg('dren.'+bj.id);r.ceD[bj.id]=cid==='gas'?5.2:3.1;marcaReg('ceD.'+bj.id);r.phD[bj.id]=6.1;marcaReg('phD.'+bj.id)}}}
          for(const bd of st.cfg.bidones)if(bd.cabezales.every(x=>x==='pla'||x==='gas')){r.cm[bd.id]=8;marcaReg('cm.'+bd.id)}
          await saveReg()})()""")
        await pg.wait_for_timeout(1200)
        await pg.evaluate("abrirFincas()"); await pg.wait_for_timeout(800)
        assert await pg.locator('#fincas [data-act="gl-abrir"]').count() == 1
        await pg.click('#fincas [data-act="gl-abrir"]'); await pg.wait_for_timeout(1200)
        txt = await pg.evaluate("document.querySelector('#main').textContent")
        print('pestaña:', await pg.evaluate('st.tab'))
        orden = await pg.evaluate("GRUPOS_RIEGO[0].tabs"); print('menú riego:', orden); assert orden[-1] == 'global' and orden[-2] == 'partes'
        for t in ['Pinta Santos', 'Las Palacias', 'La Fuente', 'Planos', 'Gasolinera', 'Franco', 'Multitúnel 2', 'Todavía sin cabezales', 'Sin cuentas de este día']: assert t in txt, t
        assert await pg.locator('.gcab').count() >= 5
        print('CE fuera marcadas:', await pg.locator('.gtab td.tbad').count()); assert await pg.locator('.gtab td.tbad').count() > 0
        await pg.screenshot(path='pruebas/salida/t77-todo.png', full_page=True)
        await pg.click('[data-act="gl-ir"][data-id="gas"]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.tab==='cuentas'&&st.cab==='gas'")
        # un trabajador no lo ve
        await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.fill('#nb_em', 'pepe@demo.es'); await pg.fill('#nb_pw', 'pepe1234'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        assert not await pg.evaluate("tabPermitida('global')")
        await pg.evaluate("abrirFincas()"); await pg.wait_for_timeout(500); assert await pg.locator('#fincas [data-act="gl-abrir"]').count() == 0
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""Acceso por zona: el administrador, además de las fincas, elige qué zonas (cabezales) de cada finca ve cada persona.
El trabajador solo ve esos cabezales, sus incidencias, tareas y material; y si de una finca no tiene ninguna elegida, ve todas."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 1300, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','pepe@demo.es':'pepe1234'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # Pepe: solo Pinta Santos; incidencias y tareas en Gasolinera y en Planos
        await pg.evaluate("""(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'pepe@demo.es'])];a.info={...a.info,'pepe@demo.es':{nombre:'Pepe',fincas:['pinta'],areas:['riego']}};await NUBE.db.doc('acceso/usuarios').set(a);await NUBE.cargarAcc();
          const t=new Date().toISOString();await Store.addCol('incidencias',{ts:t,cab:'gas',nave:1,txt:'fuga gasolinera',tipo:'riego',estado:'abierta'});await Store.addCol('incidencias',{ts:t,cab:'pla',nave:1,txt:'fuga planos',tipo:'riego',estado:'abierta'});
          await Store.addCol('tareas',{ts:t,titulo:'tarea gasolinera',finca:'pinta',cab:'gas',hecha:false,fecha:hoy()});await Store.addCol('tareas',{ts:t,titulo:'tarea planos',finca:'pinta',cab:'pla',hecha:false,fecha:hoy()});
          cerrarSplash();st.tab='ajustes';st.ajAb=new Set(AJ_GR.map(g=>g[0]));renderAll()})()"""); await pg.wait_for_timeout(1500)
        z = '[data-nube="zon"][data-em="pepe@demo.es"]'
        print('zonas que se pueden elegir:', await pg.locator(z).all_inner_texts())
        assert await pg.locator(f'{z}[data-f="pinta"]').count() == 3 and await pg.locator(f'{z}[data-f="fuente"]').count() == 0, 'solo las fincas que ve y con más de un cabezal'
        assert await pg.locator(f'{z}[aria-pressed="true"]').count() == 3
        # quitarle Planos y Franco: solo Gasolinera
        await pg.click(f'{z}[data-c="pla"]'); await pg.wait_for_timeout(800); await pg.click(f'{z}[data-c="fra"]'); await pg.wait_for_timeout(800)
        i = await pg.evaluate("NUBE.db.doc('acceso/usuarios').get().then(s=>s.data().info['pepe@demo.es'])"); print('guardado:', i)
        assert i['cabs'] == ['gas']
        q = await pg.evaluate("[quienVeCab('gas').includes('pepe@demo.es'),quienVeCab('pla').includes('pepe@demo.es')]"); print('avisos al móvil (gas, planos):', q); assert q == [True, False]
        await pg.click(f'{z}[data-c="gas"]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate("NUBE.db.doc('acceso/usuarios').get().then(s=>s.data().info['pepe@demo.es'].cabs)") == ['gas'], 'no se puede quedar sin ninguna zona'
        await pg.locator('#main section.card:has(h3:text-is("Usuarios y acceso"))').screenshot(path='pruebas/salida/t96-ajustes.png')
        # entra Pepe
        await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.fill('#nb_em', 'pepe@demo.es'); await pg.fill('#nb_pw', 'pepe1234'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        v = await pg.evaluate("[cabsVis().map(c=>c.id),fincasVis().map(f=>f.id+':'+f.cabezales.join(',')),st.cfg.fincas.find(f=>f.id==='pinta').cabezales.length]"); print('Pepe ve:', v)
        assert v[0] == ['gas'] and v[1] == ['pinta:gas'] and v[2] == 3, 've solo Gasolinera y la configuración no se toca'
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(500)
        cabs = await pg.locator('#cabs [data-cab]').all_inner_texts() if await pg.locator('#cabs [data-cab]').count() else []
        print('botones de cabezal:', cabs); assert len(cabs) <= 1
        inc = await pg.evaluate("Store.listCol('incidencias',50).then(l=>l.filter(incVisible).map(i=>i.txt))"); print('incidencias que ve:', inc); assert inc == ['fuga gasolinera']
        ta = await pg.evaluate("Store.listCol('tareas',50).then(l=>l.filter(tVisible).map(t=>t.titulo))"); print('tareas que ve:', ta); assert ta == ['tarea gasolinera']
        # vuelve a verlo todo de Pinta Santos
        await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.tab='ajustes';st.ajAb=new Set(AJ_GR.map(g=>g[0]));renderAll()"); await pg.wait_for_timeout(800)
        await pg.click(f'{z}[data-c="pla"]'); await pg.wait_for_timeout(800); await pg.click(f'{z}[data-c="fra"]'); await pg.wait_for_timeout(800)
        i = await pg.evaluate("NUBE.db.doc('acceso/usuarios').get().then(s=>s.data().info['pepe@demo.es'])"); print('todas otra vez:', i); assert 'cabs' not in i
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""Fichar y ubicación: un trabajador ficha entrada y salida con su posición (con aviso previo); el encargado ve el mapa,
la lista del día y descarga el registro de jornada; un trabajador no puede ver a los demás."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def entrar(pg, em, pw):
    await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
    await pg.fill('#nb_em', em); await pg.fill('#nb_pw', pw); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid', accept_downloads=True,
                                  geolocation={'latitude': 37.4061, 'longitude': -1.5825}, permissions=['geolocation'])
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await ctx.route('https://www.ign.es/**', lambda r: r.abort()); await ctx.route('https://tile.openstreetmap.org/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','pepe@demo.es':'pepe1234','paco@demo.es':'paco1234'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("""(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'pepe@demo.es','paco@demo.es'])];
          a.info={...a.info,'pepe@demo.es':{nombre:'Pepe'},'paco@demo.es':{nombre:'Paco',areas:['campo']}};await NUBE.db.doc('acceso/usuarios').set(a);
          for(const c of [st.cfg,st.savedCfg])for(const f of c.fincas)if(f.id==='pinta')f.ubic={lat:37.4063,lon:-1.5829};await Store.setConfig(st.savedCfg)})()""")
        # Pepe ficha la entrada desde «Tu día»: primero sale el aviso
        await entrar(pg, 'pepe@demo.es', 'pepe1234'); await pg.wait_for_timeout(800)
        await pg.click('#sp_fich [data-act="fi-fichar"]'); await pg.wait_for_timeout(300)
        assert 'Estatuto de los Trabajadores' in await pg.evaluate("document.querySelector('#sp_fich').textContent")
        await pg.click('#sp_fich [data-act="fi-ok"]'); await pg.wait_for_timeout(1500)
        f = await pg.evaluate("NUBE.db.doc('fichajes/pepe@demo.es_'+hoy()).get().then(s=>s.data())"); print('fichaje:', f['eventos'])
        assert f['eventos'][0]['tipo'] == 'entrada' and f['eventos'][0]['finca'] == 'pinta'
        pos = await pg.evaluate("NUBE.db.doc('posiciones/pepe@demo.es').get().then(s=>s.data())"); assert pos['activo'] and pos['lat'] > 37
        assert 'Trabajando desde' in await pg.evaluate("document.querySelector('#sp_fich').textContent")
        # se mueve: la posición se actualiza sola
        await ctx.set_geolocation({'latitude': 37.4105, 'longitude': -1.5750}); await pg.evaluate("ubUlt=0;ubEnviar(true)"); await pg.wait_for_timeout(800)
        pos = await pg.evaluate("NUBE.db.doc('posiciones/pepe@demo.es').get().then(s=>s.data())"); print('posición nueva:', pos['lat'], pos['lon']); assert pos['lat'] == 37.4105
        # un trabajador no puede leer al resto
        r = await pg.evaluate("NUBE.db.collection('posiciones').get().then(()=>'leido',e=>'denegado')"); print('Pepe lee posiciones de todos:', r); assert r == 'denegado'
        r = await pg.evaluate("NUBE.db.doc('fichajes/pepe@demo.es_'+hoy()).set({email:'pepe@demo.es',fecha:hoy(),eventos:[]}).then(()=>'cambiado',e=>'denegado')"); print('Pepe borra sus fichajes:', r); assert r == 'denegado'
        # Paco (solo campo) ficha desde su menú
        await entrar(pg, 'paco@demo.es', 'paco1234')
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='cubic';renderAll()"); await pg.wait_for_timeout(800)
        await pg.click('#main [data-act="fi-fichar"]'); await pg.wait_for_timeout(200); await pg.click('#main [data-act="fi-ok"]'); await pg.wait_for_timeout(1500)
        assert await pg.evaluate("jornadaAbierta(st.fich)")
        # el encargado (administrador) ve a los dos en el mapa y en la lista
        await entrar(pg, 'juanjo.serrano3@gmail.com', 'admin123')
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='ubic';st.ubEq=null;renderAll()"); await pg.wait_for_timeout(1800)
        txt = await pg.evaluate("document.querySelector('#main').textContent")
        print('marcas en el mapa:', await pg.locator('#ubmapa .ubp').count()); assert await pg.locator('#ubmapa .ubp').count() == 2
        assert 'Pepe' in txt and 'Paco' in txt and 'Trabajando' in txt
        await pg.screenshot(path='pruebas/salida/t78-equipo.png', full_page=True)
        # Pepe ficha la salida: deja de verse
        await entrar(pg, 'pepe@demo.es', 'pepe1234'); await pg.wait_for_timeout(600)
        await pg.click('#sp_fich [data-act="fi-fichar"]'); await pg.wait_for_timeout(1500)
        pos = await pg.evaluate("NUBE.db.doc('posiciones/pepe@demo.es').get().then(s=>s.data())"); print('tras salir:', pos); assert not pos['activo'] and pos['lat'] is None
        await entrar(pg, 'juanjo.serrano3@gmail.com', 'admin123')
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='ubic';st.ubEq=null;renderAll()"); await pg.wait_for_timeout(1500)
        assert await pg.locator('#ubmapa .ubp').count() == 1
        async with pg.expect_download() as dl: await pg.click('[data-act="ub-xlsx"]')
        d = await dl.value; print('Excel:', d.suggested_filename)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

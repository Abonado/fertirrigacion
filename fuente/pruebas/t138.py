"""Portal del trabajador (v194): botón grande para empezar y terminar la jornada, descanso (las horas paran y el registro lo
descuenta), línea del día (entrada, descanso, salida), los tratamientos que te han mandado y contar cajas a toques en el parte."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid',
                                                                  geolocation={'latitude': 37.4061, 'longitude': -1.5825}, permissions=['geolocation'])
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # funciones de horas: 7:00–15:30 con descanso 13:00–13:30 = 8 h
        h = await pg.evaluate("""horasDia({eventos:[{tipo:'entrada',ts:'2026-11-06T06:00:00Z'},{tipo:'pausa',ts:'2026-11-06T12:00:00Z'},{tipo:'vuelta',ts:'2026-11-06T12:30:00Z'},{tipo:'salida',ts:'2026-11-06T14:30:00Z'}]})""")
        assert abs(h - 8) < 1e-9, h
        assert await pg.evaluate("jornadaAbierta({eventos:[{tipo:'entrada'},{tipo:'pausa'}]}) && enDescanso({eventos:[{tipo:'entrada'},{tipo:'pausa'}]})")
        await pg.evaluate("localStorage.setItem('abono.ubic.aviso.'+miEmail(),'1');cerrarSplash();st.finca='pinta';st.tab='ubic';renderAll()"); await pg.wait_for_timeout(1500)
        t = await pg.text_content('#ub_mia'); assert 'Empezar jornada' in t and 'Sin fichar' in t, t
        assert await pg.locator('#main [data-act="fi-fichar"]').count() == 1
        await pg.click('#ub_mia [data-act="fi-fichar"]'); await pg.wait_for_timeout(1800)
        t = await pg.text_content('#ub_mia'); assert 'Terminar jornada' in t and 'Turno abierto' in t and 'Descanso' in t, t
        await pg.click('#ub_mia [data-act="fi-pausa"]'); await pg.wait_for_timeout(1200)
        t = await pg.text_content('#ub_mia'); assert 'Volver del descanso' in t and 'En descanso' in t, t
        ev = await pg.evaluate("st.fich.eventos"); assert [e['tipo'] for e in ev] == ['entrada', 'pausa'] and 'sinUbic' not in ev[1], ev
        await pg.screenshot(path='pruebas/salida/t138-portal.png')
        await pg.click('#ub_mia [data-act="fi-pausa"]'); await pg.wait_for_timeout(1200)
        await pg.click('#ub_mia [data-act="fi-fichar"]'); await pg.wait_for_timeout(1800)
        ev = await pg.evaluate("NUBE.db.doc('fichajes/'+fichId(miEmail(),hoy())).get().then(s=>s.data().eventos)")
        assert [e['tipo'] for e in ev] == ['entrada', 'pausa', 'vuelta', 'salida'], ev
        t = await pg.text_content('#ub_mia'); assert 'Jornada terminada' in t and 'Volver a entrar' in t
        assert await pg.locator('#ub_mia .pt-tl li').count() == 3
        # en el equipo y en el Excel
        async with pg.expect_download() as dl: await pg.click('[data-act="ub-xlsx"]')
        d = await dl.value; assert d.suggested_filename.startswith('registro-jornada')
        # tratamientos mandados a mí: salen en el portal
        await pg.evaluate("""(async()=>{const o={ts:ahoraISO(),fecha:hoy(),hora:'07:00',para:miEmail(),paraNombre:'Juanjo',idioma:'ar',prod:'Spintor 480 SC',dosis:25,ud:'cc/hL',caldo:800,cab:'gas',nave:2,hecha:false};const id=await Store.addCol('ordenes',o);st.ot.list=[{...o,id}];renderMain()})()"""); await pg.wait_for_timeout(600)
        t = await pg.text_content('#main'); assert 'Tratamientos que te han mandado' in t and 'معالجة: Spintor 480 SC' in t and '200 مل' in t, t
        # contar cajas a toques en el parte de la colla
        await pg.evaluate("""(()=>{st.collas=[{id:'c1',nombre:'Colla Pepe',finca:'pinta',jefeEmail:miEmail(),ent:'07:00',sal:'15:00',pau:30,miembros:[{id:'a',n:'Ana',activo:true}],activa:true}];st.jorDias=999;st.jor={};st.co.colla='c1';st.co.ed=null;st.tab='coparte';renderAll()})()"""); await pg.wait_for_timeout(800)
        await pg.click('[data-act="co-addt"]'); await pg.wait_for_timeout(300)
        await pg.select_option('#ct_l_0', 'recolectar'); await pg.wait_for_timeout(300)
        for n in ['25', '5', '-1']: await pg.click(f'[data-costep="0"][data-n="{n}"]'); await pg.wait_for_timeout(100)
        assert await pg.evaluate("st.co.ed.trabajos[0].cajas") == 29 and await pg.input_value('#ct_cajas_0') == '29'
        assert await pg.evaluate("st.co.dirty") is True
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 420, ancho
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

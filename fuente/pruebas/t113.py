"""Taller · diseños en la nube y «Mis aparatos»: los diseños se guardan en la nube (se suben los que solo estaban en el móvil y aparecen
en otro móvil); «Mis aparatos» da de alta lo instalado con sus tareas de mantenimiento y calibración según el tipo, cuenta lo pendiente
(insignia en el menú Taller), «Hecho hoy» lo quita, se apuntan dato e historial, se retira y se borra; desde un diseño, «Lo he instalado»."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        # un diseño de antes, solo en este móvil
        await pg.evaluate("localStorage.setItem('abono.taller',JSON.stringify([{id:'dviejo',nombre:'Nivel viejo',nodo:'N1',energia:'enchufe',lugar:'inv',pines:{rx:47},alim:{a02:3.3},caja:{},hecho:[],mod:'2026-10-01T10:00:00.000Z'}]))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='taller';renderAll()"); await pg.wait_for_timeout(2500)
        nube = await pg.evaluate("Store.listCol('tldisenos',50).then(l=>l.map(x=>x.id))"); print('en la nube:', nube); assert 'dviejo' in nube, 'se sube el diseño que solo estaba en el móvil'
        assert 'EN LA NUBE' in (await pg.text_content('#main')).upper()
        # diseño nuevo: guardar lo sube
        await pg.evaluate("TALLER.crearNodo('N4');renderMain()"); await pg.wait_for_timeout(500)
        did = await pg.evaluate("st.tl.d.id")
        await pg.click('[data-tl="guardar"]'); await pg.wait_for_timeout(800)
        assert did in await pg.evaluate("Store.listCol('tldisenos',50).then(l=>l.map(x=>x.id))")
        # «otro móvil»: sin copia local, aparecen los dos al abrir el Taller
        await pg.evaluate("localStorage.removeItem('abono.taller')"); await pg.evaluate("TALLER.sincroniza()"); await pg.wait_for_timeout(800)
        assert sorted(await pg.evaluate("TALLER.lista().map(x=>x.id)")) == sorted(['dviejo', did])
        # borrar un diseño lo quita de la nube
        await pg.evaluate("st.tl.d=null;renderMain()"); await pg.wait_for_timeout(300)
        await pg.click('[data-tl="borrar"][data-id="dviejo"]'); await pg.wait_for_timeout(800)
        assert 'dviejo' not in await pg.evaluate("Store.listCol('tldisenos',50).then(l=>l.map(x=>x.id))")
        # «Lo he instalado» desde el diseño
        await pg.click(f'[data-tl="abrir"][data-id="{did}"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-tlinst]'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("st.tab") == 'aparatos' and await pg.evaluate("[st.apF.tipo,st.apF.diseno]") == ['N4', did]
        assert await pg.locator('#ap_tipo').input_value() == 'N4'
        await pg.select_option('#ap_cab', 'gas'); await pg.fill('#ap_nave', '3'); await pg.fill('#ap_nom', 'Clima nave 3')
        await pg.fill('#ap_inst', '2026-09-01')
        await pg.screenshot(path='pruebas/salida/t113-alta.png', full_page=True)
        await pg.click('[data-apsave]'); await pg.wait_for_timeout(800)
        a = await pg.evaluate("st.ap[0]"); print('aparato:', a['nombre'], a['tipo'], a['cab'], a['nave'], [m['t'] for m in a['mant']], a['calib'])
        assert a['tipo'] == 'N4' and a['nave'] == '3' and len(a['mant']) == 4 and a['calib']['cada'] == 180
        assert len(await pg.evaluate("Store.listCol('aparatos',50)")) == 1, 'guardado en la nube'
        # instalado hace casi dos meses: las tareas de 14 y 30 días ya tocan
        pend = await pg.evaluate("apPend(st.ap[0])"); print('pendiente:', pend); assert len(pend) == 4 and 'Calibrar' not in pend
        await pg.evaluate("renderAll()"); await pg.wait_for_timeout(300)
        bdg = await pg.text_content('#grupos [data-grupo="lab"]'); assert '4' in bdg, bdg
        assert 'TOCA' in (await pg.text_content('#main')).upper()
        await pg.screenshot(path='pruebas/salida/t113-ficha.png', full_page=True)
        await pg.click('[data-aphecho="0"]'); await pg.wait_for_timeout(500)
        assert len(await pg.evaluate("apPend(st.ap[0])")) == 3 and await pg.evaluate("st.ap[0].hist[0].t") == 'Limpiar la garita'
        await pg.fill('#ap_dt', '24,1 °C · 71 %'); await pg.fill('#ap_db', '87'); await pg.click('[data-apdato]'); await pg.wait_for_timeout(500)
        t = (await pg.text_content('#main')).upper(); assert '24,1 °C' in t and '87 %' in t
        await pg.fill('#ap_h', 'Cambiada la junta'); await pg.click('[data-aphist]'); await pg.wait_for_timeout(500)
        nubeA = (await pg.evaluate("Store.listCol('aparatos',50)"))[0]; assert nubeA['dato']['bat'] == 87 and nubeA['hist'][0]['t'] == 'Cambiada la junta'
        # lista
        await pg.click('[data-apver=""]'); await pg.wait_for_timeout(300)
        t = (await pg.text_content('#main')).upper(); assert 'CLIMA NAVE 3' in t and 'NAVE 3' in t and '3' in (await pg.text_content('.apres .bad b'))
        await pg.screenshot(path='pruebas/salida/t113-lista.png', full_page=True)
        # retirar: deja de contar
        await pg.click('[data-apver]'); await pg.wait_for_timeout(300); await pg.click('[data-apret]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("apPendTotal()") == 0
        # borrar
        await pg.click('[data-apdel]'); await pg.wait_for_timeout(200); await pg.click('[data-apdelok]'); await pg.wait_for_timeout(800)
        assert await pg.evaluate("st.ap.length") == 0 and len(await pg.evaluate("Store.listCol('aparatos',50)")) == 0
        # alta a mano desde la lista
        await pg.click('[data-apnuevo]'); await pg.wait_for_timeout(300); await pg.select_option('#ap_tipo', 'trampa'); await pg.wait_for_timeout(300)
        await pg.click('[data-apsave]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate("[st.ap[0].tipo,st.ap[0].mant.length,st.ap[0].calib.cada]") == ['trampa', 2, 0]
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

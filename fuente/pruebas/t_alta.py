"""Alta guiada de empresa (alta.js): el administrador recorre los 5 pasos y al terminar la configuración queda sin nada
de Pinta Santos, con sus fincas, cabezales, sectores, bandejas y depósitos (dosis a cero); las pantallas de riego abren
sin errores con la configuración nueva, y la persona dada de alta queda en la lista de acceso. Una persona que no es
administrador no ve la pestaña."""
import asyncio, sys, json
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort()); await ctx.route('https://archive-api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='alta';renderAll()"); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("!!window.ALTA"), 'alta.js no se ha cargado'
        assert 'paso 1 de 5' in await pg.evaluate("document.querySelector('#main').textContent")
        # paso 1: sin nombre no deja seguir
        await pg.click('[data-alta-act=sigue]'); await pg.wait_for_timeout(200)
        assert 'paso 1 de 5' in await pg.evaluate("document.querySelector('#main').textContent")
        await pg.fill('[data-alta="emp.nombre"]', 'Hortalizas Prueba SL'); await pg.fill('[data-alta="emp.variedad"]', 'Ramyle')
        await pg.click('[data-alta-act=sigue]'); await pg.wait_for_timeout(200)
        # paso 2: dos fincas
        await pg.fill('[data-alta="finca.0"]', 'El Llano'); await pg.click('[data-alta-act=finca-pon]'); await pg.wait_for_timeout(150)
        await pg.fill('[data-alta="finca.1"]', 'La Loma'); await pg.click('[data-alta-act=sigue]'); await pg.wait_for_timeout(200)
        # paso 3: un cabezal en cada finca
        await pg.fill('[data-alta="cab.0.nombre"]', 'Nave 1'); await pg.fill('[data-alta="cab.0.sectores"]', '3')
        await pg.click('[data-alta-act=cab-pon]'); await pg.wait_for_timeout(150)
        await pg.fill('[data-alta="cab.1.nombre"]', 'Nave 2'); await pg.select_option('[data-alta="cab.1.finca"]', '1'); await pg.wait_for_timeout(150)
        await pg.fill('[data-alta="cab.1.bandejas"]', '2'); await pg.click('[data-alta-act=sigue]'); await pg.wait_for_timeout(200)
        # paso 4: depósitos por defecto (potásico y cálcico) y uno de nítrico en la Nave 2
        await pg.click('[data-alta-act=dep-pon][data-i="1"]'); await pg.wait_for_timeout(150)
        await pg.select_option('[data-alta="dep.1.2.tipo"]', 'nit'); await pg.click('[data-alta-act=sigue]'); await pg.wait_for_timeout(200)
        # paso 5: una persona; sin marcar la casilla no sustituye la configuración
        await pg.click('[data-alta-act=gen-pon]'); await pg.wait_for_timeout(150)
        await pg.fill('[data-alta="gen.0.nombre"]', 'Ana'); await pg.fill('[data-alta="gen.0.email"]', 'ana@prueba.es'); await pg.fill('[data-alta="gen.0.pass"]', 'ana12345')
        await pg.click('[data-alta-act=fin]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.cfg.fincas.some(f=>f.id==='pinta')"), 'ha sustituido sin confirmar'
        await pg.check('[data-alta="conf"]'); await pg.click('[data-alta-act=fin]'); await pg.wait_for_timeout(2500)
        assert 'Alta hecha' in await pg.evaluate("document.querySelector('#main').textContent"), await pg.evaluate("document.querySelector('#main').textContent")
        c = await pg.evaluate("st.cfg")
        txt = json.dumps(c, ensure_ascii=False)
        assert 'Pinta' not in txt and 'Gasolinera' not in txt and 'Franco' not in txt, 'quedan restos de Pinta Santos'
        assert [f['nombre'] for f in c['fincas']] == ['El Llano', 'La Loma'], c['fincas']
        assert [x['nombre'] for x in c['cabezales']] == ['Nave 1', 'Nave 2']
        assert len(c['cabezales'][0]['sectores']) == 3 and len(c['cabezales'][1]['sectores'][0]['bandejas']) == 2
        assert len(c['bidones']) == 5 and all(p['dosis'] == 0 for bd in c['bidones'] for p in bd['productos'])
        assert c['fincas'][1]['cabezales'] == [c['cabezales'][1]['id']] and len(c['almacenes']) == 2
        assert c['empresa'] == 'Hortalizas Prueba SL' and c['cultivo'][c['cabezales'][0]['id']]['variedad'] == 'Ramyle'
        assert not await pg.evaluate("st.dirtyCfg"), 'la configuración no se ha guardado'
        guardada = await pg.evaluate("Store.getConfig().then(x=>x.fincas.map(f=>f.nombre))")
        assert guardada == ['El Llano', 'La Loma'], guardada
        acc = await pg.evaluate("NUBE.db.doc('acceso/usuarios').get().then(s=>s.data())")
        assert 'ana@prueba.es' in acc['emails'], acc
        # las pantallas de riego abren con la empresa nueva
        for cab in [x['id'] for x in c['cabezales']]:
            for t in ['cuentas', 'cmbid', 'drenaje', 'rellenar', 'receta', 'aforo', 'ajriego', 'parte', 'almacen', 'estructura', 'ajustes']:
                await pg.evaluate(f"(()=>{{st.finca=st.cfg.fincas.find(f=>f.cabezales.includes('{cab}')).id;st.cab='{cab}';st.tab='{t}';renderAll()}})()"); await pg.wait_for_timeout(200)
                assert not errs, f'{cab} · {t}: {errs[:2]}'
        # «Ir a Receta»
        await pg.evaluate("st.tab='alta';renderAll()"); await pg.wait_for_timeout(200)
        await pg.click('[data-alta-act=cerrar]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.tab") == 'receta'
        # alguien que no es administrador no puede abrirla
        assert await pg.evaluate("/k==='estructura'\\|\\|k==='alta'\\)return esAdminU\\(\\)/.test(tabPermitida.toString())"), 'la pestaña no está limitada al administrador'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""Catálogo de tecnología agrícola (apartado Taller del menú, solo el administrador): se abre con carpetas, cada carpeta lista sus
elementos con ficha (en tu finca, precio, ejemplos, conexión), el buscador encuentra en todas las carpetas sin tildes, los filtros
por estado funcionan, los que se montan en el Taller llevan allí, y el encargado ni lo ve ni lo carga."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','pepe@demo.es':'pepe1234'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("""(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'pepe@demo.es'])];a.info={...a.info,'pepe@demo.es':{nombre:'Pepe',encargado:true}};await NUBE.db.doc('acceso/usuarios').set(a);
          cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='cuentas';renderAll()})()"""); await pg.wait_for_timeout(800)
        g = await pg.locator('#grupos .grp span').all_inner_texts(); print('menú:', g); assert len(g) == 5 and g[-1].upper() == 'MÁS'
        await pg.click('#grupos [data-grupo="mas"]'); await pg.wait_for_timeout(300); await pg.click('#main [data-tab="catalogo"]'); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("st.tab") == 'catalogo' and await pg.evaluate("!!window.CATALOGO")
        tabs = await pg.locator('#tabs .tab').all_inner_texts(); print('pestañas:', tabs); assert len(tabs) == 4 and 'MIS APARATOS' in [x.upper() for x in tabs] and 'CAJÓN Y COMPRA' in [x.upper() for x in tabs]
        C = await pg.evaluate("window.CATALOGO.carpetas.map(c=>[c.id,c.it.length])"); n = sum(x[1] for x in C); print('carpetas:', C, '· elementos:', n)
        assert len(C) >= 10 and n >= 80
        # todos los elementos con su ficha completa y un estado válido
        malos = await pg.evaluate("window.CATALOGO.carpetas.flatMap(c=>c.it.filter(i=>!i.n||!i.q||!i.uso||!i.prec||!i.ej||!i.con||!i.dif||!['app','prep','idea','no'].includes(i.est)).map(i=>c.id+': '+i.n))")
        assert not malos, malos
        assert await pg.locator('#main .catf').count() == len(C)
        await pg.screenshot(path='pruebas/salida/t107-carpetas.png', full_page=True)
        # abrir una carpeta y una ficha
        await pg.click('#main .catf[data-catc="agua"]'); await pg.wait_for_timeout(300)
        assert 'Agua, riego y fertirrigación' in await pg.text_content('#main .cath')
        k = await pg.locator('#main .catit').count(); assert k == dict(C)['agua']
        await pg.click('#main .catit:has-text("Nivel de depósitos") summary'); await pg.wait_for_timeout(200)
        f = await pg.text_content('#main .catit[open]'); assert 'En tu finca' in f and 'Precio orientativo' in f and 'Rellenar depósito' in f
        assert await pg.locator('#main .catit[open] [data-tlnuevo]').count() == 1
        await pg.screenshot(path='pruebas/salida/t107-ficha.png', full_page=True)
        # buscador en todas las carpetas y sin tildes
        await pg.click('[data-catc=""]'); await pg.wait_for_timeout(200)
        await pg.fill('#cat_q', 'pulverizacion'); await pg.wait_for_timeout(300)
        r = await pg.locator('#main .catit > summary b').all_inner_texts(); print('«pulverizacion»:', r)
        assert any('dron' in x.lower() for x in r) and any('carro' in x.lower() for x in r) and await pg.locator('#cat_q').evaluate("e=>document.activeElement===e"), 'busca en todas las carpetas y no pierde el foco'
        await pg.fill('#cat_q', 'tuta camara'); await pg.wait_for_timeout(300)
        r = await pg.locator('#main .catit > summary b').all_inner_texts(); print('«tuta camara»:', r); assert 'TRAMPA INTELIGENTE CON CÁMARA' in [x.upper() for x in r]
        await pg.fill('#cat_q', 'zzzz'); await pg.wait_for_timeout(300); assert 'No hay nada' in await pg.text_content('#main .catres')
        # filtro por estado
        await pg.fill('#cat_q', ''); await pg.wait_for_timeout(200); await pg.click('[data-catf="no"]'); await pg.wait_for_timeout(200)
        await pg.click('#main .catf[data-catc="drones"]'); await pg.wait_for_timeout(200)
        r = await pg.locator('#main .catit > summary b').all_inner_texts(); print('drones no recomendados:', r); assert [x.upper() for x in r] == ['PULVERIZAR CON DRON']
        # del catálogo al taller
        await pg.click('[data-catf=""]'); await pg.wait_for_timeout(200); await pg.click('[data-catc=""]'); await pg.wait_for_timeout(200)
        await pg.fill('#cat_q', 'nivel deposito'); await pg.wait_for_timeout(300)
        assert await pg.locator('#main .catit[open]:has-text("Nivel de depósitos")').count() == 1, 'recuerda la ficha que tenías abierta'
        await pg.click('#main .catit[open] [data-tlnuevo]'); await pg.wait_for_timeout(1200); assert await pg.evaluate("[st.tab,st.tl.d&&st.tl.d.nodo]") == ['taller', 'N1']
        # el encargado lo ve cerrado con llave y no se carga
        await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.fill('#nb_em', 'pepe@demo.es'); await pg.fill('#nb_pw', 'pepe1234'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.evaluate("gruposAct().some(g=>g.id==='lab')") and len(await pg.locator('#grupos .grp').all()) == 5
        await pg.evaluate("st.tab='catalogo';renderAll()"); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.tab") == 'catalogo' and await pg.evaluate("!window.CATALOGO") and 'CERRADO CON LLAVE' in (await pg.text_content('#main')).upper()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""Ajustes → Taller de sensores: solo lo ve el administrador. Asistente → nodo; esquema con avisos (pin ocupado, pin repetido,
analógico en pin que no vale, 5 V en la señal); caja 3D con Manifold → STL de base y tapa válidos y .scad; ficha con casillas;
diseños guardados en el móvil. Un encargado no ve la pestaña ni se le carga el código."""
import asyncio, sys, struct
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid', accept_downloads=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','pepe@demo.es':'pepe1234'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("""(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'pepe@demo.es'])];a.info={...a.info,'pepe@demo.es':{nombre:'Pepe',encargado:true}};await NUBE.db.doc('acceso/usuarios').set(a);
          cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='cuentas';renderAll()})()"""); await pg.wait_for_timeout(800)
        assert await pg.locator('#grupos [data-grupo="lab"]').count() == 1, 'el administrador ve el apartado Taller en el menú'
        await pg.click('#grupos [data-grupo="lab"]'); await pg.wait_for_timeout(600)
        assert await pg.locator('#tabs [data-tab="taller"]').count() == 1, 'el administrador ve la pestaña'
        await pg.evaluate("st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(300); assert await pg.locator('#tabs [data-tab="taller"]').count() == 0, 'ya no está en Ajustes'
        await pg.click('#grupos [data-grupo="lab"]'); await pg.wait_for_timeout(600)
        await pg.click('#tabs [data-tab="taller"]'); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("!!window.TALLER") and 'Taller de sensores' in await pg.text_content('#main')
        assert await pg.locator('[data-tl="crear"]').is_disabled()
        for k, v in (('medir', 'nivel'), ('energia', 'enchufe'), ('lugar', 'inv')):
            await pg.click(f'[data-tl="q"][data-k="{k}"][data-v="{v}"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-tl="crear"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.tl.d.nodo") == 'N1' and 'A02YYUW' in await pg.text_content('#main')
        await pg.click('[data-tl="v"][data-v="esquema"]'); await pg.wait_for_timeout(300)
        assert 'Sin errores' in await pg.text_content('#main') and await pg.locator('#main svg.tl-esq').count() == 1
        assert 'GPIO 47' in await pg.text_content('#main svg.tl-esq')
        await pg.screenshot(path='pruebas/salida/t106-esquema.png', full_page=True)
        await pg.select_option('#tl_p_rx', '36'); await pg.wait_for_timeout(300)
        assert 'Vext' in await pg.text_content('#main .tl-avisos'), 'pin ocupado'
        await pg.select_option('#tl_p_rx', '47'); await pg.select_option('#tl_a_a02', '5'); await pg.wait_for_timeout(300)
        assert 'solo aguanta 3,3 V' in await pg.text_content('#main .tl-avisos'), '5 V en la señal'
        await pg.select_option('#tl_a_a02', '3.3'); await pg.wait_for_timeout(200)
        assert 'Sin errores' in await pg.text_content('#main')
        solapes = await pg.evaluate("""(()=>{const o=[];for(const n of ['N1','N2','N3','P']){const d={nodo:n,caja:{pared:3.6,suelo:2.4,holg:3,extra:12,ranura:true}},D=TALLER._.distribuir(d),S=D.sit;
          for(const a of S){if(Math.abs(a.cx)+a.L/2>D.Li/2||Math.abs(a.cy)+a.W/2>D.Wi/2)o.push(n+' '+a.p+' fuera');for(const b of S)if(a!==b&&Math.abs(a.cx-b.cx)<(a.L+b.L)/2&&Math.abs(a.cy-b.cy)<(a.W+b.W)/2)o.push(n+' '+a.p+'/'+b.p)}}return o})()""")
        assert not solapes, f'piezas montadas unas encima de otras o fuera de la caja: {solapes}'
        # caja 3D y archivos
        await pg.click('[data-tl="v"][data-v="caja"]')
        await pg.wait_for_function("st.tl.m&&st.tl.m.base", timeout=30000); await pg.wait_for_timeout(300)
        pint = await pg.evaluate("(()=>{const c=document.getElementById('tl_cv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n})()")
        assert pint > 2000, f'la vista 3D dibuja algo ({pint})'
        await pg.screenshot(path='pruebas/salida/t106-caja.png', full_page=True)
        vol = await pg.evaluate("[st.tl.m.base.vol,st.tl.m.tapa.vol,st.tl.m.g.Lo,st.tl.m.g.Wo,st.tl.m.g.Ho]"); print('volúmenes y medidas:', vol)
        assert vol[0] > 5000 and vol[1] > 2000
        async with pg.expect_download() as dl:
            await pg.click('[data-tl="stl"][data-k="base"]')
        data = open(await (await dl.value).path(), 'rb').read(); n = struct.unpack('<I', data[80:84])[0]
        print('STL base:', n, 'triángulos'); assert n > 100 and len(data) == 84 + 50 * n
        async with pg.expect_download() as dl:
            await pg.click('[data-tl="scad"]')
        sc = open(await (await dl.value).path()).read(); assert 'module base()' in sc and 'module tapa()' in sc and 'difference()' in sc
        g0 = vol[2]; await pg.fill('#tl_c_holg', '10'); await pg.dispatch_event('#tl_c_holg', 'change')
        await pg.wait_for_function(f"st.tl.m&&st.tl.m.g.Lo>{g0}", timeout=30000)
        # otros nodos: analógico y pines repetidos
        await pg.evaluate("st.tl.d=null;st.tl.q={medir:'humedad',energia:'solar',lugar:'inv'};renderMain()"); await pg.click('[data-tl="crear"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-tl="v"][data-v="esquema"]'); await pg.wait_for_timeout(200)
        assert 'Sin errores' in await pg.text_content('#main'), await pg.text_content('#main .tl-avisos')
        await pg.select_option('#tl_p_ana', '40'); await pg.wait_for_timeout(200)
        assert 'analógicos' in await pg.text_content('#main .tl-avisos')
        await pg.evaluate("st.tl.d=null;st.tl.q={medir:'ce',energia:'solar',lugar:'fuera'};renderMain()"); await pg.click('[data-tl="crear"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-tl="v"][data-v="esquema"]'); await pg.wait_for_timeout(200)
        t = await pg.text_content('#main .tl-avisos'); assert 'BORRADOR' in t and '✗' not in t, t
        await pg.select_option('#tl_p_ro', '6'); await pg.wait_for_timeout(200)
        assert 'dos veces' in await pg.text_content('#main .tl-avisos')
        await pg.click('[data-tl="v"][data-v="caja"]'); await pg.wait_for_function("st.tl.m&&st.tl.d.nodo==='N3'&&st.tl.m.g.D.sit.length===5", timeout=30000)
        await pg.screenshot(path='pruebas/salida/t106-caja-n3.png', full_page=True)
        # ficha: casillas guardadas
        await pg.click('[data-tl="v"][data-v="ficha"]'); await pg.wait_for_timeout(200)
        await pg.check('[data-tlh="0"]'); await pg.wait_for_timeout(200)
        guard = await pg.evaluate("JSON.parse(localStorage.getItem('abono.taller'))"); assert len(guard) == 1 and guard[0]['hecho'] == [0]
        await pg.click('[data-tl="volver"]'); await pg.wait_for_timeout(200)
        assert await pg.locator('[data-tl="abrir"]').count() == 1
        await pg.click('[data-tl="abrir"]'); await pg.wait_for_timeout(200); await pg.click('[data-tl="v"][data-v="ficha"]'); await pg.wait_for_timeout(200)
        assert await pg.is_checked('[data-tlh="0"]')
        await pg.evaluate("st.tl.d=null;st.tl.q={medir:'nivel',energia:'enchufe',lugar:'inv'};renderMain()"); await pg.click('[data-tl="crear"]'); await pg.click('[data-tl="v"][data-v="ficha"]'); await pg.wait_for_timeout(200)
        assert '#define SENSOR_RX 47' in await pg.text_content('#tl_cod')
        await pg.screenshot(path='pruebas/salida/t106-ficha.png', full_page=True)
        # encargado: ni la pestaña ni el código
        await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.fill('#nb_em', 'pepe@demo.es'); await pg.fill('#nb_pw', 'pepe1234'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(600)
        assert await pg.locator('#tabs [data-tab="taller"]').count() == 0, 'el encargado no ve la pestaña'
        assert await pg.locator('#grupos [data-grupo="lab"]').count() == 0, 'el encargado no ve el apartado Taller'
        await pg.evaluate("st.tab='taller';renderAll()"); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.tab") != 'taller' and await pg.evaluate("!window.TALLER") and 'Taller' not in await pg.text_content('#main')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

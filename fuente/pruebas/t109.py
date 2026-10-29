"""Taller completo y catálogo integrado: los nodos N1–N9 y la pasarela salen sin errores de esquema (el bus I2C compartido no cuenta
como pin repetido), el código lleva los pines del esquema, las cajas 3D se generan; el asistente ofrece todos los nodos; desde una
ficha del catálogo «Diseñarlo en el Taller» abre ese nodo ya creado; cada ficha tiene su «Desarrollo» y un estado que se guarda."""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='taller';renderAll()"); await pg.wait_for_timeout(1500)
        ops = await pg.locator('[data-tl="q"][data-k="medir"]').all_inner_texts(); print('qué medir:', len(ops)); assert len(ops) == 10
        # todos los nodos: esquema, código y caja
        res = await pg.evaluate("""(async()=>{const T=window.TALLER,N=T._.NODOS,out={};for(const k of Object.keys(N)){T.crearNodo(k);const d=st.tl.d;
            const av=T.validar(d),cod=(()=>{const s=document.createElement('div');st.tl.v='ficha';s.innerHTML=T.vista();return (s.querySelector('#tl_cod')||{}).textContent||''})();
            st.tl.v='esquema';const h=document.createElement('div');h.innerHTML=T.vista();const m=await T.mallas(d);
            out[k]={malos:av.filter(x=>x[0]==='bad').map(x=>x[1]),avisos:av.length,huecos:(cod.match(/\\{[a-z]+\\}/g)||[]),cod:cod.length,svg:!!h.querySelector('svg.tl-esq'),tris:[m.base.f.length/3,m.tapa.f.length/3],solar:d.energia}}return out})()""")
        for k, v in res.items(): print(k, v)
        for k, v in res.items():
            assert not v['malos'], (k, v['malos'])
            assert not v['huecos'], (k, 'quedan huecos en el código', v['huecos'])
            assert v['svg'] and v['tris'][0] > 100 and v['tris'][1] > 20, k
        assert all(res[k]['cod'] > 500 for k in ['N1', 'N2', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9'])
        assert res['N4']['solar'] == 'solar' and res['N7']['solar'] == 'enchufe'
        cod4 = await pg.evaluate("(()=>{window.TALLER.crearNodo('N4');st.tl.v='ficha';const s=document.createElement('div');s.innerHTML=window.TALLER.vista();return s.querySelector('#tl_cod').textContent})()")
        assert '#define I2C_SDA 41' in cod4 and '#define I2C_SCL 42' in cod4
        # el bus I2C: si SDA y SCL coinciden, sí avisa
        assert await pg.evaluate("(()=>{const d=st.tl.d;d.pines.scl=41;return window.TALLER.validar(d).some(x=>x[0]==='bad'&&x[1].includes('dos veces'))})()")
        # del catálogo al nodo
        await pg.evaluate("st.tl.d=null;st.tab='catalogo';st.cat={q:'hoja',c:null,f:''};renderAll()"); await pg.wait_for_timeout(1500)
        it = pg.locator('#main details.catit:has-text("Nodo casero de clima y hoja")'); await it.locator('summary').click(); await pg.wait_for_timeout(200)
        dev = await it.locator('.catdev').inner_text(); print('desarrollo:', dev[:120]); assert 'LO MONTAS TÚ' in dev.upper()
        await pg.screenshot(path='pruebas/salida/t109-ficha.png', full_page=True)
        await it.locator('[data-tlnuevo="N4"]').click(); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("[st.tab,st.tl.d&&st.tl.d.nodo]") == ['taller', 'N4'] and 'N4 · Clima y hoja' in await pg.text_content('#main')
        await pg.click('[data-tl="v"][data-v="esquema"]'); await pg.wait_for_timeout(300)
        assert 'Sin errores' in await pg.text_content('#main'); await pg.screenshot(path='pruebas/salida/t109-esquema-n4.png', full_page=True)
        # desarrollo de los otros tipos
        await pg.evaluate("st.tl.d=null;st.tab='catalogo';st.cat={q:'',c:null,f:''};renderAll()"); await pg.wait_for_timeout(500)
        tipos = await pg.evaluate("window.CATALOGO.carpetas.flatMap(c=>c.it).map(it=>{const d=document.createElement('div');d.innerHTML=catDev(it);return d.querySelector('b').textContent.replace('Desarrollo · ','')}).reduce((a,t)=>(a[t]=(a[t]||0)+1,a),{})")
        print('tipos de desarrollo:', tipos); assert set(tipos) >= {'Lo montas tú', 'Ya funciona en la app', 'No recomendado ahora', 'Se compra y se conecta', 'Se compra y se integra'}
        # estado de desarrollo
        await pg.evaluate("st.cat={q:'drenaje automatico',c:null,f:'',ab:new Set()};renderMain()"); await pg.wait_for_timeout(300)
        it = pg.locator('#main details.catit').first; await it.locator('summary').click(); await pg.wait_for_timeout(200)
        await it.locator('[data-catest][data-v="montando"]').click(); await pg.wait_for_timeout(300)
        await pg.wait_for_timeout(1200)
        assert await pg.evaluate("st.cfg.labEst['drenaje-automatico-en-la-bandeja']") == 'montando' and await pg.evaluate("st.dirtyCfg") is False, 'se guarda solo'
        assert await pg.evaluate("$('#savebar').hidden"), 'no sale la barra de guardar'
        assert await pg.locator('#main details.catit[open]').count() == 1, 'la ficha sigue abierta'
        await pg.evaluate("st.cat.q='';st.cat.f='dev';renderMain()"); await pg.wait_for_timeout(300)
        assert 'agua' in await pg.evaluate("[...document.querySelectorAll('#main .catf')].filter(b=>b.textContent.includes('1 en desarrollo')).map(b=>b.dataset.catc).join()")
        assert (await pg.evaluate("Store.getConfig().then(c=>c.labEst)"))['drenaje-automatico-en-la-bandeja'] == 'montando'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

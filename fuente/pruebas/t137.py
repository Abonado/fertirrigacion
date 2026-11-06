"""Plaga por foto (v193): «Escanear plaga» → la IA dice qué es, la gravedad y qué hacer; se toca la nave en el plano y se guarda
la incidencia con lo que dijo la IA; en el plano sale el foco (mancha de color), la lista de focos por nave con su riesgo
y desde la incidencia se manda la orden de tratamiento con la nave y la plaga ya puestas."""
import asyncio, sys, os
from playwright.async_api import async_playwright
from PIL import Image
MOCK = open('mock-firebase.js').read()
FOTO = os.path.abspath('pruebas/salida/t137-hoja.jpg'); Image.new('RGB', (64, 48), (60, 140, 60)).save(FOTO)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("""(()=>{window._n=0;window.iaFotoJson=async(pr,bs)=>{window._n++;window._pr=pr;window._nb=bs.length;return {tipo:'plaga',nombre:'Polilla del tomate (Tuta absoluta)',confianza:86,gravedad:'alta',senales:'Galerías blanquecinas en la hoja con excrementos dentro',que:'Quita y saca las hojas con galerías. Refuerza las trampas de feromona.',ma:'Spinosad'}};
          cerrarSplash();st.cab='gas';st.tab='mapa';renderAll()})()"""); await pg.wait_for_timeout(1200)
        await pg.wait_for_selector('#mi_scan', state='attached')
        await pg.set_input_files('#mi_scan', FOTO); await pg.wait_for_timeout(1500)
        N = await pg.evaluate("({ia:st.mNueva.ia,tipo:st.mNueva.tipo,prio:st.mNueva.prio,txt:st.mNueva.txt,adj:st.mNueva.adj.length,x:st.mNueva.x})"); print(N)
        assert await pg.evaluate("window._n") == 1 and await pg.evaluate("window._nb") == 1 and 'tomate' in await pg.evaluate("window._pr")
        assert N['ia']['nombre'].startswith('Polilla') and N['tipo'] == 'plaga' and N['prio'] == 'alta' and N['txt'].startswith('Polilla del tomate') and N['adj'] == 1 and N['x'] is None, N
        t = await pg.text_content('#mform'); assert 'Toca en el plano la nave donde está' in t and 'Seguridad 86 %' in t and 'Qué hacer' in t and 'Fiable' in t, t
        # guardar sin tocar la nave: avisa y no guarda
        await pg.click('[data-act="mi-save"]'); await pg.wait_for_timeout(300); assert await pg.evaluate("st.mNueva!==null")
        # tocar la nave 2 en el plano
        await pg.locator('#mapsvg').scroll_into_view_if_needed()
        xy = await pg.evaluate("""(()=>{const svg=$('#mapsvg'),nv=MAPAS.gas.naves.find(n=>n.n===2),c=nv.c||centro(nv.p),p=svg.createSVGPoint();p.x=c[0]+30;p.y=c[1]+30;const q=p.matrixTransform(svg.getScreenCTM());return [q.x,q.y]})()""")
        await pg.mouse.click(xy[0], xy[1]); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.mNueva.nave") == 2 and await pg.evaluate("!!st.mNueva.ia")
        await pg.click('[data-act="mi-save"]'); await pg.wait_for_timeout(1200)
        i = await pg.evaluate("st.inc[0]"); print({k: i[k] for k in ['tipo', 'prio', 'nave', 'txt']})
        assert i['ia']['nombre'].startswith('Polilla') and i['nave'] == 2 and i['tipo'] == 'plaga' and i['prio'] == 'alta'
        assert await pg.locator('#mapsvg circle.foco').count() == 1
        t = await pg.text_content('#main'); assert 'Focos de plaga y enfermedad' in t and 'Riesgo alto' in t and 'Polilla del tomate' in t
        # detalle: lo que dijo la IA y «Mandar tratamiento»
        assert 'Seguridad 86 %' in await pg.text_content('#mdet')
        await pg.screenshot(path='pruebas/salida/t137-mapa.png', full_page=True)
        await pg.click('#mdet [data-act="plg-trat"]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.tab") == 'otrat'
        f = await pg.evaluate("st.ot.form"); print(f)
        assert f['cab'] == 'gas' and f['nave'] == '2' and f['plaga'].startswith('Polilla') and f['inc'] == i['id'], f
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 420, ancho
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

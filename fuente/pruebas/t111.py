"""Guías de montaje del catálogo: cada ficha que se monta o se instala tiene su guía (pasos con dibujo animado y texto detallado,
materiales con enlace de compra y total, herramientas); las de los aparatos del Taller salen del diseño (un paso por cable); Anterior y
Siguiente cambian el dibujo y el texto sin repintar la página; lo que monta un instalador dice qué pedir; la imagen realista se puede
ocultar y se guarda; «Compartir lista de la compra» lleva todos los materiales."""
import asyncio, sys, base64
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await ctx.route('https://res-prod.buzzy.now/**', lambda r: r.fulfill(content_type='image/png', body=PNG))
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='catalogo';st.cat={q:'',c:null,f:''};renderAll()"); await pg.wait_for_timeout(1500)
        # una guía del Taller: se carga montaje.js y taller.js y sale del diseño
        await pg.evaluate("st.cat.det=catSlug({n:'Nodo casero de clima y hoja'});renderMain()"); await pg.wait_for_timeout(2500)
        assert await pg.locator('[data-mjv]').count() == 1, 'sale la guía'
        n = await pg.evaluate("window.MONTAJE.guia(window.MONTAJE._it(document.querySelector('[data-mjv]').dataset.mjv)).pasos.length"); print('pasos N4:', n)
        ncon = await pg.evaluate("window.TALLER._.NODOS.N4.con.length"); assert n >= ncon + 10, (n, ncon)
        t0 = await pg.text_content('[data-mjo="txt"]'); assert await pg.locator('[data-mjp="-1"]').is_disabled()
        await pg.evaluate("window._marca=document.querySelector('[data-mjv]')")
        for _ in range(7): await pg.click('[data-mjp="1"]')
        await pg.wait_for_timeout(300)
        assert await pg.evaluate("window._marca===document.querySelector('[data-mjv]')"), 'no repinta la página'
        top = await pg.text_content('[data-mjo="top"]'); print('paso 8:', top); assert 'Paso 8 de' in top and 'SHT40' in top
        assert await pg.locator('[data-mjo="st"] .mj-new').count() >= 1 and await pg.locator('[data-mjo="st"] .mj-draw').count() >= 1, 'el cable nuevo se dibuja animado'
        assert await pg.text_content('[data-mjo="txt"]') != t0
        await pg.click('[data-mjp="-1"]'); assert 'Paso 7 de' in await pg.text_content('[data-mjo="top"]')
        w = await pg.evaluate("document.querySelector('[data-mjo=\"dots\"] i').style.width"); assert w.endswith('%')
        await pg.locator('[data-mjv]').scroll_into_view_if_needed(); await pg.screenshot(path='pruebas/salida/t111-guia.png')
        # materiales, total y herramientas
        lk = await pg.eval_on_selector_all('.mj .mj-tab .mj-lk a', "a=>a.map(x=>x.href)"); print('enlaces:', len(lk))
        assert any('Heltec' in x for x in lk) and any('SHT40' in x for x in lk) and any('MLX90614' in x for x in lk) and any('soldador' in x for x in lk)
        tot = await pg.text_content('.mj-tot'); print(tot); assert '€' in tot
        assert await pg.locator('.mj-todo li').count() == n
        # imagen: se ve, y al ocultarla se guarda
        assert await pg.locator('.mj-img img').count() == 1
        await pg.click('[data-mjoculta]'); await pg.wait_for_timeout(1200)
        assert await pg.locator('.mj-img').count() == 0 and 'nodo-casero-de-clima-y-hoja' in (await pg.evaluate("Store.getConfig().then(c=>c.mjOcultas||[])"))
        # compartir lista de la compra
        await pg.evaluate("window._cp='';navigator.share=undefined;Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window._cp=t;return Promise.resolve()}},configurable:true})")
        await pg.click('[data-catcomp]'); await pg.wait_for_timeout(200)
        cp = await pg.evaluate("window._cp"); assert 'Materiales:' in cp and 'Herramientas:' in cp and 'Total orientativo' in cp and 'MLX90614' in cp, cp[:300]
        # el robot: todas sus piezas con enlace
        await pg.evaluate("st.cat.det=catSlug({n:'Robot propio para pasillos'});renderMain()"); await pg.wait_for_timeout(800)
        filas = await pg.evaluate("[...document.querySelectorAll('.mj .catsec')].find(s=>s.textContent.includes('Materiales')).querySelectorAll('tr').length")
        conlk = await pg.evaluate("[...[...document.querySelectorAll('.mj .catsec')].find(s=>s.textContent.includes('Materiales')).querySelectorAll('tr')].filter(r=>r.querySelector('.mj-lk a')).length")
        print('robot materiales:', filas, 'con enlace:', conlk); assert filas >= 15 and conlk >= 15
        await pg.screenshot(path='pruebas/salida/t111-robot.png', full_page=True)
        # lo que monta un instalador
        await pg.evaluate("st.cat.det=catSlug({n:'Nebulización (fog)'});renderMain()"); await pg.wait_for_timeout(500)
        t = await pg.text_content('#main'); assert 'QUÉ PEDIR' in t.upper() and not await pg.locator('[data-mjv]').count()
        # las 100 fichas: ninguna rompe y todas las que se montan o instalan tienen guía
        r = await pg.evaluate("""(()=>{const M=window.MONTAJE,sin=[],mal=[];let g=0,pasos=0;for(const c of window.CATALOGO.carpetas)for(const it of c.it){try{const G=M.guia(it);
            if(!G){if(it.est!=='app'&&it.est!=='no')sin.push(it.n);continue}if(G.pro)continue;g++;pasos+=G.pasos.length;G.pasos.forEach((_,i)=>M.escena(G,i));
            if(!G.mat.length||!G.herr.length)mal.push(it.n);for(const m of G.mat)if(!m.b&&!/€|Gratis/.test(m.p||'')&&m.p!=='—')mal.push(it.n+' · '+m.n)}catch(e){mal.push(it.n+': '+e.message)}}return {sin,mal,g,pasos}})()""")
        print('guías:', r['g'], 'pasos:', r['pasos']); assert not r['sin'] and not r['mal'], r
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

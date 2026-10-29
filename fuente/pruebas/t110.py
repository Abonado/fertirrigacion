"""Catálogo · «Detalles»: cada una de las 100 fichas abre su página con qué es, cómo hacerlo paso a paso, qué necesitas, dónde comprarlo
con enlaces de búsqueda, ojo con, mantenimiento y dónde está en la app; volver deja el catálogo donde estaba; compartir la lista de la
compra; lo no recomendado no ofrece comprar; y si hay ajustes sin guardar, el estado no los guarda a escondidas."""
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
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='catalogo';st.cat={q:'',c:null,f:''};renderAll()"); await pg.wait_for_timeout(1500)
        # las 100 páginas se dibujan con sus apartados
        r = await pg.evaluate("""(()=>{const out=[];for(const c of window.CATALOGO.carpetas)for(const it of c.it){const d=document.createElement('div');d.innerHTML=vCatDet(catSlug(it));
            const h=[...d.querySelectorAll('.catsec h4')].map(x=>x.textContent),D=window.CATALOGO.det[it.n];out.push([it.n,it.est,h,d.querySelectorAll('.catlinks a').length,d.querySelectorAll('ol li').length,D.d[0]!=='—',!!d.querySelector('[data-catcomp]')])}return out})()""")
        assert len(r) == 100
        for n, est, h, links, pasos, compra, comp in r:
            assert 'Qué es' in h and pasos >= 1, (n, h)
            if est in ('app', 'no') or not compra: assert 'Dónde comprarlo' not in h and not comp, n
            else: assert 'Dónde comprarlo' in h and 'Qué necesitas' in h and 'Ojo con' in h and comp, (n, h)
        print('con enlaces de tienda:', sum(1 for x in r if x[3]), 'de', len(r))
        # abrir desde la ficha
        await pg.click('#main .catf[data-catc="clima"]'); await pg.wait_for_timeout(300)
        it = pg.locator('#main details.catit:has-text("Cámara térmica para el móvil")'); await it.locator('summary').click(); await pg.wait_for_timeout(200)
        await it.locator('[data-catdet]').scroll_into_view_if_needed(); y0 = await pg.evaluate("window.scrollY"); assert y0 > 0
        await it.locator('[data-catdet]').click(); await pg.wait_for_timeout(400); assert await pg.evaluate("window.scrollY") == 0
        t = await pg.text_content('#main'); print(t[:300])
        for x in ['Cámara térmica para el móvil', 'En resumen', 'Qué necesitas', 'Dónde comprarlo', 'Ojo con', 'Mantenimiento', 'En la app', 'Desarrollo']: assert x in t, x
        hrefs = await pg.eval_on_selector_all('#main .catlinks a', "a=>a.map(x=>[x.textContent,x.href,x.target])"); print(hrefs)
        assert hrefs[0][1].startswith('https://www.amazon.es/s?k=InfiRay') and all(h[2] == '_blank' for h in hrefs)
        await pg.screenshot(path='pruebas/salida/t110-detalle.png', full_page=True)
        # compartir: sin navigator.share copia al portapapeles
        await pg.evaluate("window._cp='';navigator.share=undefined;Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window._cp=t;return Promise.resolve()}},configurable:true})")
        await pg.click('[data-catcomp]'); await pg.wait_for_timeout(200)
        cp = await pg.evaluate("window._cp"); assert ('Materiales:' in cp and 'Total orientativo' in cp and 'Herramientas:' in cp) or ('Qué necesitas:' in cp and 'Dónde comprarlo:' in cp), cp
        # volver: misma carpeta, ficha abierta y misma altura
        await pg.click('[data-catdet=""]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.cat.det") is None and 'Clima del invernadero' in await pg.text_content('#main .cath')
        assert await pg.locator('#main details.catit[open]:has-text("Cámara térmica")').count() == 1
        yb = await pg.evaluate("window.scrollY"); print('altura', y0, yb); assert abs(yb - y0) < 5
        # lo no recomendado: sin comprar ni estado
        await pg.evaluate("st.cat.det=catSlug({n:'Pulverizar con dron'});renderMain()"); await pg.wait_for_timeout(200)
        t = await pg.text_content('#main'); assert 'Qué hacer en su lugar' in t and 'Por qué no' in t and 'Dónde comprarlo' not in t and not await pg.locator('[data-catcomp]').count()
        # con ajustes sin guardar, el estado no guarda a escondidas
        await pg.evaluate("st.cat.det=catSlug({n:'Garita contra la radiación'});st.cfg.coste={hora:99};st.dirtyCfg=true;renderMain();renderSave()"); await pg.wait_for_timeout(200)
        await pg.click('#main [data-catest][data-v="comprado"]'); await pg.wait_for_timeout(800)
        assert await pg.evaluate("st.dirtyCfg") is True and not await pg.evaluate("$('#savebar').hidden")
        assert not ((await pg.evaluate("Store.getConfig().then(c=>c.labEst||{})")).get('garita-contra-la-radiacion'))
        assert 'COMPRADO' in (await pg.text_content('#main .catpills')).upper()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

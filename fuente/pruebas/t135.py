"""Coste de mano de obra (v191): total, por día, €/kg, en qué labor se va el dinero, por nave y coste de cada día.
Precio general y precio distinto por persona; las horas de jornada que no están en ningún trabajo salen como «Sin labor apuntada»."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
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
        # Día 1: a y b 8 h. Recolectar nave 2 con h=6 (los dos) → sobran 2 h a cada uno sin labor. Día 2 (ayer): solo a, 8 h destallando la nave 3.
        await pg.evaluate("""(()=>{st.collas=[{id:'c1',nombre:'Colla Pepe',finca:'pinta',miembros:[{id:'a',n:'Ana Ruiz',activo:true},{id:'b',n:'Mustafa El Amrani',activo:true}]}];st.jorDias=999;
          const y=new Date();y.setDate(y.getDate()-1);const ay=isoD(y);
          const g={a:{e:'pre',ent:'08:00',sal:'16:30'},b:{e:'pre',ent:'08:00',sal:'16:30'}};
          st.jor={j1:{id:'j1',colla:'c1',collaNombre:'Colla Pepe',fecha:hoy(),pau:30,gente:g,trabajos:[{labor:'recolectar',cab:'gas',nave:2,kg:1200,h:6}]},
                  j2:{id:'j2',colla:'c1',collaNombre:'Colla Pepe',fecha:ay,pau:30,gente:{a:{e:'pre',ent:'08:00',sal:'16:30'}},trabajos:[{labor:'destallar',cab:'gas',nave:3}]}};
          cerrarSplash();st.finca='pinta';st.co.per='7';st.tab='corend';renderAll()})()"""); await pg.wait_for_timeout(800)
        card = pg.locator('#co_coste')
        assert await card.count() == 1
        assert 'Pon el coste de la hora' in await card.text_content()
        await pg.fill('#co_precio', '10'); await pg.locator('#co_precio').dispatch_event('change'); await pg.wait_for_timeout(400)
        t = await card.text_content(); print(t)
        # 16 h día 1 + 8 h día 2 = 24 h × 10 = 240 €
        assert 'TOTAL\n240 €' in t.upper().replace('\t', '\n') or '240 €' in t, 'total 240 €'
        assert '120 €' in t, 'por día: 240 € / 2 días'
        assert '0,20 €' in t, 'cada kilo: 240 / 1200'
        assert 'Sin labor apuntada' in t and '40 €' in t, '2 h × 2 personas sin labor = 40 €'
        assert 'Recolectar' in t and '50 % · 12,0 h' in t, 'recolectar 120 € = 50 %'
        assert 'Destallar' in t and '80 €' in t
        assert await pg.locator('#co_coste .codia rect').count() == 7, 'una columna por día de los 7'
        # precio distinto para Mustafa: 14 €/h → día 1: Ana 8×10 + Mustafa 8×14 = 192; día 2: 80 → 272
        await pg.click('#co_coste .coph summary')
        await pg.fill('#coph_b', '14'); await pg.locator('#coph_b').dispatch_event('change'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.cfg.coste.ph.b") == 14 and await pg.evaluate("st.dirtyCfg") is True
        t = await card.text_content()
        assert '272 €' in t, t
        assert 'precios de cada uno' in t
        # la tabla por nave usa también los precios de cada uno: nave 2 = 6×10 + 6×14 = 144 €
        tab = await pg.evaluate("[...document.querySelectorAll('#main table.rendt')].find(t=>t.textContent.includes('€/kg')).innerText"); print(tab)
        assert 'nave 2\t12,0\t144 €' in tab.lower()
        # se guarda en la configuración
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500)
        c = await pg.evaluate("Store.getConfig().then(c=>c.coste)"); assert c['hora'] == 10 and c['ph']['b'] == 14, c
        # sin precio general pero con el de Mustafa: avisa de las horas sin precio
        await pg.fill('#co_precio', ''); await pg.locator('#co_precio').dispatch_event('change'); await pg.wait_for_timeout(400)
        assert 'sin precio' in await card.text_content()
        # no se sale por los lados en el móvil
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 420, ancho
        await pg.fill('#co_precio', '10'); await pg.locator('#co_precio').dispatch_event('change'); await pg.wait_for_timeout(400)
        await card.screenshot(path='pruebas/salida/t135-coste.png')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

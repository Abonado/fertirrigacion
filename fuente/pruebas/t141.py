"""Almacén (v202): el stock es una tabla sencilla — abono, lo que queda en kilos o litros bien grande con los sacos al lado,
y lo gastado este mes —; el mínimo y el tamaño del saco van aparte; el gasto por cabezal separa lo de cada zona con su total;
y «Imprimir hoja» saca solo el stock y el gasto por cabezal en una hoja."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def abrir(b, w, h):
    ctx = await b.new_context(service_workers='block', viewport={'width': w, 'height': h}, locale='es-ES', timezone_id='Europe/Madrid')
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
    await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
    await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
    await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
    await pg.reload(); await pg.wait_for_timeout(600)
    await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
    # kno3: 412,5 kg; k2so4: 60 kg con mínimo 100 → pedir; mkp: 50 kg y gasta 10/día → pocos días; kcl sin nada
    # Cuentas de este mes: Gasolinera 20 kg de kno3 y 5 de mkp; Planos 10 kg de kno3. Una de hace 40 días no cuenta.
    await pg.evaluate("""(()=>{cerrarSplash();st.finca='pinta';st.cab='gas';const a=almAct(),d=n=>{const x=new Date();x.setDate(x.getDate()-n);return isoD(x)};
      st.alm=[{p:'kno3',tipo:'entrada',qty:712.5,fecha:d(29),alm:a,ts:'1'},{p:'kno3',tipo:'salida',qty:-300,fecha:d(5),alm:a,ts:'2'},
              {p:'k2so4',tipo:'entrada',qty:60,fecha:d(10),alm:a,ts:'3'},{p:'mkp',tipo:'entrada',qty:350,fecha:d(20),alm:a,ts:'4'},{p:'mkp',tipo:'salida',qty:-300,fecha:d(3),alm:a,ts:'5'}];
      st.hist=[{fecha:hoy(),m3:{gas:5,pla:3},resumen:{gas:{kg:{kno3:20,mkp:5}},pla:{kg:{kno3:10}}}},{fecha:d(40),m3:{gas:5},resumen:{gas:{kg:{kno3:999}}}}];
      st.cfg.stockMin[a+'|k2so4']=100;st.tab='almacen';renderAll()})()"""); await pg.wait_for_timeout(800)
    return pg, errs, ctx
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg, errs, ctx = await abrir(b, 1280, 900)
        assert await pg.evaluate("almById(almAct()).cabezales.join()") == 'gas,pla', 'Gasolinera y Planos comparten almacén'
        orden = await pg.evaluate("[...document.querySelectorAll('.stt tr[data-stk]')].map(f=>f.dataset.stk)"); print(orden)
        assert orden[0] == 'k2so4' and orden[1] == 'mkp', 'lo urgente arriba'
        kn = await pg.text_content('[data-stk="kno3"]'); print(kn)
        # lo que queda: kilos en grande y los sacos al lado; lo gastado este mes, de las cuentas (20 + 10)
        assert await pg.text_content('[data-stk="kno3"] .stq') == '412,5 kg'
        assert '16 sacos + 12,5 kg' in await pg.text_content('[data-stk="kno3"] .sts')
        assert '30,0 kg' in await pg.text_content('[data-stk="kno3"] td.g'), 'gastado este mes = 20 + 10, sin la de hace 40 días'
        assert len(orden) == 3 and 'Ácido nítrico' in await pg.text_content('.stnd'), 'lo que no hay ni se gasta va en una línea aparte'
        assert 'Pedir' in await pg.text_content('[data-stk="k2so4"]') and 'Pocos días' in await pg.text_content('[data-stk="mkp"]')
        th = await pg.evaluate("[...document.querySelectorAll('.stt th')].map(x=>x.textContent)"); print(th)
        assert th[0] == 'Abono' and th[1] == 'Queda' and th[2].startswith('Gastado en')
        # sin casillas dentro del stock: el mínimo y el saco están aparte
        assert await pg.locator('.stt input').count() == 0
        assert not await pg.is_visible('#mn_kno3'), 'el apartado de mínimos empieza cerrado'
        await pg.click('details[data-saj] summary'); await pg.wait_for_timeout(200)
        await pg.fill('#mn_kno3', '500'); await pg.locator('#mn_kno3').dispatch_event('change'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("stockRow('kno3').k") == 'bad'
        await pg.fill('#sz_kno3', '50'); await pg.locator('#sz_kno3').dispatch_event('change'); await pg.wait_for_timeout(400)
        await pg.evaluate("st.tab='almacen';renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.is_visible('#mn_kno3'), 'el apartado sigue abierto al volver a pintar'
        assert '8 sacos + 12,5 kg' in await pg.text_content('[data-stk="kno3"] .sts'), 'sacos de 50 kg'
        assert 'mínimo 500 kg' in await pg.text_content('[data-stk="kno3"]')
        # gasto por cabezal: una columna por zona y el total
        cols = await pg.evaluate("[...document.querySelectorAll('.gct th[data-gc]')].map(x=>x.dataset.gc)"); assert cols == ['gas', 'pla'], cols
        fk = await pg.evaluate("[...document.querySelectorAll('.gct tr[data-gp=\"kno3\"] td')].map(x=>x.textContent.trim())"); print(fk)
        assert fk[1].startswith('20,0 kg') and '67 %' in fk[1] and fk[2].startswith('10,0 kg') and fk[3] == '30,0 kg', fk
        fm = await pg.evaluate("[...document.querySelectorAll('.gct tr[data-gp=\"mkp\"] td')].map(x=>x.textContent.trim())"); assert fm[2] == '—' and fm[3].startswith('5,0 kg'), fm
        assert 'noviembre' in (await pg.text_content('.gcab .sub')) or 'en ' in (await pg.text_content('.gcab .sub'))
        await pg.click('[data-aper="7"]'); await pg.wait_for_timeout(200); assert 'últimos 7 días' in await pg.text_content('.gcab .sub')
        await pg.click('[data-aper="mes"]'); await pg.wait_for_timeout(200)
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 1280, ancho
        await pg.locator('.stock').screenshot(path='pruebas/salida/t141-pc.png')
        # imprimir: solo la cabecera, el stock y el gasto por cabezal
        await pg.evaluate("()=>{window.print=()=>{window.__imp=(window.__imp||0)+1}}")
        await pg.click('[data-act="alm-print"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("window.__imp") == 1
        assert 'Almacén' in await pg.text_content('#printhead')
        await pg.emulate_media(media='print'); await pg.wait_for_timeout(200)
        vis = await pg.evaluate("""[...document.querySelectorAll('#main section')].filter(e=>e.offsetParent!==null).map(e=>(e.querySelector('h3')||{}).textContent||e.className)"""); print(vis)
        assert vis == ['Stock', 'Gasto por cabezal', 'Gasto por día'], vis
        assert not await pg.is_visible('[data-act="alm-print"]') and not await pg.is_visible('[data-aper="7"]')
        await pg.pdf(path='pruebas/salida/t141-hoja.pdf', format='A4')
        await pg.emulate_media(media='screen')
        e1 = list(errs); await ctx.close()
        # móvil: cabe sin salirse
        pg, errs, ctx = await abrir(b, 390, 860)
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 390, ancho
        anchoT = await pg.evaluate("document.querySelector('.stt').getBoundingClientRect().width<=document.querySelector('.stock').getBoundingClientRect().width"); assert anchoT, 'la tabla del stock cabe en el móvil'
        await pg.locator('.stock').screenshot(path='pruebas/salida/t141-movil.png')
        await pg.locator('.gcab').screenshot(path='pruebas/salida/t141-cabezal.png')
        print('errs', e1 + errs); await b.close(); sys.exit(1 if e1 or errs else 0)
asyncio.run(main())

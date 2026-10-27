"""Riego → Mapa de la finca → Instalación: primero el mapa de toda la finca y al tocar un cabezal se abre su zona; sectores por pasillo
(una nave con pasillos de dos sectores), elementos en su pasillo (electroválvula, bandeja de drenaje enlazada…), presiones del cabezal
(PC, bomba de abono, by-pass, pared, entrada y salida) por sector con su rango y pérdida en filtros, incidencia apuntada desde un
elemento, y que todo se guarda. Esquema por sectores si el cabezal no tiene plano."""
import asyncio, sys, json
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 1300, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(400)
        tabs = await pg.evaluate("[...document.querySelectorAll('#tabs .tab')].map(b=>b.textContent)"); print('pestañas:', tabs)
        assert tabs.index('Cálculo del aforo') == tabs.index('Receta') + 1 and tabs.index('Mapa de la finca') == tabs.index('Cálculo del aforo') + 1, 'aforo y mapa de la finca van después de receta'
        await pg.click('#tabs .tab:has-text("Mapa de la finca")'); await pg.wait_for_timeout(500); await pg.click('.mfsel [data-tab="instal"]'); await pg.wait_for_timeout(500)
        # 1. primero, toda la finca; al tocar un cabezal se abre su zona
        assert await pg.locator('#infsvg').count() == 1 and await pg.locator('#infsvg [data-incab]').count() == 3
        await pg.screenshot(path='pruebas/salida/t93-finca.png')
        await pg.locator('#infsvg [data-incab="gas"]').dispatch_event('click'); await pg.wait_for_timeout(400)
        assert await pg.locator('#insvg').count() == 1 and 'Gasolinera' in await pg.text_content('#main h3')
        clic = """((x,y)=>{const s=$('#insvg'),p=s.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(s.getScreenCTM());s.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:q.x,clientY:q.y}))})"""
        async def toca(pt): await pg.evaluate(f"({clic})({pt[0]},{pt[1]})"); await pg.wait_for_timeout(250)
        async def pasillo(cab, nave, num): return await pg.evaluate(f"(()=>{{const nv=MAPAS['{cab}'].naves.find(n=>n.n=={nave});const f=inFranjas('{cab}',nv).find(f=>f.num=={num});const pts=pasLineas('{cab}',nv).find(l=>l.num=={num});return lerp(pts.p1,pts.p2,.5)}})()")
        s3, s4 = await pg.evaluate("cabById('gas').sectores.map(s=>s.id)")
        # 2. sectores: la nave 1 entera al sector 3 y su pasillo 3 al sector 4
        await pg.click('[data-inact="modo"][data-v="sect"]'); await pg.click(f'[data-inact="sec"][data-v="{s3}"]'); await pg.click('[data-inact="secpor"][data-v="nave"]')
        await toca(await pasillo('gas', 1, 5))
        await pg.click(f'[data-inact="sec"][data-v="{s4}"]'); await pg.click('[data-inact="secpor"][data-v="pas"]')
        await toca(await pasillo('gas', 1, 3))
        sec = await pg.evaluate("(()=>{const I=inCfg('gas');return [inSid(I,1,1),inSid(I,1,3),inSid(I,1,5),inSid(I,2,1)]})()"); print('sectores nave 1 (p1, p3, p5) y nave 2:', sec)
        assert sec == [s3, s4, s3, None]
        await toca(await pasillo('gas', 1, 3)); assert await pg.evaluate("inSid(inCfg('gas'),1,3)") == s3, 'tocar otra vez lo deja como el resto de la nave'
        await toca(await pasillo('gas', 1, 3))
        # 3. elementos en su pasillo: electroválvula y bandeja de drenaje enlazada
        await pg.click('[data-inact="modo"][data-v="poner"]'); await pg.click('[data-inact="tipo"][data-v="ev"]'); await toca(await pasillo('gas', 1, 3))
        ev = await pg.evaluate("inCfg('gas').el[0]"); print('electroválvula:', {k: ev[k] for k in ('n', 'sid', 'nave', 'pas')}); assert ev['sid'] == s4 and ev['nave'] == 1 and ev['pas'] == 3
        await pg.click('[data-inact="tipo"][data-v="bdj"]'); await toca(await pasillo('gas', 1, 6))
        bj = await pg.evaluate("cabById('gas').sectores[0].bandejas[0]")
        await pg.select_option('#ie_b', bj['id']); await pg.wait_for_timeout(300)
        bd = await pg.evaluate("inCfg('gas').el[1]"); print('bandeja:', bd['n'], bd['bj']); assert bd['t'] == 'bdj' and bd['bj'] == bj['id'] and bd['n'] == bj['nombre']
        await pg.evaluate(f"st.reg.min['{s3}']=120;st.reg.dren['{bj['id']}']=8000;renderMain()"); await pg.wait_for_timeout(200)
        assert '%' in await pg.text_content(f'#insvg [data-inel="{bd["id"]}"]'), 'la bandeja enseña su % de drenaje en el mapa'
        await pg.click('[data-inact="modo"][data-v="ver"]')
        # 4. presiones del cabezal por sector, con su rango y la pérdida en filtros
        pid = await pg.evaluate("Object.fromEntries(inCfg('gas').pts.map(p=>[p.n,p.id]))")
        await pg.fill(f'[data-incp="min"][data-id="{pid["PC"]}"]', '3'); await pg.locator(f'[data-incp="min"][data-id="{pid["PC"]}"]').dispatch_event('change')
        await pg.fill(f'[data-incp="max"][data-id="{pid["PC"]}"]', '4'); await pg.locator(f'[data-incp="max"][data-id="{pid["PC"]}"]').dispatch_event('change'); await pg.wait_for_timeout(200)
        for nombre, sid, v in [('PC', s3, '3,5'), ('PC', s4, '4,6'), ('Entrada', s3, '2,4'), ('Salida', s3, '1,7'), ('Entrada', s4, '2,4'), ('Salida', s4, '2,2')]:
            await pg.fill(f'[data-inp="{pid[nombre]}@{sid}"]', v)
        await pg.wait_for_timeout(300)
        t3 = await pg.text_content(f'[data-out="indif_{s3}"]'); t4 = await pg.text_content(f'[data-out="indif_{s4}"]'); print('filtros S3:', t3, '| S4:', t4)
        assert '0,7 bar' in t3 and 'limpiar' in t3 and '0,2 bar' in t4 and 'Normal' in t4
        assert 'Fuera de lo normal' in await pg.text_content(f'[data-out="inu_{pid["PC"]}@{s4}"]') and 'Bien' in await pg.text_content(f'[data-out="inu_{pid["PC"]}@{s3}"]')
        assert await pg.evaluate("inAlertas('gas')") == 1
        await pg.screenshot(path='pruebas/salida/t93-instal-pc.png', full_page=True)
        # 5. incidencia desde la electroválvula
        await pg.click(f'[data-inact="ver"][data-id="{ev["id"]}"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-inact="incid"]'); await pg.wait_for_timeout(500)
        n = await pg.evaluate("[st.tab,st.mNueva&&st.mNueva.nave,st.mNueva&&st.mNueva.pasillo,st.mNueva&&st.mNueva.el,st.mNueva&&st.mNueva.tipo]"); print('incidencia nueva:', n)
        assert n == ['mapa', 1, 3, ev['id'], 'riego']
        await pg.evaluate("st.mNueva.txt+='no abre';miGuardar()"); await pg.wait_for_timeout(1500)
        i = await pg.evaluate("Store.listCol('incidencias',10).then(l=>l[0])"); print('incidencia guardada:', i['txt'], i['nave'], i['pasillo'], i.get('el'))
        assert i['el'] == ev['id'] and i['nave'] == 1 and i['pasillo'] == 3 and 'no abre' in i['txt']
        await pg.evaluate("st.tab='instal';renderAll()"); await pg.wait_for_timeout(400)
        await pg.click(f'[data-inact="ver"][data-id="{ev["id"]}"]'); await pg.wait_for_timeout(300)
        assert 'no abre' in await pg.text_content('#main .inel .ininc') and '!' in await pg.text_content(f'#insvg [data-inel="{ev["id"]}"]')
        # 6. se guarda todo
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500); await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1800)
        c = await pg.evaluate("Store.getConfig().then(c=>c.inst.gas)"); print('guardado:', [x['n'] for x in c['el']], '· naves', c['naves'], '· pasillos', c['pas'])
        assert len(c['el']) == 2 and c['naves'] == {'1': s3} and c['pas'].get('1:3') == s4
        r = await pg.evaluate("Store.getReg(st.fecha).then(r=>r.pre)"); assert r[f'{pid["PC"]}@{s4}'] == 4.6 and r[f'{pid["Salida"]}@{s3}'] == 1.7
        # 7. Planos: su plano con pasillos; volver al mapa de la finca
        await pg.click('[data-inact="finca"]'); await pg.wait_for_timeout(300); assert await pg.locator('#infsvg').count() == 1
        await pg.click('[data-inact="abrir"][data-cab="pla"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.cab") == 'pla' and await pg.locator('#insvg line').count() > 10
        # 8. cabezal sin plano: esquema con un recuadro por sector
        z = await pg.evaluate("(()=>{const k=st.cfg.cabezales.find(c=>!MAPAS[c.id]);if(!k)return null;const Z=inZonas(k.id);inSVG(k.id);return [k.id,Z.zonas.length,k.sectores.length]})()"); print('sin plano:', z)
        if z: assert z[1] == z[2]
        # 9. móvil
        await pg.evaluate("st.cab='gas';st.in.vista='cab';renderAll()"); await pg.set_viewport_size({'width': 430, 'height': 900}); await pg.wait_for_timeout(300)
        await pg.screenshot(path='pruebas/salida/t93-instal-movil.png', full_page=True)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

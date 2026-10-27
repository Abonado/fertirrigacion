"""Riego → Instalación y sensores: naves de cada sector, poner electroválvulas y manómetros en el mapa, presiones del cabezal
(PC, bomba de abono, by-pass, pared, entrada y salida) con su rango y la pérdida en filtros, presiones del campo por sector,
y que todo se guarda (la instalación en los ajustes y las presiones con el día). Esquema por sectores si el cabezal no tiene plano."""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='drenaje';renderAll()"); await pg.wait_for_timeout(400)
        await pg.click('#tabs [data-tab="instal"]'); await pg.wait_for_timeout(500)
        assert await pg.locator('#insvg').count() == 1
        pts = await pg.evaluate("inCfg('gas').pts.map(p=>p.n)"); print('puntos del cabezal:', pts)
        assert pts == ['PC', 'Bomba de abono', 'By-pass', 'Pared', 'Entrada', 'Salida']
        clic = """((x,y)=>{const s=$('#insvg'),p=s.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(s.getScreenCTM());s.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:q.x,clientY:q.y}))})"""
        async def toca(x, y): await pg.evaluate(f"({clic})({x},{y})"); await pg.wait_for_timeout(250)
        centros = await pg.evaluate("Object.fromEntries(MAPAS.gas.naves.map(n=>[n.n,n.c||centro(n.p)]))")
        s3, s4 = await pg.evaluate("cabById('gas').sectores.map(s=>s.id)")
        # 1. naves de cada sector
        await pg.click('[data-inact="modo"][data-v="naves"]'); await pg.wait_for_timeout(200)
        await pg.click(f'[data-inact="sec"][data-v="{s3}"]')
        for n in (1, 2, 3): await toca(*centros[str(n)])
        await pg.click(f'[data-inact="sec"][data-v="{s4}"]')
        for n in (4, 5, 6): await toca(*centros[str(n)])
        nv = await pg.evaluate("inCfg('gas').naves"); print('naves:', nv); assert nv == {'1': s3, '2': s3, '3': s3, '4': s4, '5': s4, '6': s4}
        await toca(*centros['6']); assert '6' not in await pg.evaluate("inCfg('gas').naves"), 'tocar otra vez quita la nave'
        await toca(*centros['6'])
        # 2. poner una electroválvula y un manómetro
        await pg.click('[data-inact="modo"][data-v="poner"]'); await pg.click('[data-inact="tipo"][data-v="ev"]'); await toca(*centros['2'])
        ev = await pg.evaluate("inCfg('gas').el[0]"); print('electroválvula:', ev['n'], ev['sid']); assert ev['t'] == 'ev' and ev['sid'] == s3
        await pg.fill('#ie_n', 'EV sector 3'); await pg.locator('#ie_n').dispatch_event('change'); await pg.wait_for_timeout(200)
        await pg.click('[data-inact="tipo"][data-v="man"]'); await toca(*centros['5'])
        man = await pg.evaluate("inCfg('gas').el[1]"); assert man['t'] == 'man' and man['sid'] == s4
        await pg.fill('#ie_mi', '1,5'); await pg.locator('#ie_mi').dispatch_event('change'); await pg.fill('#ie_ma', '2,5'); await pg.locator('#ie_ma').dispatch_event('change'); await pg.wait_for_timeout(200)
        await pg.click('[data-inact="tipo"][data-v="sen"]'); await toca(*centros['4'])
        await pg.click('[data-inact="modo"][data-v="ver"]'); await pg.wait_for_timeout(200)
        # 3. presiones del cabezal con rango y pérdida en filtros
        pid = await pg.evaluate("Object.fromEntries(inCfg('gas').pts.map(p=>[p.n,p.id]))")
        await pg.fill(f'[data-incp="min"][data-id="{pid["PC"]}"]', '3'); await pg.locator(f'[data-incp="min"][data-id="{pid["PC"]}"]').dispatch_event('change')
        await pg.fill(f'[data-incp="max"][data-id="{pid["PC"]}"]', '4'); await pg.locator(f'[data-incp="max"][data-id="{pid["PC"]}"]').dispatch_event('change'); await pg.wait_for_timeout(200)
        await pg.fill(f'#inp_{pid["PC"]}', '4,6'); await pg.fill(f'#inp_{pid["Entrada"]}', '2,4'); await pg.fill(f'#inp_{pid["Salida"]}', '1,7'); await pg.wait_for_timeout(300)
        t = await pg.text_content('[data-out="indif"]'); print('filtros:', t); assert '0,7 bar' in t and 'limpiar' in t
        assert 'Fuera de lo normal' in await pg.text_content(f'[data-out="inu_{pid["PC"]}"]')
        # 4. presión del campo fuera de rango → rojo en el mapa
        await pg.locator(f'#main .insec input[data-inp="{man["id"]}"]').fill('3'); await pg.wait_for_timeout(300)
        assert 'Fuera de lo normal' in await pg.locator(f'#main .insec [data-out="inu_{man["id"]}"]').text_content()
        assert await pg.evaluate(f"$('#insvg [data-inel=\"{man['id']}\"] circle:nth-of-type(2)').getAttribute('stroke')") == '#c0392b'
        assert '1' in await pg.text_content('#insvg .incab'), 'el cabezal avisa de los puntos fuera de rango'
        await pg.screenshot(path='pruebas/salida/t93-instal-pc.png', full_page=True)
        # 5. se guarda: la instalación en los ajustes y las presiones con el día
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500); await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1800)
        c = await pg.evaluate("Store.getConfig().then(c=>c.inst.gas)"); print('guardado: elementos', [x['n'] for x in c['el']], '· naves', len(c['naves']))
        assert len(c['el']) == 3 and c['el'][0]['n'] == 'EV sector 3' and c['el'][1]['min'] == 1.5 and len(c['naves']) == 6
        r = await pg.evaluate("Store.getReg(st.fecha).then(r=>r.pre)"); print('presiones del día:', r)
        assert r[pid['PC']] == 4.6 and r[pid['Entrada']] == 2.4 and r[man['id']] == 3
        # 6. abrir un elemento desde la lista
        await pg.click(f'[data-inact="ver"][data-id="{ev["id"]}"]'); await pg.wait_for_timeout(300)
        assert 'EV sector 3' in await pg.text_content('#main .inel h3')
        # 7. cabezal sin plano: esquema con un recuadro por sector
        z = await pg.evaluate("(()=>{const k=st.cfg.cabezales.find(c=>!MAPAS[c.id]);if(!k)return null;const Z=inZonas(k.id);inSVG(k.id);return [k.id,Z.zonas.length,k.sectores.length]})()"); print('sin plano:', z)
        if z: assert z[1] == z[2]
        # 8. móvil
        await pg.set_viewport_size({'width': 430, 'height': 900}); await pg.wait_for_timeout(300)
        await pg.screenshot(path='pruebas/salida/t93-instal-movil.png', full_page=True)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

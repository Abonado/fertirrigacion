"""v219: en Rellenar depósito se ven los llenados y medidas de los últimos 30 días y se pueden modificar: se reescribe el mismo
registro (no se duplica) y se rehace lo descontado del almacén, con las cantidades de aquel día escaladas a los cm nuevos."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 400, 'height': 860}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='rellenar';renderAll()"); await pg.wait_for_timeout(500)
        B = await pg.evaluate("st.fillB[st.cab]")
        hace = lambda d: f"isoD(new Date(Date.now()-{d}*864e5))"
        # tres llenados: hace 3, 20 y 40 días (este no sale)
        for d, h in [(3, '08:00'), (20, '09:00'), (40, '10:00')]:
            await pg.evaluate(f"lfOpen('llenado');st.lf.fecha={hace(d)};st.lf.add=20;st.lf.hora='{h}';st.lf.desc=true;st.lf.igual=true;st.lf.dupOk=true")
            await pg.evaluate("lfSave()"); await pg.wait_for_timeout(700)
        n0 = await pg.evaluate("st.llen.length"); a0 = await pg.evaluate("st.alm.length")
        t = await pg.text_content('#main')
        assert 'últimos 30 días' in t.lower() and await pg.locator('[data-act="ll-edit"]').count() == 2, await pg.locator('[data-act="ll-edit"]').count()
        # modificar el de hace 20 días: de 20 a 30 cm y otra hora
        e = await pg.evaluate(f"st.llen.find(x=>x.fecha==={hace(20)})")
        q0 = e['cantidades']
        await pg.click(f'[data-act="ll-edit"][data-id="{e["id"]}"]'); await pg.wait_for_timeout(400)
        assert 'Modificar llenado' in await pg.text_content('.panel')
        assert await pg.input_value('#lf_add') in ('20', '20,0')
        await pg.fill('#lf_add', '30'); await pg.dispatch_event('#lf_add', 'input'); await pg.dispatch_event('#lf_add', 'change')
        await pg.fill('#lf_hora', '11:15'); await pg.dispatch_event('#lf_hora', 'change'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="lf-save"]'); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("st.llen.length") == n0                        # no se duplica
        e2 = await pg.evaluate(f"st.llen.find(x=>x.id==='{e['id']}')")
        assert e2['cmAdd'] == 30 and e2['hora'] == '11:15' and e2['fecha'] == e['fecha'] and e2.get('editado'), e2
        for p_, q in q0.items(): assert abs(e2['cantidades'][p_] - q * 1.5) < 0.02, (p_, q, e2['cantidades'])
        # el almacén: mismas salidas (no se duplican) con las cantidades nuevas
        M = await pg.evaluate(f"st.alm.filter(m=>m.llenado==='{e['id']}').map(m=>[m.p,m.qty])")
        assert len(M) == len(q0) and all(abs(-q - e2['cantidades'][p_]) < 0.02 for p_, q in M), M
        assert await pg.evaluate("st.alm.length") == a0
        # modificar quitando «descontar del almacén»: se quitan sus salidas
        await pg.click(f'[data-act="ll-edit"][data-id="{e["id"]}"]'); await pg.wait_for_timeout(400)
        await pg.uncheck('#lf_desc'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="lf-save"]'); await pg.wait_for_timeout(1200)
        assert await pg.evaluate(f"st.alm.filter(m=>m.llenado==='{e['id']}').length") == 0
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

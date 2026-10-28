"""Mapa de la finca → Plagas: con el clima de los días (máxima y mínima) y las trampas, la app pone el riesgo por nave de Tuta,
araña roja, Botrytis, cambio de color del fruto y virosis; fecha la siguiente generación con grados-día desde la primera captura,
guarda los conteos en el día y los umbrales se pueden cambiar."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
SIM = """(()=>{const H=[];for(let i=1;i<=21;i++){const f=plAdd(st.fecha,-i),cl={},tr={};
  cl['gas:n2']={ta:29,hr:35,tmax:31,tmin:17,h32:0,h90:1,h:[30,30.2]};cl['gas:n4']={ta:22,hr:85,tmax:26,tmin:13,h90:i<=3?9:2,h:[21,21.5]};
  if(i===20)tr['gas:n2']={tuta:3};if(i===14)tr['gas:n2']={tuta:8,mb:12,tri:4};if(i===7)tr['gas:n2']={tuta:14,mb:15,tri:5,ara:1};
  if(i===7)tr['gas:n4']={mb:25,tri:20,col:4};if(i===14)tr['gas:n4']={mb:10,tri:6};
  H.push({fecha:f,clima:cl,trampa:tr})}st.hist=H;
  st.reg.clima={'gas:n2':{ta:30,hr:30,tmax:33,tmin:18,h32:1,h:[31.5,31]},'gas:n4':{ta:21,hr:88,tmax:25,tmin:13,h90:10,h:[20,20.4]}};renderMain()})()"""
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
        assert await pg.evaluate("[plSem('2026-10-28'),plSem('2026-01-01'),plSem('2026-12-31')]") == [44, 1, 53]
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(300)
        await pg.click('#tabs .tab:has-text("Mapa de la finca")'); await pg.wait_for_timeout(300); await pg.click('.mfsel [data-tab="plagas"]'); await pg.wait_for_timeout(1500)
        assert 'Plagas · ' in await pg.text_content('#main h3')
        await pg.evaluate(SIM); await pg.wait_for_timeout(300)
        # nave 2: se apuntan las trampas de hoy desde la pantalla
        await pg.locator('#plsvg [data-plz="n2"]').dispatch_event('click'); await pg.wait_for_timeout(300)
        for k, v in [('tuta', '35'), ('mb', '22'), ('tri', '6')]: await pg.fill(f'#pl_{k}', v)
        await pg.click('[data-plara="1"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.reg.trampa['gas:n2']") == {'tuta': 35, 'mb': 22, 'tri': 6, 'ara': 1}
        R = {r['id']: r for r in await pg.evaluate("plRiesgos('gas',esZonas('gas').zs.find(z=>z.k==='n2'))")}
        for r in R.values(): print('nave 2 ·', r['t'], r['n'], '|', r['m'], '|', r['p'])
        # Tuta: 8 oct → 28 oct, 20 días a 24 °C de media (16,2 grados-día) + hoy 25,5 °C = 342; faltan 136 → ~8 días
        assert R['tuta']['n'] == 2 and '342 grados-día' in R['tuta']['p'] and 'semana 45' in R['tuta']['p']
        assert R['ara']['n'] == 2 and 'semana 45' in R['ara']['p'] and R['bot']['n'] == 0 and R['col']['n'] == 1 and R['vir']['n'] == 1
        assert await pg.locator('#plsvg [data-plz="n2"] polygon').get_attribute('fill') == '#c0392b'
        # nave 4: húmeda → Botrytis; muchas moscas y trips → virosis; frutos con mal color
        await pg.locator('#plsvg [data-plz="n4"]').dispatch_event('click'); await pg.wait_for_timeout(300)
        for k, v in [('mb', '70'), ('tri', '45'), ('col', '12'), ('vir', '2')]: await pg.fill(f'#pl_{k}', v)
        await pg.wait_for_timeout(400)
        R4 = {r['id']: r for r in await pg.evaluate("plRiesgos('gas',esZonas('gas').zs.find(z=>z.k==='n4'))")}
        for r in R4.values(): print('nave 4 ·', r['t'], r['n'], '|', r['m'])
        assert R4['bot']['n'] == 2 and R4['vir']['n'] == 2 and R4['col']['n'] == 2 and R4['ara']['n'] == 0 and R4['tuta']['n'] == 0
        assert 'pon una trampa de feromona' in R4['tuta']['m'] and '0 de 7 días' in R4['ara']['m'], 'nave húmeda: no cuenta como aire seco'
        assert '2' in (await pg.locator('.mfsel [data-tab="plagas"]').inner_text()), 'el selector cuenta las naves en rojo'
        await pg.screenshot(path='pruebas/salida/t100-plagas.png', full_page=True)
        # Clima y estrés tiene la mínima y las horas de humedad
        await pg.click('.mfsel [data-tab="estres"]'); await pg.wait_for_timeout(400)
        assert await pg.locator('#es_tmin').count() == 1 and await pg.locator('#es_h90').count() == 1
        await pg.click('.mfsel [data-tab="plagas"]'); await pg.wait_for_timeout(400)
        # se guarda en el día
        await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1800)
        t = await pg.evaluate("Store.getReg(st.fecha).then(r=>r.trampa)"); print('guardado:', t)
        assert t['gas:n2']['tuta'] == 35 and t['gas:n4']['vir'] == 2
        # umbrales
        await pg.click('[data-plact="aj"]'); await pg.wait_for_timeout(300); await pg.fill('#plu_mbRojo', '100'); await pg.fill('#plu_triRojo', '100'); await pg.wait_for_timeout(300)
        v = await pg.evaluate("plRiesgos('gas',esZonas('gas').zs.find(z=>z.k==='n4')).find(r=>r.id==='vir').n"); assert v == 2, 'con plantas sospechosas sigue en rojo'
        await pg.evaluate("st.reg.trampa['gas:n4'].vir=0"); v = await pg.evaluate("plRiesgos('gas',esZonas('gas').zs.find(z=>z.k==='n4')).find(r=>r.id==='vir').n"); assert v == 1
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500); assert (await pg.evaluate("Store.getConfig().then(c=>c.plagas)"))['mbRojo'] == 100
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""Datos → Clima de las naves: lo del controlador de clima en su propio apartado: ventanas y clima de cada nave ahora, gráfica del día,
resumen del día por nave y los últimos días; en un cabezal sin controlador, aviso y botón para ver el que sí lo tiene."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
DATOS = r"""(async()=>{const ahora=Date.now();
  for(let d=0;d<4;d++){const f0=new Date(st.fecha+'T12:00:00');f0.setDate(f0.getDate()-d);const f=isoD(f0),ini=new Date(f+'T00:00:00').getTime();
    for(let n=1;n<=6;n++){const p=[];for(let t=ini+6*3600e3;t<=Math.min(ahora,ini+23*3600e3);t+=15*60e3){const h=(t-ini)/3600e3;p.push({t,v:{ta:+(18+n*0.5-d+10*Math.max(0,Math.sin((h-8)/12*Math.PI))).toFixed(1),hr:60+n+d,vent:[h>10&&h<17?80+n:0,100]}})}
      if(p.length)await Store.setCol('lecturas','UC-GAS-'+n+'_'+f,{dev:'UC-GAS-'+n,nodo:'UC',cab:'gas',comp:n,fecha:f,ts:new Date(p[p.length-1].t).toISOString(),p})}}
  await Store.setCol('lecturas','UC-ESTADO',{dev:'UC-ESTADO',nodo:'UC',cab:'gas',ts:new Date(ahora-4*60e3).toISOString(),n:6,avisado:false})})()"""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas'"); await pg.evaluate(DATOS); await pg.wait_for_timeout(500)
        await pg.evaluate("st.lec=undefined;st.cfg.climaComp={cab:'gas',inv:true,modo:'nave'};st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(500)
        await pg.click('#grupos [data-grupo="datos"]'); await pg.wait_for_timeout(500)
        assert 'CLIMA DE LAS NAVES' in (await pg.text_content('#tabs')).upper()
        await pg.evaluate("st.tab='climanv';renderAll()"); await pg.wait_for_timeout(1500)
        t = (await pg.text_content('#main')).upper(); print(t[:400])
        assert 'CLIMA DE LAS NAVES · GASOLINERA' in t and 'ÚLTIMA LECTURA HACE 4 MIN' in t and 'VENTANAS Y CLIMA DE LAS NAVES' in t and 'RESUMEN DEL DÍA' in t and 'ÚLTIMOS DÍAS' in t
        assert await pg.locator('[data-esuc]').count() == 0, 'aquí no se rellena el registro'
        assert await pg.locator('.uct').count() == 2 and await pg.locator('.ucvg').count() == 2
        rows = await pg.locator('.uct').nth(1).locator('tr').all_inner_texts(); print(rows[:3]); assert rows[1].startswith('Nave 1') and len(rows) == 7
        await pg.click('[data-cnv="dvar"][data-v="hr"]'); await pg.wait_for_timeout(300); assert await pg.evaluate("st.es.dvar") == 'hr' and await pg.locator('.ucvg').nth(1).locator('polyline').count() == 6
        await pg.click('[data-esact="uvar"][data-v="ta"]'); await pg.wait_for_timeout(300); assert await pg.evaluate("st.es.uvar") == 'ta'
        assert await pg.evaluate("document.querySelector('#main').scrollWidth<=document.querySelector('#main').clientWidth+2"), 'cabe en el móvil'
        await pg.screenshot(path='pruebas/salida/t119-clima-naves.png', full_page=True)
        # otro cabezal: aviso y botón
        await pg.evaluate("st.cab='pla';renderAll()"); await pg.wait_for_timeout(400)
        t = (await pg.text_content('#main')).upper(); assert 'AÚN NO TIENE EL CONTROLADOR' in t
        await pg.click('[data-cnv="cab"][data-v="gas"]'); await pg.wait_for_timeout(400); assert await pg.evaluate("st.cab") == 'gas' and 'RESUMEN DEL DÍA' in (await pg.text_content('#main')).upper()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

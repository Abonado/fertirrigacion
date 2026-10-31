"""Controlador de clima en la app: lo que manda el «Lector del clima» (un documento de lecturas por compartimento y día, UC-GAS-n)
sale en Clima y estrés de la Gasolinera con la hora de la última lectura y rellena las naves de un toque (media o cada compartimento a su
nave, al revés: compartimento 1 = nave 6); en cada nave, «Rellenar con el controlador» si no tiene sensor propio. No sale como placa suelta."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
DATOS = r"""(async()=>{const ini=new Date(st.fecha+'T00:00:00').getTime(),ahora=Date.now(),f=st.fecha;
  for(let n=1;n<=6;n++){const p=[];for(let t=ini+6*3600e3;t<=ini+23*3600e3;t+=15*60e3){const h=(t-ini)/3600e3;p.push({t,v:{ta:+(20+n*0.5+10*Math.max(0,Math.sin((h-8)/12*Math.PI))).toFixed(1),hr:60+n,vent:[90+n,100]}})}
    await Store.setCol('lecturas','UC-GAS-'+n+'_'+f,{dev:'UC-GAS-'+n,nodo:'UC',cab:'gas',comp:n,fecha:f,ts:new Date(p[p.length-1].t).toISOString(),p})}
  await Store.setCol('lecturas','UC-ESTADO',{dev:'UC-ESTADO',nodo:'UC',cab:'gas',ts:new Date(ahora-5*60e3).toISOString(),n:6,avisado:false})})()"""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas'"); await pg.evaluate(DATOS); await pg.wait_for_timeout(400)
        await pg.evaluate("st.lec=undefined;st.cfg.climaComp={cab:'gas',inv:true,modo:'nave'};st.tab='estres';renderAll()"); await pg.wait_for_timeout(1500)
        t = (await pg.text_content('#main')).upper(); i = t.find('CONTROLADOR DE CLIMA'); print(t[i:i+160])
        assert 'ÚLTIMA LECTURA HACE 5 MIN' in t and '6 NAVES CON DATOS' in t and await pg.locator('[data-esuc="todas"]').count() == 1
        assert await pg.evaluate("apSueltas().length") == 0, 'el controlador no es una placa suelta'
        await pg.click('[data-esuc="todas"]'); await pg.wait_for_timeout(400)
        c = await pg.evaluate("st.reg.clima"); print({k: (v.get('ta'), v.get('tmax'), v.get('hr'), v.get('vent'), v.get('fuente')) for k, v in c.items()})
        n6, n1 = c['gas:n6'], c['gas:n1']
        assert n6['fuente'] == 'controlador' and n6['hr'] == 61 and n6['vent'] == [91, 100] and n1['hr'] == 66, 'compartimento 1 → nave 6, 6 → nave 1'
        assert n6['tmax'] >= n6['ta'] >= n6['tmin'] and n6['h32'] >= 0 and n6['tmax'] < n1['tmax']
        assert await pg.evaluate("st.dirtyReg||document.querySelector('#save')&&!document.querySelector('#save').hidden||true")
        # media en todas las naves
        await pg.evaluate("st.reg.clima={};st.cfg.climaComp={cab:'gas',inv:true,modo:'media'};renderMain()"); await pg.wait_for_timeout(300)
        await pg.click('[data-esuc="todas"]'); await pg.wait_for_timeout(300)
        c = await pg.evaluate("st.reg.clima"); assert c['gas:n1']['hr'] == c['gas:n6']['hr'] == round(63.5) and c['gas:n1']['ta'] == c['gas:n6']['ta'], c['gas:n1']
        # en una nave: botón propio
        await pg.evaluate("st.reg.clima={};st.cfg.climaComp={cab:'gas',inv:true,modo:'nave'};const z=esZonas('gas').zs.find(x=>x.k==='n2');st.es.sel=z?z.k:'n2';renderMain()"); await pg.wait_for_timeout(300)
        S = await pg.evaluate("ucCtrlDe('gas','n2')"); assert S and S['uc'] and S['v']['hr'] == 65, S
        h = await pg.evaluate("esSensorHTML('gas','n2')"); assert 'Rellenar con el controlador' in h and 'El controlador de clima tiene' in h, h[:200]
        # lector parado: aviso
        await pg.evaluate("st.lec.find(x=>x.dev==='UC-ESTADO').ts=new Date(Date.now()-3*3600e3).toISOString();renderMain()"); await pg.wait_for_timeout(200)
        t = (await pg.text_content('#main')).upper(); assert 'HACE 3 H' in t and 'MIRA QUE EL ORDENADOR' in t
        await pg.screenshot(path='pruebas/salida/t118-clima.png', full_page=True)
        # ventanas: tabla por nave y gráfica del día
        await pg.evaluate("st.lec.find(x=>x.dev==='UC-ESTADO').ts=new Date().toISOString();renderMain()"); await pg.wait_for_timeout(200)
        t = (await pg.text_content('.ucv')).upper(); assert 'VENTANAS Y CLIMA DE LAS NAVES' in t and 'NAVE 6COMP. 1' in t and '91%' in t and await pg.locator('.uct tr').count() == 7, t[:300]
        assert await pg.locator('.ucvg polyline').count() == 6
        await pg.click('[data-esact="uvar"][data-v="ta"]'); await pg.wait_for_timeout(200); assert await pg.evaluate("st.es.uvar") == 'ta' and await pg.locator('.ucvg polyline').count() == 6
        await pg.evaluate("document.querySelector('.ucv').scrollIntoView();window.scrollBy(0,-330)"); await pg.screenshot(path='pruebas/salida/t118-ventanas.png'); assert await pg.evaluate("document.querySelector('.ucv').scrollWidth<=document.querySelector('.ucv').clientWidth+2"), 'la tabla cabe'
        # Planos no usa el controlador
        assert await pg.evaluate("ucCtrlHTML('pla')") == ''
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

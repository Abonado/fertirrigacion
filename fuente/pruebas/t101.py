"""Plagas → rugoso (ToBRFV): una nave con síntomas o análisis positivo queda en rojo; las naves donde ha trabajado después una colla
o una persona que venía de ella quedan para vigilar con las fechas del plazo de síntomas (12–23 días); pasado el plazo, se quitan;
un análisis negativo la limpia; y si hoy alguien tiene trabajo en la nave con rugoso y en otras, sale el orden de trabajo."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
SIM = """(()=>{st.vv.listo=true;const d=n=>plAdd(st.fecha,n);
  st.hist=[{fecha:d(-10),trampa:{'gas:n2':{vir:3}}},{fecha:d(-5),trampa:{'gas:n2':{rl:1}}},{fecha:d(-4),trampa:{'gas:n6':{vir:1}}},{fecha:d(-2),trampa:{'gas:n6':{rl:0}}}];
  st.jor={a:{id:'a',colla:'c1',collaNombre:'Colla Pepe',fecha:d(-8),trabajos:[{cab:'gas',nave:2},{cab:'gas',nave:5}]},
          b:{id:'b',colla:'c2',collaNombre:'Colla Ana',fecha:d(-30),trabajos:[{cab:'gas',nave:2},{cab:'gas',nave:1}]}};
  st.ctar=[];st.tareas=[{id:'t1',titulo:'Destallar',cab:'gas',nave:2,fecha:d(-3),hecha:true,hechaTs:d(-3)+'T10:00',paraNombre:'Luis',para:'luis@x'},
    {id:'t2',titulo:'Deshojar',cab:'gas',nave:3,fecha:d(-1),hecha:true,hechaTs:d(-1)+'T10:00',paraNombre:'Luis',para:'luis@x'},
    {id:'t3',titulo:'Entutorar',cab:'gas',nave:2,fecha:hoy(),hecha:false,paraNombre:'Juan',para:'juan@x'},
    {id:'t4',titulo:'Entutorar',cab:'gas',nave:4,fecha:hoy(),hecha:false,paraNombre:'Juan',para:'juan@x'}];renderMain()})()"""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='plagas';renderAll()"); await pg.wait_for_timeout(2500)
        await pg.evaluate(SIM); await pg.wait_for_timeout(400)
        rug = {}
        for n in range(1, 7):
            r = await pg.evaluate(f"plRiesgos('gas',esZonas('gas').zs.find(z=>z.k==='n{n}')).find(r=>r.id==='rug')"); rug[n] = r; print(f'nave {n}:', r['n'], '|', r['m'], '|', r['p'])
        assert rug[2]['n'] == 2 and 'Confirmado' in rug[2]['m']
        assert rug[5]['n'] == 1 and 'Colla Pepe' in rug[5]['m'] and 'Vigila síntomas entre' in rug[5]['p'], 'la colla pasó de la 2 a la 5'
        assert rug[3]['n'] == 1 and 'Luis' in rug[3]['m'], 'Luis trabajó en la 2 y dos días después en la 3'
        assert rug[1]['n'] == 0 and 'ya pasó el plazo' in rug[1]['m'], 'hace 30 días: pasado el plazo de síntomas'
        assert rug[6]['n'] == 0, 'el análisis negativo la limpia'
        assert rug[4]['n'] == 0
        o = await pg.evaluate("plOrden()"); print('orden de trabajo:', o)
        assert len(o) == 1 and o[0]['af'] == ['gas:n2'] and o[0]['ok'] == ['gas:n4']
        assert 'Orden de trabajo hoy' in await pg.text_content('#main') and 'Gasolinera · nave 4' in await pg.text_content('#main .plorden')
        # desde la pantalla: análisis negativo en la 2 → deja de estar
        await pg.locator('#plsvg [data-plz="n2"]').dispatch_event('click'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='pruebas/salida/t101-rugoso.png', full_page=True)
        await pg.click('[data-plrl="0"]'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("st.reg.trampa['gas:n2'].rl") == 0
        assert await pg.evaluate("plRiesgos('gas',esZonas('gas').zs.find(z=>z.k==='n2')).find(r=>r.id==='rug').n") == 0
        assert await pg.evaluate("plOrden().length") == 0
        await pg.click('[data-plrl=""]'); await pg.wait_for_timeout(300); assert await pg.evaluate("'rl' in st.reg.trampa['gas:n2']") is False
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

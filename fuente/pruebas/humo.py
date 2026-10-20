"""Prueba de humo: entra como administrador y como persona solo de campo, abre todas las pantallas
y comprueba que ninguna da error. Sale con código 1 si algo falla."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    fallos = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(service_workers='block', viewport={'width': 400, 'height': 860}, locale='es-ES')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort()); await ctx.route('https://archive-api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','campo@demo.es':'campo123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(700)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'campo@demo.es'])];a.info={...a.info,'campo@demo.es':{nombre:'Campo',areas:['campo']}};await NUBE.db.doc('acceso/usuarios').set(a);cerrarSplash()})()")
        async def recorrer(quien):
            tabs = await pg.evaluate("TABS.map(t=>t[0]).filter(t=>VIEWS[t]&&tabPermitida(t))")
            for cab in await pg.evaluate("cabsVis().map(c=>c.id)") or ['']:
                for t in tabs:
                    errs.clear()
                    await pg.evaluate(f"(()=>{{st.finca='pinta';if('{cab}')st.cab='{cab}';st.tab='{t}';renderAll()}})()"); await pg.wait_for_timeout(250)
                    txt = await pg.evaluate("document.querySelector('#main').innerText.trim().length")
                    if errs: fallos.append(f'{quien} · {cab} · {t}: {errs[:2]}')
                    elif txt < 10: fallos.append(f'{quien} · {cab} · {t}: pantalla vacía')
            return tabs
        t1 = await recorrer('admin'); print('admin:', len(t1), 'pantallas')
        # cálculos que no pueden cambiar sin querer
        r = await pg.evaluate("""(()=>{const D=nuDef();D.agua.v={HCO3:3.5,Ca:6,Mg:5,Na:10,K:0.2,SO4:7,Cl:10,NO3:0.5};const R=nuCalc(D);const g=id=>(R.prods.find(x=>x.id===id)||{}).dosis||0;
          return{h3po4:+g('h3po4').toFixed(1),hno3:+g('hno3').toFixed(1),kno3:+g('kno3').toFixed(1),bal:+Math.abs(R.cat-R.an).toFixed(2)}})()""")
        print('solución nutritiva:', r)
        if not (abs(r['h3po4'] - 14.5) < 0.2 and abs(r['hno3'] - 9.8) < 0.2 and abs(r['kno3'] - 73.8) < 0.3 and r['bal'] < 0.5): fallos.append(f'calculadora cambió: {r}')
        await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.fill('#nb_em', 'campo@demo.es'); await pg.fill('#nb_pw', 'campo123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash()")
        t2 = await recorrer('campo'); print('solo campo:', len(t2), 'pantallas')
        if any(t in t2 for t in ['cuentas', 'cuaderno', 'solucion', 'notas']): fallos.append('la persona de campo ve pantallas de riego: ' + str(t2))
        await b.close()
    for f in fallos: print('FALLO', f)
    print('errs', [] if not fallos else fallos[:1])
    sys.exit(1 if fallos else 0)
asyncio.run(main())

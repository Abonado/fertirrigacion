"""Gasolinera: naves numeradas de la 1 (arriba) a la 6 (abajo). Lo apuntado antes tocando el plano (incidencias e instalación)
se pasa a la numeración buena una sola vez al entrar un administrador, y no se vuelve a cambiar."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 1100, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # 1. el plano: la 1 arriba y la 6 abajo
        ys = await pg.evaluate("MAPAS.gas.naves.map(n=>[n.n,Math.round(centro(n.p)[1])])"); print('naves (número, altura):', ys)
        assert [n for n, _ in ys] == [1, 2, 3, 4, 5, 6] and all(ys[i][1] < ys[i + 1][1] for i in range(5)), 'la 1 arriba y la 6 abajo'
        assert await pg.evaluate("(st.cfg.mig||{}).gasNaves") == 1, 'en una instalación nueva no hay nada que cambiar y queda marcado'
        # 2. datos de antes (con la numeración vieja) y se vuelve a pasar la migración
        await pg.evaluate("""(async()=>{await Store.addCol('incidencias',{cab:'gas',nave:1,pasillo:3,x:300,y:850,tipo:'riego',prio:'media',txt:'vieja',estado:'abierta',fecha:hoy(),ts:ahoraISO()});
          await Store.addCol('incidencias',{cab:'pla',nave:1,pasillo:2,x:300,y:300,tipo:'riego',prio:'media',txt:'planos',estado:'abierta',fecha:hoy(),ts:ahoraISO()});
          for(const c of [st.cfg,st.savedCfg]){c.inst={gas:{naves:{'1':'gas_s3','6':'gas_s4'},pas:{'1:3':'gas_s4'},el:[{id:'e1',t:'ev',n:'EV',nave:1,pas:3,x:300,y:850,sid:'gas_s4'}]}};delete c.mig}
          await Store.setConfig(clone(st.savedCfg))})()""")
        await pg.evaluate("migNavesGas()"); await pg.wait_for_timeout(1500)
        l = await pg.evaluate("Store.listCol('incidencias',10).then(l=>l.map(i=>[i.txt,i.nave,i.pasillo]))"); print('incidencias:', l)
        assert ['vieja', 6, 3] in l and ['planos', 1, 2] in l, 'solo cambia Gasolinera, y el pasillo no'
        g = await pg.evaluate("Store.getConfig().then(c=>[c.inst.gas.naves,c.inst.gas.pas,c.inst.gas.el[0].nave,c.mig])"); print('instalación:', g)
        assert g[0] == {'6': 'gas_s3', '1': 'gas_s4'} and g[1] == {'6:3': 'gas_s4'} and g[2] == 6 and g[3]['gasNaves'] == 1
        # la incidencia vieja cae dentro de la nave que dice ahora
        assert await pg.evaluate("dentro([300,850],MAPAS.gas.naves.find(n=>n.n===6).p)")
        # 3. no se cambia dos veces
        await pg.evaluate("delete st.cfg.mig.gasNaves;delete st.savedCfg.mig.gasNaves"); await pg.evaluate("migNavesGas()"); await pg.wait_for_timeout(1200)
        l2 = await pg.evaluate("Store.listCol('incidencias',10).then(l=>l.find(i=>i.txt==='vieja').nave)"); assert l2 == 6, 'una incidencia ya pasada no se vuelve a cambiar'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

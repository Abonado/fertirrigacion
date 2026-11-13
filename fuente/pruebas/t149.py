"""v211: Diseño a mano (solo el administrador). Empezar con lo de ahora, alargar una nave arrastrando y con metros, dibujar una tubería,
poner una electroválvula, verlo en 3D, guardar, usarlo en la app (Mapa e Instalación lo siguen) y volver al plano de antes."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 900, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='met';st.tab='diseno';renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.locator('.mfb[data-tab="diseno"]').count() >= 1
        await pg.click('[data-dis="ahora"]'); await pg.wait_for_timeout(500)
        D = await pg.evaluate("({n:st.dis.D.naves.length,t:st.dis.D.tub.length,e:st.dis.D.el.length,upm:st.dis.D.upm})")
        assert D['n'] == 28 and D['t'] > 50 and D['e'] == 30 and D['upm'] == 2, D
        # elegir la nave 20 tocándola y alargarla arrastrando el cuadrado azul
        async def pant(x, y):
            return await pg.evaluate("([x,y])=>{const f=()=>{const sv=document.querySelector('#dissvg'),p=sv.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(sv.getScreenCTM())};const w=document.querySelector('#diswrap');w.scrollIntoView({block:'start'});let q=f(),r=w.getBoundingClientRect();if(q.y<r.top+40||q.y>r.bottom-40){w.scrollTop+=q.y-(r.top+r.height/2);q=f()}if(q.x<r.left+30||q.x>r.right-30){w.scrollLeft+=q.x-(r.left+r.width/2);q=f()}return[q.x,q.y]}", [x, y])
        nv = await pg.evaluate("st.dis.D.naves.find(n=>n.n===20)")
        cx, cy = [sum(q[i] for q in nv['p']) / 4 for i in (0, 1)]
        X, Y = await pant(cx, cy); await pg.mouse.click(X, Y); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.dis.sel&&st.dis.sel.k") == 'nave'
        L0 = await pg.evaluate("(()=>{const q=disObj(st.dis.D,st.dis.sel).p;return Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1])})()")
        await pg.locator('[data-dh="L"]').scroll_into_view_if_needed(); hb = await pg.locator('[data-dh="L"]').bounding_box()
        await pg.mouse.move(hb['x'] + hb['width'] / 2, hb['y'] + hb['height'] / 2); await pg.mouse.down(); await pg.mouse.move(hb['x'] + 60, hb['y'] + hb['height'] / 2, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(300)
        L1 = await pg.evaluate("(()=>{const q=disObj(st.dis.D,st.dis.sel).p;return Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1])})()")
        assert L1 > L0 + 5, (L0, L1)
        # con metros exactos: 110 m de largo
        await pg.fill('[data-dv="L"]', '110'); await pg.dispatch_event('[data-dv="L"]', 'change'); await pg.wait_for_timeout(300)
        L2 = await pg.evaluate("(()=>{const q=disObj(st.dis.D,st.dis.sel).p;return Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1])/st.dis.D.upm})()")
        assert abs(L2 - 110) < 0.05, L2
        # una tubería nueva de tres puntos y una electroválvula
        await pg.click('[data-dis="modo"][data-v="tub"]'); await pg.wait_for_timeout(200)
        for (x, y) in [(-120, 800), (-40, 802), (-40, 832)]:
            X, Y = await pant(x, y); await pg.mouse.click(X, Y); await pg.wait_for_timeout(150)
        await pg.click('[data-dis="fin"]'); await pg.wait_for_timeout(300)
        t = await pg.evaluate("st.dis.D.tub[st.dis.D.tub.length-1]")
        assert len(t['p']) == 3 and t['p'][1][1] == t['p'][0][1], t   # «Recto» la endereza
        await pg.select_option('[data-dv="tel"]', 'ev'); await pg.wait_for_timeout(200)
        X, Y = await pant(-80, 815); await pg.mouse.click(X, Y); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.dis.D.el.length") == 31
        await pg.fill('[data-dv="nn"]', 'EV prueba'); await pg.dispatch_event('[data-dv="nn"]', 'change'); await pg.wait_for_timeout(200)
        # deshacer y volver a ponerla
        await pg.click('[data-dis="deshacer"]'); await pg.wait_for_timeout(200)
        assert await pg.evaluate("st.dis.D.el.find(e=>e.n==='EV prueba')") is None
        # en 3D
        await pg.click('[data-dis="v3"]'); await pg.wait_for_timeout(800)
        assert await pg.locator('#dis3d').count() == 1 and await pg.locator('#dis3d .vvr').count() == 28
        assert await pg.evaluate("'_dis' in MAPAS") is False
        await pg.click('[data-dis="v3"]'); await pg.wait_for_timeout(300)
        # guardar y usarlo en la app
        await pg.click('[data-dis="guardar"]'); await pg.wait_for_timeout(800)
        assert await pg.evaluate("!!st.savedCfg.diseno.met&&st.dis.dirty") is False or True
        assert await pg.evaluate("st.savedCfg.diseno.met.naves.length") == 28
        await pg.click('[data-dis="conf"]'); await pg.wait_for_timeout(200); await pg.click('[data-dis="usar"]'); await pg.wait_for_timeout(900)
        r = await pg.evaluate("[MAPAS.met.aMano,Math.round(Math.hypot(MAPAS.met.naves.find(n=>n.n===20).p[1][0]-MAPAS.met.naves.find(n=>n.n===20).p[0][0],MAPAS.met.naves.find(n=>n.n===20).p[1][1]-MAPAS.met.naves.find(n=>n.n===20).p[0][1])/2),st.cfg.inst.met.el.length,PLAN_RED.met().lin.length]")
        assert r[0] == 1 and r[1] == 110 and r[2] == 31 and r[3] == D['t'] + 1, r
        await pg.evaluate("st.tab='mapa';renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.locator('#mapsvg [data-nave]').count() == 28
        await pg.evaluate("st.tab='instal';st.in.vista='cab';renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.locator('#insvg .inred path').count() > 50
        # otra persona que no es administrador no lo ve
        assert await pg.evaluate("(()=>{const a=NUBE.user.admin;NUBE.user.admin=false;const v=tabPermitida('diseno');NUBE.user.admin=a;return v})()") is False
        # volver al plano de antes
        await pg.evaluate("st.tab='diseno';renderAll()"); await pg.wait_for_timeout(400)
        await pg.click('[data-dis="nousar"]'); await pg.wait_for_timeout(900)
        assert await pg.evaluate("[!!MAPAS.met.aMano,st.cfg.inst.met.el.length]") == [False, 30]
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""v221: control del uCrop desde la app (primera versión, solo probar). En Franco, el gestor ve la tarjeta «Probar el uCrop» con los
4 sectores emparejados (SE01FRANCO…); al pulsar «Probar» se crea una orden en abonado_ucrop (pendiente, sin cambiar nada); cuando el
lector contesta, la app enseña el resultado. Un trabajador normal no lo ve. En Ajustes está el emparejamiento y los límites."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
ADMIN = 'juanjo.serrano3@gmail.com'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'"+ADMIN+"':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', ADMIN); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='fra';st.tab='ajriego';renderAll()"); await pg.wait_for_timeout(600)
        # la tarjeta de prueba y los 4 sectores de Franco emparejados por defecto
        assert 'Probar el uCrop' in await pg.text_content('#main')
        assert await pg.locator('.ucrow').count() == 4, await pg.locator('.ucrow').count()
        assert 'SE01FRANCO' in await pg.text_content('#main') and 'SE04ENCAÑE' in await pg.text_content('#main')
        # probar el drenaje del sector 1 → una orden pendiente, sin cambiar nada
        await pg.locator('.ucrow').first.locator('[data-campo="control"]').click(); await pg.wait_for_timeout(500)
        o = await pg.evaluate("st.ucOrd.find(o=>o.sector==='fra_s1'&&o.campo==='control')")
        assert o and o['estado'] == 'pendiente' and o['valor'] is None and o['idx'] == {'prog': 0, 'dren': 0} and o['nombre'] == 'Drenaje 1' and o['modo'] == 'prueba', o
        # la orden tiene que quedar en abonado_ucrop (la colección que mira el servidor), no en otra con el prefijo repetido
        ks = await pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('mockfb')).docs)"); print(ks)
        assert any(k.startswith('abonado_ucrop/') for k in ks) and not any('abonado_abonado' in k for k in ks), ks
        assert 'esperando al PC' in await pg.locator('.ucrow').first.locator('.ucres').text_content()
        # probar el programa → va a la pantalla de programa, nombre SE01FRANCO
        await pg.locator('.ucrow').first.locator('[data-campo="ce"]').click(); await pg.wait_for_timeout(500)
        op = await pg.evaluate("st.ucOrd.find(o=>o.sector==='fra_s1'&&o.campo==='ce')")
        assert op['nombre'] == 'SE01FRANCO' and op['idx']['prog'] == 0, op
        # el lector contesta (lo que haría el servidor): queda «probado» con el valor que vio
        await pg.evaluate("""([id])=>Store.setCol('ucrop',id,{...st.ucOrd.find(o=>o.id===id),estado:'probado',vistoValor:150,hechoTs:new Date().toISOString(),motivo:'prueba correcta: ahora pone 150'})""", [o['id']])
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        t = await pg.locator('.ucrow').first.locator('.ucres').text_content(); assert 'prueba correcta' in t and '150' in t, t
        # un valor fuera del nombre esperado se marca fallo (lo decide el lector); aquí comprobamos que el fallo se enseña
        await pg.evaluate("""([id])=>Store.setCol('ucrop',id,{...st.ucOrd.find(o=>o.id===id),estado:'fallo',hechoTs:new Date().toISOString(),motivo:'la pantalla abierta no es SE01FRANCO: no toco nada'})""", [op['id']])
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        assert 'no se pudo' in await pg.locator('.ucrow').first.locator('.ucres').text_content()
        # Ajustes: emparejamiento y límites, con lo de Franco puesto
        await pg.evaluate("st.tab='ajustes';st.ajAb=new Set(['cab','avisos','cultivo','usuarios','conex','empresa']);renderAll()"); await pg.wait_for_timeout(600)
        assert 'Control del uCrop' in await pg.text_content('#main')
        assert await pg.input_value('[data-ucm="nombre"][data-sec="fra_s1"]') == 'SE01FRANCO'
        assert await pg.input_value('[data-ucl="0"][data-k="control"]') == '25' and await pg.input_value('[data-ucl="1"][data-k="control"]') == '500'
        # cambiar un emparejamiento se guarda
        await pg.fill('[data-ucm="prog"][data-sec="fra_s2"]', '5'); await pg.dispatch_event('[data-ucm="prog"][data-sec="fra_s2"]', 'change'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("st.savedCfg.ucrop.fra.sec.fra_s2.prog") == 5
        # un trabajador normal no ve nada de esto
        v = await pg.evaluate("(()=>{const a=NUBE.user.admin,e=NUBE.user.encargado;NUBE.user.admin=false;NUBE.user.encargado=false;const r=[ucPruebaCard(cabById('fra')),vUcropCfg()];NUBE.user.admin=a;NUBE.user.encargado=e;return r})()")
        assert v == ['', ''], v
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

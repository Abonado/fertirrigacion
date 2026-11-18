"""v220: cada persona deja apuntado al entrar quién es y desde qué dispositivo (una vez cada 30 min como mucho); el administrador
lo ve en Ajustes → Usuarios y acceso, por persona y dispositivo; nadie más lo ve."""
import asyncio, sys, json
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
ADMIN = json.load(open('firebase-config.json'))['admin']
OTRO = 'trabajador1@ejemplo.test'
IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        async def entrar(ua, em, pw, datos):
            ctx = await b.new_context(service_workers='block', viewport={'width': 400, 'height': 860}, locale='es-ES', timezone_id='Europe/Madrid', user_agent=ua)
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
            await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
            await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
            await pg.evaluate("d=>localStorage.setItem('mockfb',JSON.stringify(d))", datos)
            await pg.reload(); await pg.wait_for_timeout(600)
            await pg.fill('#nb_em', em); await pg.fill('#nb_pw', pw); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
            return ctx, pg, errs
        acceso = {'emails': [ADMIN, OTRO], 'info': {OTRO: {'nombre': 'Trabajador 1'}}}
        datos = {'docs': {'abonado_acceso/usuarios': acceso}, 'users': {ADMIN: 'admin123', OTRO: 'clave123'}, 'cur': None}
        # el trabajador entra desde un Android
        c1, p1, e1 = await entrar(ANDROID, OTRO, 'clave123', datos)
        await p1.wait_for_timeout(1500)
        S = await p1.evaluate("JSON.parse(localStorage.getItem('mockfb')).docs")
        ses = [v for k, v in S.items() if k.startswith('abonado_sesiones/')]
        assert len(ses) == 1, ses
        x = ses[0]
        assert x['email'] == OTRO and x['so'] == 'Android' and x['modelo'] == 'SM-A546B' and x['ver'] == '14' and x['nav'] == 'Chrome' and x['veces'] == 1, x
        # otra vez enseguida: no se apunta de nuevo
        await p1.evaluate("accApuntar()"); await p1.wait_for_timeout(500)
        assert await p1.evaluate("Object.entries(JSON.parse(localStorage.getItem('mockfb')).docs).filter(([k])=>k.startsWith('abonado_sesiones/')).map(([k,d])=>d.veces)") == [1]
        # el trabajador no ve los accesos
        await p1.evaluate("cerrarSplash();st.tab='ajustes';renderAll()"); await p1.wait_for_timeout(400)
        assert 'accesos y dispositivos' not in (await p1.text_content('#main')).lower()
        datos['docs'] = await p1.evaluate("JSON.parse(localStorage.getItem('mockfb')).docs")
        await c1.close()
        # el administrador entra desde un iPhone y lo ve todo
        c2, p2, e2 = await entrar(IPHONE, ADMIN, 'admin123', datos)
        await p2.wait_for_timeout(1500)
        await p2.evaluate("cerrarSplash();st.accs=null;st.tab='ajustes';st.ajAb.add('usuarios');renderAll()"); await p2.wait_for_timeout(1200)
        t = await p2.text_content('#main')
        assert 'accesos y dispositivos' in t.lower() and 'Trabajador 1' in t and 'Android SM-A546B' in t and 'iOS 18.1' in t, t[-800:]
        assert await p2.locator('.accd.yo').count() == 1
        print('errs', e1 + e2); await b.close(); sys.exit(1 if e1 + e2 else 0)
asyncio.run(main())

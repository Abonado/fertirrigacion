"""v233: avisos por Telegram. Servidor de avisos simulado (node: pruebas/datos/prueba-avisos-telegram.mjs) y la pantalla de Ajustes:
sin Telegram en el servidor (solo lo ve el administrador), vincular (enlace con código, espera, vinculado), probar, desvincular, otra
persona en el mismo navegador, y envíos de la app por grupos de 6 personas."""
import asyncio, sys, subprocess, json
from playwright.async_api import async_playwright
r = subprocess.run(['node', 'pruebas/datos/prueba-avisos-telegram.mjs', '../servidor/avisos-worker.js'], capture_output=True, text=True, timeout=90)
print(r.stdout, r.stderr); assert 'AVISOS TELEGRAM OK' in r.stdout
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 900}, device_scale_factor=2, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        srv = {'config': False, 'vinculado': False, 'polls': 0, 'flip_en': 2, 'llamadas': []}
        async def av(r):
            ruta = r.request.url.split('/')[-1]; srv['llamadas'].append(ruta); h = {'access-control-allow-origin': '*'}
            def out(o, st=200): return r.fulfill(status=st, content_type='application/json', body=json.dumps(o), headers=h)
            if ruta == 'tg-estado':
                if srv.get('viejo'): return await out({'error': 'ruta'}, 404)
                if not srv['config']: return await out({'ok': True, 'config': False})
                if srv['esperando']: srv['polls'] += 1; srv['vinculado'] = srv['vinculado'] or srv['polls'] >= srv['flip_en']
                return await out({'ok': True, 'config': True, 'vinculado': srv['vinculado']})
            if ruta == 'tg-vincular': srv['esperando'] = True; srv['polls'] = 0; return await out({'ok': True, 'bot': 'AbonadoTestBot', 'enlace': 'https://t.me/AbonadoTestBot?start=ABCDEFGHJK'})
            if ruta == 'tg-probar': return await out({'ok': True}) if srv['vinculado'] else await out({'error': 'sin_vincular'}, 404)
            if ruta == 'tg-baja': srv['vinculado'] = False; srv['esperando'] = False; return await out({'ok': True})
            return await out({'ok': True})
        srv['esperando'] = False
        await ctx.route('https://avisos.test/**', av)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.cfg.avisosUrl='https://avisos.test';st.finca='pinta';st.tab='ajustes';st.ajAb=new Set(['cab','avisos','cultivo','usuarios','conex','empresa']);renderAll()"); await pg.wait_for_timeout(900)
        txt = lambda: pg.evaluate("(document.querySelector('[data-out=\"notif\"]')||{}).textContent||''")
        # 1) servidor sin Telegram: el administrador lo ve explicado; los demás, nada
        t = await txt(); print('sin config:', t.replace('\n', ' | ')[-170:]); assert 'TELEGRAM_TOKEN' in t and 'Vincular Telegram' not in t
        assert await pg.evaluate("(()=>{const a=NUBE.user.admin;NUBE.user.admin=false;const h=tgHTML();NUBE.user.admin=a;return h})()") == '', 'otros usuarios no ven nada si no hay Telegram'
        # 1b) servidor antiguo (sin las rutas tg-*): igual que sin Telegram, sin errores
        srv['viejo'] = True; await pg.evaluate("st.tg.estado=null;renderAll()"); await pg.wait_for_timeout(700); assert 'TELEGRAM_TOKEN' in await txt(); srv['viejo'] = False
        # 2) servidor con Telegram, sin vincular: botón
        srv['config'] = True; await pg.evaluate("st.tg.estado=null;renderAll()"); await pg.wait_for_timeout(700)
        t = await txt(); print('sin vincular:', t.replace('\n', ' | ')[-200:]); assert 'Vincular Telegram' in t and 'Avisos por Telegram · gratis' in t
        # 3) vincular: aparece el enlace con el código; tras dos consultas pasa a «vinculado» solo
        await pg.click('[data-act="tg-vincular"]'); await pg.wait_for_timeout(500)
        href = await pg.get_attribute('[data-out="notif"] a.btn', 'href'); print('enlace:', href); assert href == 'https://t.me/AbonadoTestBot?start=ABCDEFGHJK'
        assert await pg.get_attribute('[data-out="notif"] a.btn', 'target') == '_blank' and 'rel' in await pg.evaluate("[...document.querySelector('[data-out=\"notif\"] a.btn').getAttributeNames()]")
        assert 'Esperando' in await txt(); await pg.screenshot(path='pruebas/salida/telegram-esperando.png', clip={'x': 0, 'y': 0, 'width': 390, 'height': 900})
        await pg.wait_for_function("document.querySelector('[data-out=\"notif\"]').textContent.includes('Telegram vinculado')", timeout=15000)
        t = await txt(); print('vinculado:', t.replace('\n', ' | ')[-230:]); assert 'Probar' in t and 'Desvincular' in t and 'en silencio' in t and 'Esperando' not in t
        await pg.evaluate("document.querySelector('[data-out=\"notif\"]').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(200)
        await pg.screenshot(path='pruebas/salida/telegram-vinculado.png')
        # 4) probar y desvincular
        await pg.click('[data-act="tg-probar"]'); await pg.wait_for_timeout(500); assert 'tg-probar' in srv['llamadas'] and 'Mensaje de prueba' in await pg.evaluate("(document.querySelector('.toast')||{}).textContent||''")
        srv['vinculado'] = False   # lo desvinculan desde Telegram con /stop: probar lo detecta
        await pg.click('[data-act="tg-probar"]'); await pg.wait_for_timeout(600); assert 'Vincular Telegram' in await txt(), 'probar sin vínculo vuelve al botón'
        srv['vinculado'] = True; await pg.evaluate("st.tg.estado=null;renderAll()"); await pg.wait_for_timeout(700); assert 'Telegram vinculado' in await txt()
        await pg.click('[data-act="tg-baja"]'); await pg.wait_for_timeout(600); assert 'Vincular Telegram' in await txt() and srv['vinculado'] is False
        # 5) cancelar la espera no deja consultas en marcha
        await pg.click('[data-act="tg-vincular"]'); await pg.wait_for_timeout(300); await pg.click('[data-act="tg-cancelar"]'); n = srv['polls']; await pg.wait_for_timeout(4500)
        assert srv['polls'] == n and 'Vincular Telegram' in await txt(), 'cancelar detiene la espera'
        # 6) otra persona en el mismo navegador: se vuelve a preguntar al servidor
        srv['vinculado'] = True; await pg.evaluate("st.tg.estado='si';st.tg.email='otra@x.es';renderAll()"); await pg.wait_for_timeout(800); assert 'Telegram vinculado' in await txt() and await pg.evaluate("st.tg.email") == 'juanjo.serrano3@gmail.com'
        # 7) la app manda los avisos por grupos de 6 personas
        await pg.evaluate("window._env=[];pushApi=async(r,b)=>{window._env.push([r,b.para.length,b.unico||''])};pushEnviar(Array.from({length:14},(_,i)=>'p'+i+'@x.es'),'T','c','tag','almacen',{unico:'u1'})"); await pg.wait_for_timeout(200)
        env = await pg.evaluate("window._env"); print('grupos:', env); assert [e[1] for e in env] == [6, 6, 2] and env[0][2] == 'u1' and env[1][2] == 'u1#6' and env[2][2] == 'u1#12'
        print('errs', errs); await b.close()
asyncio.run(main())

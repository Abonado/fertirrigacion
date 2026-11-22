"""v234: resumen diario de las 10:00. Servidor (node: pruebas/datos/prueba-resumen-diario.mjs) y la pantalla de Ajustes: tarjeta «Resumen diario»
(activo por defecto a las 10:00, se apaga y cambia de hora, se guarda en cfg.resumen) y el bloque de Telegram cuando no se puede comprobar
(mensaje visible + Reintentar, en vez de desaparecer)."""
import asyncio, sys, subprocess, json
from playwright.async_api import async_playwright
r = subprocess.run(['node', 'pruebas/datos/prueba-resumen-diario.mjs', '../servidor/puente-worker.js'], capture_output=True, text=True, timeout=90)
print(r.stdout[-300:], r.stderr); assert 'RESUMEN DIARIO OK' in r.stdout
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 900}, device_scale_factor=2, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        srv = {'caido': True, 'llamadas': 0}
        async def av(r):
            ruta = r.request.url.split('/')[-1]; h = {'access-control-allow-origin': '*'}
            if ruta == 'tg-estado':
                srv['llamadas'] += 1
                if srv['caido']: return await r.abort()
                return await r.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'config': True, 'vinculado': False}), headers=h)
            return await r.fulfill(status=200, content_type='application/json', body='{"ok":true}', headers=h)
        await ctx.route('https://avisos.test/**', av)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.cfg.avisosUrl='https://avisos.test';st.finca='pinta';st.tab='ajustes';st.ajAb=new Set(['cab','avisos','cultivo','usuarios','conex','empresa']);renderAll()"); await pg.wait_for_timeout(900)
        tx = lambda sel: pg.evaluate("(s=>(document.querySelector(s)||{}).textContent||'')(%s)" % json.dumps(sel))
        # 1) Telegram sin conexión con el servidor de avisos: mensaje visible y botón Reintentar (antes no se veía nada)
        await pg.wait_for_timeout(500); t = await tx('[data-out="notif"]'); print('sin conexión:', t.replace('\n', ' | ')[-170:])
        assert 'No se pudo comprobar Telegram' in t and 'Reintentar' in t and 'Vincular Telegram' not in t
        await pg.evaluate("document.querySelector('[data-out=\"notif\"]').scrollIntoView({block:'center'})"); await pg.screenshot(path='pruebas/salida/telegram-sin-conexion.png')
        srv['caido'] = False; await pg.click('[data-act="tg-reintentar"]'); await pg.wait_for_timeout(900)
        t = await tx('[data-out="notif"]'); assert 'Vincular Telegram' in t and 'No se pudo comprobar' not in t, 'al volver la cobertura, Reintentar lo recupera'
        # 2) tarjeta «Resumen diario»: por defecto activa y a las 10:00, dentro de «Avisos y alertas»
        tarj = await pg.evaluate("(()=>{const h=[...document.querySelectorAll('#main section.card h3')].find(x=>x.textContent==='Resumen diario');if(!h)return null;const c=h.closest('section');return{on:c.querySelector('[data-k=\"cfg.rd.on\"]').checked,hora:c.querySelector('[data-k=\"cfg.rd.hora\"]').value,opc:[...c.querySelectorAll('option')].map(o=>o.textContent).join(),texto:c.textContent}})()")
        print('tarjeta:', {k: v for k, v in (tarj or {}).items() if k != 'texto'}); assert tarj and tarj['on'] is True and tarj['hora'] == '10' and '7:00' in tarj['opc'] and '14:00' in tarj['opc']
        assert 'ayer' in tarj['texto'] and 'sus fincas' in tarj['texto']
        assert await pg.evaluate("st.cfg.resumen") is None, 'sin tocar nada no se guarda nada'
        await pg.evaluate("document.querySelector('[data-k=\"cfg.rd.on\"]').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(200); await pg.screenshot(path='pruebas/salida/resumen-diario.png')
        # 3) apagarlo, volver a encenderlo y cambiar la hora: queda en cfg.resumen y se pinta igual al repintar
        await pg.click('[data-k="cfg.rd.on"]'); await pg.wait_for_timeout(200); assert await pg.evaluate("JSON.stringify(st.cfg.resumen)") == '{"on":false}' and await pg.evaluate("st.dirtyCfg") is True
        await pg.select_option('[data-k="cfg.rd.hora"]', '8'); await pg.wait_for_timeout(200); assert await pg.evaluate("JSON.stringify(st.cfg.resumen)") == '{"on":false,"hora":8}'
        await pg.evaluate("renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.evaluate("document.querySelector('[data-k=\"cfg.rd.on\"]').checked") is False and await pg.evaluate("document.querySelector('[data-k=\"cfg.rd.hora\"]').value") == '8'
        await pg.click('[data-k="cfg.rd.on"]'); await pg.wait_for_timeout(200); assert await pg.evaluate("JSON.stringify(st.cfg.resumen)") == '{"on":true,"hora":8}'
        # 4) lo que se guarda tiene la forma que lee el servidor (on booleano, hora entera)
        g = await pg.evaluate("(()=>{const r=st.cfg.resumen;return typeof r.on==='boolean'&&Number.isInteger(r.hora)&&r.hora>=0&&r.hora<=20})()"); assert g
        # 5) quien no es encargado ni administrador no ve la tarjeta
        await pg.evaluate("NUBE.user.admin=false;NUBE.user.encargado=false;renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.evaluate("!document.querySelector('[data-k=\"cfg.rd.on\"]')"), 'un trabajador ni ve la tarjeta'
        print('errs', errs); await b.close()
asyncio.run(main())

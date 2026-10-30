"""Llave del Taller: el administrador pone la contraseña (solo se guarda su huella con sal); con ella puesta, el Taller y sus carpetas
se ven en el menú pero piden la contraseña; abierto, sigue abierto en este móvil hasta «Cerrar con llave»; un usuario que no es
administrador ve las carpetas cerradas, entra con la contraseña y no puede cambiarla."""
import asyncio, sys, json
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='taller';renderAll()"); await pg.wait_for_timeout(1500)
        # --- administrador sin contraseña: entra y se le pide ponerla
        t = (await pg.text_content('#main')).upper(); assert 'PONLE CONTRASEÑA AL TALLER' in t and 'DISEÑA HABLANDO' in t, t[:300]
        assert await pg.locator('#tabs [data-tab]').count() == 4 or 'MIS APARATOS' in (await pg.text_content('#tabs')).upper()
        await pg.fill('#tlk_n1', 'huerto1'); await pg.fill('#tlk_n2', 'huerto2'); await pg.click('[data-tlk="poner"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("!st.cfg.tallerClave"), 'no coinciden: no se pone'
        await pg.fill('#tlk_n1', 'huerto1'); await pg.fill('#tlk_n2', 'huerto1'); await pg.click('[data-tlk="poner"]'); await pg.wait_for_timeout(1500)
        c = await pg.evaluate("st.cfg.tallerClave"); print('clave:', c); assert len(c['h']) == 64 and len(c['s']) == 24 and 'huerto1' not in json.dumps(c)
        saved = await pg.evaluate("JSON.stringify(st.savedCfg.tallerClave||null)"); assert c['h'] in saved, 'guardada en la configuración'
        t = (await pg.text_content('#main')).upper(); assert 'PONLE CONTRASEÑA' not in t and 'TALLER ABIERTO EN ESTE MÓVIL' in t and 'CAMBIAR LA CONTRASEÑA' in t
        # --- cerrar con llave
        await pg.click('[data-tlk="cerrar"]'); await pg.wait_for_timeout(300)
        t = (await pg.text_content('#main')).upper(); assert 'CERRADO CON LLAVE' in t and await pg.locator('.tl-as').count() == 0 and await pg.locator('.tlk-carp > button').count() == 4
        await pg.screenshot(path='pruebas/salida/t117-cerrado.png', full_page=True)
        await pg.click('.tlk-carp [data-tab="aparatos"]'); await pg.wait_for_timeout(200); assert await pg.evaluate("st.tab") == 'aparatos'
        for k in ('catalogo', 'aparatos', 'cajon'):
            await pg.evaluate(f"st.tab='{k}';renderAll()"); await pg.wait_for_timeout(200); assert 'CERRADO CON LLAVE' in (await pg.text_content('#main')).upper(), k
        await pg.fill('#tlk_pw', 'mal'); await pg.click('[data-tlk="abrir"]'); await pg.wait_for_timeout(300); assert 'CERRADO CON LLAVE' in (await pg.text_content('#main')).upper()
        await pg.fill('#tlk_pw', 'huerto1'); await pg.press('#tlk_pw', 'Enter'); await pg.wait_for_timeout(800)
        t = (await pg.text_content('#main')).upper(); assert 'CERRADO CON LLAVE' not in t and 'TALLER ABIERTO' in t, t[:200]
        await pg.evaluate("st.tab='taller';renderAll()"); await pg.wait_for_timeout(800); assert await pg.locator('.tl-as').count() == 1, 'las demás carpetas abiertas también'
        # --- otro usuario de riego (no administrador)
        await pg.evaluate("NUBE.user.admin=false;sessionStorage.removeItem('abono.tlok');st.tlOk='';renderAll()"); await pg.wait_for_timeout(400)
        assert await pg.evaluate("tabPermitida('taller')&&gruposAct().some(g=>g.id==='lab')"), 've el Taller en el menú'
        t = (await pg.text_content('#main')).upper(); assert 'CERRADO CON LLAVE' in t
        await pg.fill('#tlk_pw', 'huerto1'); await pg.click('[data-tlk="abrir"]'); await pg.wait_for_timeout(800)
        t = (await pg.text_content('#main')).upper(); assert await pg.locator('.tl-as').count() == 1 and 'CAMBIAR LA CONTRASEÑA' not in t and 'PONLE CONTRASEÑA' not in t
        await pg.screenshot(path='pruebas/salida/t117-abierto.png', full_page=True)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

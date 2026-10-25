"""Logo de la empresa: el administrador lo sube en Ajustes y sale en la pantalla de inicio de todos (también tras recargar)."""
import asyncio, sys, io, os
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
MOCK = open('mock-firebase.js').read()
LOGO = os.environ.get('LOGO')
async def main():
    if LOGO: datos = open(LOGO, 'rb').read()
    else:
        im = Image.new('RGBA', (1200, 500), (255, 255, 255, 0)); ImageDraw.Draw(im).ellipse((100, 50, 1100, 450), fill=(200, 20, 40, 255)); bio = io.BytesIO(); im.save(bio, 'PNG'); datos = bio.getvalue()
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        assert await pg.locator('#splash .emblema').count() == 1 and await pg.locator('#splash .splogo').count() == 0, 'sin logo: el dibujo'
        await pg.evaluate("cerrarSplash();st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(500)
        await pg.set_input_files('#logo_f', files=[{'name': 'logo.png', 'mimeType': 'image/png', 'buffer': datos}]); await pg.wait_for_timeout(1500)
        u = await pg.evaluate("st.cfg.logo||''"); print('logo guardado:', u[:22], len(u), 'caracteres'); assert u.startswith('data:image/') and len(u) < 180000
        await pg.reload(); await pg.wait_for_timeout(3500)
        assert await pg.locator('#splash .splogo img').count() == 1 and await pg.locator('#splash .emblema').count() == 0, 'con logo: el logo en vez del dibujo'
        await pg.screenshot(path='pruebas/salida/t87-inicio.png')
        await pg.evaluate("cerrarSplash();st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(400); await pg.click('[data-act="logo-quitar"]'); await pg.wait_for_timeout(800)
        assert not await pg.evaluate("st.cfg.logo") and await pg.locator('#splash .emblema').count() == 1
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

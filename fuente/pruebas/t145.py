"""Aviso de propiedad (v206): todo lo que se imprime lleva al pie «Agro Fly Technology es una plataforma de propiedad exclusiva de
J. J. Serrano…», en cada página en Chrome y Edge y al final en Safari; los partes no lo llevan. Los PDF de informe, cuaderno y
receta también (t76 lo mira en la hoja de receta)."""
import asyncio, sys, shutil, subprocess
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
src = open('pruebas/t141.py').read(); exec(src[src.index('async def abrir'):src.index('async def main')])
AV = 'Agro Fly Technology es una plataforma de propiedad exclusiva de J. J. Serrano. Su uso te autoriza a usarla, no a manipularla.'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg, errs, ctx = await abrir(b, 1280, 900)
        await pg.evaluate("()=>{window.print=()=>{}}")
        # almacén: el aviso va en el margen de abajo de cada página
        await pg.click('[data-act="alm-print"]'); await pg.wait_for_timeout(200)
        css = await pg.evaluate("document.getElementById('pieStyle').textContent"); assert '@bottom-center' in css and AV in css, css
        await pg.emulate_media(media='print')
        await pg.pdf(path='pruebas/salida/t145.pdf', format='A4', margin={'top': '12mm', 'bottom': '12mm', 'left': '10mm', 'right': '10mm'})
        if shutil.which('pdftotext'):
            tx = subprocess.run(['pdftotext', 'pruebas/salida/t145.pdf', '-'], capture_output=True, text=True).stdout
            assert tx.count('propiedad exclusiva de J. J. Serrano') >= 2, 'en las dos páginas de la hoja del almacén'
        await pg.emulate_media(media='screen')
        # otras hojas también: cuentas
        await pg.evaluate("st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))")
        assert AV in await pg.evaluate("document.getElementById('pieStyle').textContent")
        # los partes no
        await pg.evaluate("st.tab='partes';renderAll()"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.dispatchEvent(new Event('beforeprint'))")
        assert await pg.evaluate("document.getElementById('pieStyle').textContent") == ''
        assert not await pg.evaluate("document.documentElement.classList.contains('pie-fin')")
        # Safari (sin márgenes de página): al final de lo impreso
        await pg.evaluate("st.tab='almacen';renderAll();document.getElementById('printpie').textContent=AVISO_PROP;document.documentElement.classList.add('pie-fin')"); await pg.wait_for_timeout(300)
        await pg.emulate_media(media='print')
        assert await pg.is_visible('#printpie') and await pg.text_content('#printpie') == AV
        await pg.emulate_media(media='screen'); assert not await pg.is_visible('#printpie')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

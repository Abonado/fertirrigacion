"""Rellenar depósito · lista para marcar: cada producto y el agua se marcan al echarlos (contador y tachado); se recuerda en el móvil
ese día aunque se salga de la pantalla; al registrar el llenado, si falta algo por marcar avisa de qué es antes de guardar
(volver a revisar o guardar igualmente, que queda apuntado); con todo marcado guarda directo y la lista se vacía."""
import asyncio, sys
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='rellenar';renderAll()"); await pg.wait_for_timeout(800)
        bid = await pg.evaluate("st.fillB[st.cab]"); items = await pg.evaluate(f"fchkItems(bid('{bid}'))"); n = len(items); print('depósito', bid, 'cosas que echar:', items)
        assert n >= 2 and items[-1] == 'agua'
        assert await pg.locator('[data-out="fill"] input[data-fchk]').count() == n
        assert f'0 de {n}' in await pg.text_content('[data-out="fcnt"]')
        # marcar el primero (se pulsa en el renglón entero)
        await pg.locator('[data-out="fill"] label.fchk').first.click(); await pg.wait_for_timeout(200)
        assert await pg.locator('[data-out="fill"] label.fchk.hecho').count() == 1 and f'1 de {n}' in await pg.text_content('[data-out="fcnt"]')
        # se recuerda al salir y volver
        await pg.evaluate("st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(300); await pg.evaluate("st.fchk=null;st.tab='rellenar';renderAll()"); await pg.wait_for_timeout(300)
        assert await pg.locator('[data-out="fill"] label.fchk.hecho').count() == 1, 'se recuerda'
        # registrar sin terminar: avisa de lo que falta y no guarda
        n0 = await pg.evaluate("st.llen.length")
        await pg.click('[data-act="lf-open"][data-t="llenado"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="lf-save"]'); await pg.wait_for_timeout(500)
        ban = await pg.text_content('.panel .banner'); print(ban); assert 'FALTA POR MARCAR' in ban.upper() and 'AGUA' in ban.upper()
        assert await pg.evaluate("st.llen.length") == n0, 'no se guarda todavía'
        await pg.screenshot(path='pruebas/salida/t112-falta.png', full_page=True)
        await pg.click('[data-act="lf-falta-no"]'); await pg.wait_for_timeout(300); assert await pg.locator('.panel .banner').count() == 0
        # marcar el resto: todo echado y guarda directo
        for i in range(n):
            l = pg.locator('[data-out="fill"] label.fchk').nth(i)
            if 'hecho' not in (await l.get_attribute('class')): await l.click(); await pg.wait_for_timeout(120)
        await pg.locator('[data-out="fill"] label.fchk').nth(n-1).click(); await pg.wait_for_timeout(150); await pg.locator('[data-out="fill"]').screenshot(path='pruebas/salida/t112-casi.png'); await pg.locator('[data-out="fill"] label.fchk').nth(n-1).click(); await pg.wait_for_timeout(150)
        assert 'TODO ECHADO' in (await pg.text_content('[data-out="fcnt"]')).upper()
        await pg.locator('[data-out="fill"]').screenshot(path='pruebas/salida/t112-todo.png')
        await pg.click('[data-act="lf-save"]'); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("st.llen.length") == n0 + 1 and await pg.evaluate("!st.lf"), 'guardado'
        assert await pg.evaluate("!st.llen[0].sinMarcar")
        assert await pg.locator('[data-out="fill"] label.fchk.hecho').count() == 0 and await pg.evaluate(f"!(JSON.parse(localStorage.getItem('abono.fillchk')||'{{}}')[hoy()+'|{bid}'])"), 'la lista se vacía'
        # guardar sin marcar nada: se puede, y queda apuntado
        await pg.click('[data-act="lf-open"][data-t="llenado"]'); await pg.wait_for_timeout(300)
        await pg.fill('#lf_add', '50'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="lf-save"]'); await pg.wait_for_timeout(400)
        await pg.click('[data-act="lf-save-igual"]'); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("st.llen.length") == n0 + 2 and len(await pg.evaluate("st.llen[0].sinMarcar")) == n
        assert 'SIN MARCAR' in (await pg.text_content('#main')).upper()
        # lo de ayer no se arrastra
        await pg.evaluate(f"localStorage.setItem('abono.fillchk',JSON.stringify({{'2020-01-01|{bid}':['agua']}}));st.fchk=null;renderMain()"); await pg.wait_for_timeout(200)
        assert await pg.locator('[data-out="fill"] label.fchk.hecho').count() == 0
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

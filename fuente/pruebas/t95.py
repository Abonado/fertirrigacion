"""Avisos ordenados: «N depósitos para rellenar» con el detalle agrupado por cabezal (los compartidos juntos) y el nivel de cada uno,
en Tu día y en la tarjeta de la finca, en vez de una frase larga."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1200}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # todos los depósitos al 8 % (bajos)
        await pg.evaluate("window.nivel=b=>({rest:b.capacidad/b.lpcm*.08,max:b.capacidad/b.lpcm});renderSplash();spRes()"); await pg.wait_for_timeout(400)
        it = pg.locator('#sp_res .ritem', has_text='para rellenar')
        t = await it.locator('.rt').text_content(); print('título:', t); assert t.endswith('depósitos para rellenar') and ':' not in t
        grupos = await it.locator('.agl').all_text_contents(); print('grupos:', grupos)
        assert 'Gasolinera' in grupos and 'Gasolinera + Planos' in grupos and 'Franco' in grupos
        chips = await it.locator('.ach').all_text_contents(); assert chips and all('8 %' in c for c in chips), chips
        n = int(t.split()[0]); assert len(chips) == n, 'un recuadro por depósito'
        await pg.evaluate("cerrarSplash();abrirFincas()"); await pg.wait_for_timeout(600)
        av = pg.locator('#fincas .fcard').first.locator('.av', has_text='para rellenar')
        assert await av.locator('.agl').count() >= 3 and ':' not in await av.locator('.at').text_content()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

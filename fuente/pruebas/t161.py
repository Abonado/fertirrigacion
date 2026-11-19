"""v224: el lector del uCrop identifica la pantalla por su título («UCROP | SE01FRANCO», «UCROP | Drenaje 1»), no por el texto de la página
(la de programas lista todos los programas). Se prueba la función que corre dentro de la página con páginas de mentira."""
import asyncio, re, sys
from playwright.async_api import async_playwright
SRC = open('lector-clima/background.js').read()
m = re.search(r'async function ucropMira\(campo, nombreEsperado\) \{.*?\n\}\n', SRC, re.S); assert m, 'no encuentro ucropMira'
FN = m.group(0)
def pagina(titulo, campo, valor, otros=''):
    return f'<!doctype html><title>{titulo}</title><body><table><tr><td>SE01FRANCO</td><td>SEO2FRANCO</td><td>SEO3ALTO</td><td>SE04ENCAÑE</td></tr></table>{otros}<input formcontrolname="{campo}" value="{valor}"></body>'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        async def mira(html, campo, esperado):
            await pg.set_content(html); return await pg.evaluate("([f,c,n])=>(0,eval('('+f+')'))(c,n)", [FN, campo, esperado])
        # la de verdad: título y nombre coinciden
        r = await mira(pagina('UCROP | SE01FRANCO', 'idealEC', '1,87'), 'ce', 'SE01FRANCO'); assert r['ok'] and r['coincide'] and r['valor'] == 1.87 and r['titulo'] == 'SE01FRANCO', r
        # letra O o cero en el nombre: da igual
        r = await mira(pagina('UCROP | SEO2FRANCO', 'idealEC', '1.87'), 'ce', 'SE02FRANCO'); assert r['coincide'], r
        # OTRO programa en pantalla: el nombre esperado sale en la tabla, pero el título dice otro → NO coincide (esto era lo que fallaba antes)
        r = await mira(pagina('UCROP | SE01FRANCO', 'idealEC', '1,87'), 'ce', 'SEO2FRANCO'); assert r['ok'] and not r['coincide'] and r['titulo'] == 'SE01FRANCO', r
        # drenajes: «Drenaje 2» no vale en la pantalla de «Drenaje 1»
        r = await mira(pagina('UCROP | Drenaje 1', 'controlRadiation', '150'), 'control', 'Drenaje 2'); assert not r['coincide'] and r['valor'] == 150, r
        r = await mira(pagina('UCROP | Drenaje 3', 'controlRadiation', '150'), 'control', 'Drenaje 3'); assert r['coincide'], r
        # sin título de uCrop (p. ej. página de entrada): no se da por buena
        r = await mira(pagina('Entrar', 'idealEC', '1'), 'ce', 'SE01FRANCO'); assert r['ok'] and not r['coincide'] and r['titulo'] == '', r
        # sin el campo: no se puede
        await pg.set_content('<title>UCROP | SE01FRANCO</title><body>nada</body>')
        r = await pg.evaluate("([f,c,n])=>(0,eval('('+f+')'))(c,n)", [FN, 'ce', 'SE01FRANCO']); assert not r['ok'], r
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

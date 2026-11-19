"""v224: el lector del uCrop identifica la pantalla por su título («UCROP | SE01FRANCO», «UCROP | Drenaje 1»), no por el texto de la página
(la de programas lista todos los programas). Se prueba la función que corre dentro de la página con páginas de mentira."""
import asyncio, re, sys
from playwright.async_api import async_playwright
SRC = open('lector-clima/background.js').read()
m = re.search(r'async function ucropMira\(campo, nombreEsperado, ensayoValor\) \{.*?\n\}\n', SRC, re.S); assert m, 'no encuentro ucropMira'
FN = m.group(0)
def pagina(titulo, campo, valor, otros=''):
    return f'<!doctype html><title>{titulo}</title><body><table><tr><td>SE01FRANCO</td><td>SEO2FRANCO</td><td>SEO3ALTO</td><td>SE04ENCAÑE</td></tr></table>{otros}<input formcontrolname="{campo}" value="{valor}"></body>'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        async def mira(html, campo, esperado, ens=None):
            await pg.set_content(html); return await pg.evaluate("([f,c,n,e])=>(0,eval('('+f+')'))(c,n,e)", [FN, campo, esperado, ens])
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
        # ENSAYO (v2): escribe, ve que «Guardar» se activa, deja el valor de antes y NO pulsa nada
        def pag_ens(titulo, campo, valor, activa=True):
            return f"""<!doctype html><title>{titulo}</title><body><input formcontrolname="{campo}" value="{valor}">
              <button id="g" disabled>Guardar drenaje</button><button id="otro">Cancelar</button>
              <script>(()=>{{window.__clics=0;document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>window.__clics++));
              const inp=document.querySelector('input');{"inp.addEventListener('input',()=>{document.getElementById('g').disabled=false});" if activa else ""}}})()</script></body>"""
        r = await mira(pag_ens('UCROP | Drenaje 2', 'controlRadiation', '150'), 'control', 'Drenaje 2', 33)
        e = r['ensayo']; assert r['coincide'] and e['leido'] == 33 and e['guardarActivo'] and e['restaurado'] and e['original'] == '150', r
        assert await pg.evaluate("document.querySelector('input').value") == '150' and await pg.evaluate("window.__clics") == 0, 'tocó algo'
        # con coma decimal, la escribe con coma y la deja como estaba
        r = await mira(pag_ens('UCROP | SE01FRANCO', 'idealEC', '1,87'), 'ce', 'SE01FRANCO', 2.5)
        e = r['ensayo']; assert e['leido'] == 2.5 and e['restaurado'] and e['original'] == '1,87', r
        # si «Guardar» no se activa, lo dice
        r = await mira(pag_ens('UCROP | Drenaje 2', 'controlRadiation', '150', activa=False), 'control', 'Drenaje 2', 33)
        assert r['ensayo']['guardarActivo'] is False and r['ensayo']['restaurado'], r
        # Angular real: «Guardar» solo se activa al salir del campo → el lector sale del campo y lo detecta
        r = await mira(pag_ens('UCROP | Drenaje 2', 'controlRadiation', '150', activa=False).replace("</script>", ";document.querySelector('input').addEventListener('blur',()=>{document.getElementById('g').disabled=false});</script>").replace("(()=>{{", "(()=>{{"), 'control', 'Drenaje 2', 33)
        assert r['ensayo']['guardarActivo'] and r['ensayo']['con'] == 'salir del campo' and r['ensayo']['restaurado'], r
        assert await pg.evaluate("window.__clics") == 0, 'tocó algo'
        # pantalla equivocada: no escribe nada
        r = await mira(pag_ens('UCROP | Drenaje 1', 'controlRadiation', '150'), 'control', 'Drenaje 2', 33)
        assert not r['coincide'] and 'ensayo' not in r, r
        assert await pg.evaluate("document.querySelector('input').value") == '150', 'escribió en la pantalla equivocada'
        # el ÚNICO clic de todo el lector está dentro de ucropGuarda; ucropMira (lo que mira y ensaya) no pulsa nada
        assert SRC.count('.click(') == 1, 'tiene que haber un solo clic en el lector'
        assert '.click(' not in FN, 'ucropMira pulsa algo'
        assert re.search(r'async function ucropGuarda\(.*?\n\}\n', SRC, re.S).group(0).count('.click(') == 1
        # límites y modos del lector
        assert "UC_MODOS = ['prueba', 'ensayo', 'cambio']" in SRC and 'valor fuera de los límites' in SRC
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

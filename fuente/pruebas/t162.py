"""v226: cambio real del uCrop. (1) ucropGuarda en un navegador con páginas de mentira: solo pulsa «Guardar drenaje/programa» y solo si todo cuadra.
(2) el lector entero (simulado) con sus salvaguardas: pruebas/datos/prueba-lector-cambio.mjs"""
import asyncio, re, subprocess, sys
from playwright.async_api import async_playwright
SRC = open('lector-clima/background.js').read()
m = re.search(r'async function ucropGuarda\(campo, nombreEsperado, nuevo, antes\) \{.*?\n\}\n', SRC, re.S); assert m, 'no encuentro ucropGuarda'
FN = m.group(0)
r = subprocess.run(['node', 'pruebas/datos/prueba-lector-cambio.mjs'], capture_output=True, text=True); print(r.stdout.strip(), r.stderr.strip()[:300]); assert r.returncode == 0 and 'OK' in r.stdout, 'simulación del lector'
def pagina(titulo, campo, valor, boton='Guardar drenaje', activa='input', extra=''):
    ev = {'input': "inp.addEventListener('input',()=>{g.disabled=false});", 'blur': "inp.addEventListener('blur',()=>{g.disabled=false});", 'nunca': ''}[activa]
    return f"""<!doctype html><title>{titulo}</title><body><input formcontrolname="{campo}" value="{valor}">{extra}
      <button id="g" disabled>{boton}</button><button id="cancel">Cancelar</button><button id="gs">Guardar y salir</button>
      <script>(()=>{{window.__clics=[];document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>window.__clics.push(b.id+'='+document.querySelector('input').value)));
      const inp=document.querySelector('input'),g=document.getElementById('g');{ev}}})()</script></body>"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        async def guarda(html, campo, nom, nuevo, antes):
            await pg.set_content(html); return await pg.evaluate("([f,c,n,v,a])=>(0,eval('('+f+')'))(c,n,v,a)", [FN, campo, nom, nuevo, antes])
        clics = lambda: pg.evaluate("window.__clics"); val = lambda: pg.evaluate("document.querySelector('input').value")
        # lo normal: pulsa SOLO «Guardar drenaje» una vez, con el valor nuevo escrito
        r = await guarda(pagina('UCROP | Drenaje 1', 'controlRadiation', '150'), 'control', 'Drenaje 1', 200, 150)
        assert r['ok'] and r['coincide'] and r['estado'] == 'pulsado' and r['leido'] == 200, r
        assert await clics() == ['g=200'], await clics()
        # programa (CE): botón «Guardar programa», con coma decimal
        r = await guarda(pagina('UCROP | SEO3ALTO', 'idealEC', '1,87', boton='Guardar programa'), 'ce', 'SE03ALTO', 2.1, 1.87)
        assert r['estado'] == 'pulsado' and await clics() == ['g=2,1'], (r, await clics())
        # «Guardar» solo se activa al salir del campo (Angular real)
        r = await guarda(pagina('UCROP | Drenaje 2', 'controlRadiation', '150', activa='blur'), 'control', 'Drenaje 2', 180, 150)
        assert r['estado'] == 'pulsado' and await clics() == ['g=180'], (r, await clics())
        # el valor de ahora NO es el que se confirmó: no escribe ni pulsa
        r = await guarda(pagina('UCROP | Drenaje 1', 'controlRadiation', '160'), 'control', 'Drenaje 1', 200, 150)
        assert r['estado'] == 'distinto' and r['valor'] == 160 and await clics() == [] and await val() == '160', r
        # ya está en el valor nuevo: no pulsa
        r = await guarda(pagina('UCROP | Drenaje 1', 'controlRadiation', '200'), 'control', 'Drenaje 1', 200, 150)
        assert r['estado'] == 'yaestaba' and await clics() == [], r
        # pantalla equivocada (título de otro drenaje): no escribe ni pulsa
        r = await guarda(pagina('UCROP | Drenaje 3', 'controlRadiation', '150'), 'control', 'Drenaje 1', 200, 150)
        assert not r['coincide'] and await clics() == [] and await val() == '150', r
        # sin título de uCrop: tampoco
        r = await guarda(pagina('Entrar', 'controlRadiation', '150'), 'control', 'Drenaje 1', 200, 150)
        assert not r['coincide'] and await clics() == [], r
        # «Guardar» no se activa: deja el valor como estaba y no pulsa nada
        r = await guarda(pagina('UCROP | Drenaje 1', 'controlRadiation', '150', activa='nunca'), 'control', 'Drenaje 1', 200, 150)
        assert r['estado'] == 'noactivo' and await clics() == [] and await val() == '150', (r, await val())
        # botón equivocado (en la pantalla de drenaje solo hay «Guardar programa»): no pulsa ninguno, ni «Guardar y salir»
        r = await guarda(pagina('UCROP | Drenaje 1', 'controlRadiation', '150', boton='Guardar programa'), 'control', 'Drenaje 1', 200, 150)
        assert r['estado'] == 'boton' and await clics() == [] and await val() == '150', r
        # datos incompletos de la orden: no hace nada
        for args in [('control', '', 200, 150), ('control', 'Drenaje 1', 200, None), ('control', 'Drenaje 1', None, 150), ('zzz', 'Drenaje 1', 200, 150)]:
            r = await guarda(pagina('UCROP | Drenaje 1', 'controlRadiation', '150'), *args); assert not r['ok'] and await clics() == [], (args, r)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

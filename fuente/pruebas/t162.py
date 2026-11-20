"""v226: cambio real del uCrop. (1) ucropGuarda en un navegador con páginas de mentira: solo pulsa «Guardar drenaje/programa» y solo si todo cuadra.
(2) el lector entero (simulado) con sus salvaguardas: pruebas/datos/prueba-lector-cambio.mjs"""
import asyncio, re, subprocess, sys
from playwright.async_api import async_playwright
SRC = open('lector-clima/background.js').read()
m = re.search(r'async function ucropGuarda\(campo, nombreEsperado, nuevo, antes\) \{.*?\n\}\n', SRC, re.S); assert m, 'no encuentro ucropGuarda'
FN = m.group(0)
r = subprocess.run(['node', 'pruebas/datos/prueba-lector-cambio.mjs'], capture_output=True, text=True); print(r.stdout.strip(), r.stderr.strip()[:300]); assert r.returncode == 0 and 'OK' in r.stdout, 'simulación del lector'
def pagina(titulo, campo, valor, boton='Guardar drenaje', activa='input', extra='', aviso=''):
    ev = {'input': "inp.addEventListener('input',()=>{g.disabled=false});", 'blur': "inp.addEventListener('blur',()=>{g.disabled=false});", 'nunca': ''}[activa]
    av = f"g.addEventListener('click',()=>setTimeout(()=>document.body.insertAdjacentHTML('beforeend',{aviso!r}),300));" if aviso else ''
    return f"""<!doctype html><title>{titulo}</title><body><input formcontrolname="{campo}" value="{valor}">{extra}
      <button id="g" disabled>{boton}</button><button id="cancel">Cancelar</button><button id="gs">Guardar y salir</button>
      <script>(()=>{{window.__clics=[];document.addEventListener('click',e=>{{const b=e.target.closest('button');if(b)window.__clics.push(b.id+'='+document.querySelector('input').value)}});
      const inp=document.querySelector('input'),g=document.getElementById('g');{ev}{av}}})()</script></body>"""
SEGURO = '<div role="dialog"><p>¿Está seguro? Los cambios realizados en este apartado pueden afectar a los programas asociados. ¿Quieres continuar?</p>%s</div>'
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
        # el uCrop pide confirmar el guardado («¿Está seguro? … programas asociados»): se acepta SU botón de aceptar, y solo ese
        r = await guarda(pagina('UCROP | Drenaje 1', 'controlRadiation', '150', aviso=SEGURO % '<button id="cancel2">Cancelar</button><button id="ok">Aceptar</button>'), 'control', 'Drenaje 1', 200, 150)
        assert r['estado'] == 'pulsado' and r['confirmado'] == 'aceptar' and await clics() == ['g=200', 'ok=200'], (r, await clics())
        # un aviso de otra cosa no se acepta
        r = await guarda(pagina('UCROP | Drenaje 1', 'controlRadiation', '150', aviso='<div role="dialog"><p>¿Borrar el programa?</p><button id="ok">Aceptar</button></div>'), 'control', 'Drenaje 1', 200, 150)
        assert r['estado'] == 'pulsado' and not r['confirmado'] and await clics() == ['g=200'], (r, await clics())
        # el aviso bueno pero con dos botones de aceptar posibles, o sin ninguno: no pulsa ninguno
        for bots in ['<button id="ok">Aceptar</button><button id="ok2">Continuar</button>', '<button id="cancel2">Cancelar</button>', '<button id="x">Quizá</button>']:
            r = await guarda(pagina('UCROP | Drenaje 1', 'controlRadiation', '150', aviso=SEGURO % bots), 'control', 'Drenaje 1', 200, 150)
            assert r['estado'] == 'aviso' and await clics() == ['g=200'], (bots, r, await clics())
        # HORARIO (interruptor): poner y quitar, solo el botón «Guardar programa»
        def sw(titulo, marcado, boton='Guardar programa', aviso=''):
            av = f"g.addEventListener('click',()=>setTimeout(()=>document.body.insertAdjacentHTML('beforeend',{aviso!r}),300));" if aviso else ''
            return f"""<!doctype html><title>{titulo}</title><body><input type="checkbox" formcontrolname="schedule" {'checked' if marcado else ''}>
              <button id="g" disabled>{boton}</button><button id="cancel">Cancelar</button>
              <script>(()=>{{window.__clics=[];document.addEventListener('click',e=>{{const b=e.target.closest('button');if(b)window.__clics.push(b.id+'='+(document.querySelector('input').checked?1:0))}});
              const inp=document.querySelector('input'),g=document.getElementById('g');inp.addEventListener('change',()=>{{g.disabled=false}});{av}}})()</script></body>"""
        r = await guarda(sw('UCROP | SE01FRANCO', False), 'horario', 'SE01FRANCO', 1, 0)
        assert r['estado'] == 'pulsado' and r['leido'] == 1 and await clics() == ['g=1'], (r, await clics())
        r = await guarda(sw('UCROP | SE01FRANCO', True), 'horario', 'SE01FRANCO', 0, 1)
        assert r['estado'] == 'pulsado' and r['leido'] == 0 and await clics() == ['g=0'], (r, await clics())
        r = await guarda(sw('UCROP | SE01FRANCO', True, aviso=SEGURO % '<button id="cancel2">Cancelar</button><button id="ok">Aceptar</button>'), 'horario', 'SE01FRANCO', 0, 1)
        assert r['confirmado'] == 'aceptar' and await clics() == ['g=0', 'ok=0'], (r, await clics())
        r = await guarda(sw('UCROP | SE01FRANCO', True), 'horario', 'SE01FRANCO', 1, 0)   # el interruptor ya está como se pide
        assert r['estado'] == 'yaestaba' and await clics() == [], r
        r = await guarda(sw('UCROP | SE01FRANCO', False), 'horario', 'SE01FRANCO', 1, 1)   # (orden rara: antes = nuevo = 1, pero la pantalla está en 0)
        assert r['estado'] == 'distinto' and await clics() == [], r
        r = await guarda(sw('UCROP | SE01FRANCO', False), 'horario', 'SE01FRANCO', 2, 0); assert not r['ok'] and await clics() == [], r
        r = await guarda(sw('UCROP | SEO2FRANCO', False), 'horario', 'SE01FRANCO', 1, 0); assert not r['coincide'] and await clics() == [] and await pg.evaluate("document.querySelector('input').checked") is False, r
        r = await guarda(sw('UCROP | SE01FRANCO', False, boton='Guardar drenaje'), 'horario', 'SE01FRANCO', 1, 0)   # botón equivocado
        assert r['estado'] == 'boton' and await clics() == [] and await pg.evaluate("document.querySelector('input').checked") is False, r
        assert 'Guardar drenaj' in r['otros'] and 'Cancelar' in r['otros'] and r['url'], r   # diagnóstico: qué botones hay
        # DÍAS DE LA SEMANA (L M X J V S D): pulsa solo los botones de día que cambian y luego «Guardar programa»
        def dias(titulo, mask, modo='WEEK', boton='Guardar programa', aviso=''):
            nom = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            cs = ''.join(f'<input type="checkbox" id="week_{d}-0" {"checked" if (mask >> i) & 1 else ""}>' for i, d in enumerate(nom))
            av = f"g.addEventListener('click',()=>setTimeout(()=>document.body.insertAdjacentHTML('beforeend',{aviso!r}),300));" if aviso else ''
            return f"""<!doctype html><title>{titulo}</title><body><input type="radio" formcontrolname="week_days" name="w" value="WEEK" {'checked' if modo=='WEEK' else ''}><input type="radio" formcontrolname="week_days" name="w" value="DAYS" {'checked' if modo=='DAYS' else ''}>{cs}
              <button id="g" disabled>{boton}</button><button id="cancel">Cancelar</button>
              <script>(()=>{{const m=()=>[...document.querySelectorAll('input[type=checkbox]')].reduce((a,e,i)=>a|(e.checked?1<<i:0),0);window.__m=m;window.__clics=[];
              document.addEventListener('click',e=>{{const b=e.target.closest('button');if(b)window.__clics.push(b.id+'='+m())}});
              const g=document.getElementById('g');document.querySelectorAll('input[type=checkbox]').forEach(e=>e.addEventListener('change',()=>{{if(g)g.disabled=false}}));{av}}})()</script></body>"""
        def dias_label(titulo, mask):
            # como el uCrop real puede estar hecho: solo la ETIQUETA visible del día avisa del cambio; pulsar el input escondido no hace salir «Guardar»
            nom = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            cs = ''.join(f'<input type="checkbox" class="btn-check" id="week_{d}-0" {"checked" if (mask >> i) & 1 else ""}><label for="week_{d}-0">{"LMXJVSD"[i]}</label>' for i, d in enumerate(nom))
            return f"""<!doctype html><title>{titulo}</title><body><input type="radio" formcontrolname="week_days" name="w" value="WEEK" checked><input type="radio" formcontrolname="week_days" name="w" value="DAYS">{cs}
              <div id="barra"></div><script>(()=>{{const m=()=>[...document.querySelectorAll('input[type=checkbox]')].reduce((a,e,i)=>a|(e.checked?1<<i:0),0);window.__m=m;window.__clics=[];
              document.querySelectorAll('label').forEach(l=>l.addEventListener('click',()=>{{if(!document.getElementById('g'))document.getElementById('barra').innerHTML='<button id="g">Guardar programa</button>'}}));
              document.addEventListener('click',e=>{{const b=e.target.closest('button');if(b)window.__clics.push(b.id+'='+m())}});}})()</script></body>"""
        r = await guarda(dias_label('UCROP | SE01FRANCO', 127), 'dias', 'SE01FRANCO', 125, 127)
        assert r['estado'] == 'pulsado' and r['leido'] == 125 and await clics() == ['g=125'], (r, await clics())
        # si la barra Guardar nunca sale: deja los días como estaban y lo cuenta
        r = await guarda(dias('UCROP | SE01FRANCO', 127).replace('<button id="g" disabled>Guardar programa</button>', ''), 'dias', 'SE01FRANCO', 125, 127)
        assert r['estado'] == 'boton' and await pg.evaluate("window.__m()") == 127 and 'nb' in r, r
        INFO = '<div role="dialog"><p>Los cambios se han guardado y están pendientes de ser aceptados por el dispositivo</p><button id="acep">Aceptar</button></div>'
        r = await guarda(dias('UCROP | SE01FRANCO', 127), 'dias', 'SE01FRANCO', 125, 127)   # quitar el martes
        assert r['estado'] == 'pulsado' and r['leido'] == 125 and await clics() == ['g=125'], (r, await clics())
        r = await guarda(dias('UCROP | SE01FRANCO', 125, aviso=INFO), 'dias', 'SE01FRANCO', 127, 125)   # volver a ponerlo, con el aviso real del uCrop
        assert r['estado'] == 'pulsado' and r['leido'] == 127 and 'se han guardado' in r['info'] and r['confirmado'] == '' and await clics() == ['g=127'], (r, await clics())   # no pulsa «Aceptar»
        r = await guarda(dias('UCROP | SE01FRANCO', 127), 'dias', 'SE01FRANCO', 127, 125); assert r['estado'] == 'yaestaba' and await clics() == [], r
        r = await guarda(dias('UCROP | SE01FRANCO', 127), 'dias', 'SE01FRANCO', 5, 125); assert r['estado'] == 'distinto' and await clics() == [] and await pg.evaluate("window.__m()") == 127, r
        r = await guarda(dias('UCROP | SE01FRANCO', 127, modo='DAYS'), 'dias', 'SE01FRANCO', 125, 127); assert not r['ok'] and 'Semana' in r['motivo'] and await clics() == [] and await pg.evaluate("window.__m()") == 127, r
        r = await guarda(dias('UCROP | SE01FRANCO', 127), 'dias', 'SE01FRANCO', 0, 127); assert not r['ok'] and await clics() == [], r   # ningún día: no se permite
        r = await guarda(dias('UCROP | SEO2FRANCO', 127), 'dias', 'SE01FRANCO', 125, 127); assert not r['coincide'] and await clics() == [] and await pg.evaluate("window.__m()") == 127, r
        r = await guarda(dias('UCROP | SE01FRANCO', 127, boton='Guardar drenaje'), 'dias', 'SE01FRANCO', 125, 127)   # botón equivocado: deja los días como estaban
        assert r['estado'] == 'boton' and await clics() == [] and await pg.evaluate("window.__m()") == 127, r
        # RESTO DE CAMPOS DEL PROGRAMA: números (riegos, radiación acumulada, pH), interruptores (lluvia/viento/helada) y el desplegable de prioridad
        r = await guarda(pagina('UCROP | SE01FRANCO', 'maxActivations', '20', boton='Guardar programa'), 'riegos', 'SE01FRANCO', 12, 20)
        assert r['estado'] == 'pulsado' and r['leido'] == 12 and await clics() == ['g=12'], (r, await clics())
        r = await guarda(pagina('UCROP | SE01FRANCO', 'acummulatedRadiation', '12000', boton='Guardar programa'), 'rad', 'SE01FRANCO', 9000, 12000)
        assert r['estado'] == 'pulsado' and await clics() == ['g=9000'], (r, await clics())
        r = await guarda(pagina('UCROP | SE01FRANCO', 'idealPH', '5,5', boton='Guardar programa'), 'ph', 'SE01FRANCO', 5.8, 5.5)
        assert r['estado'] == 'pulsado' and await clics() == ['g=5,8'], (r, await clics())
        for campo, fcn in [('lluvia', 'stopRain'), ('viento', 'stopStorm'), ('helada', 'stopFrost')]:
            r = await guarda(sw('UCROP | SE01FRANCO', True).replace('formcontrolname="schedule"', f'formcontrolname="{fcn}"'), campo, 'SE01FRANCO', 0, 1)
            assert r['estado'] == 'pulsado' and r['leido'] == 0 and await clics() == ['g=0'], (campo, r, await clics())
        def prio(titulo, valor):
            opts = ''.join(f'<option value="{v}" {"selected" if v == valor else ""}>{v}</option>' for v in ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST', 'TOTAL'])
            return f"""<!doctype html><title>{titulo}</title><body><select formcontrolname="priority">{opts}</select><button id="g" disabled>Guardar programa</button>
              <script>(()=>{{window.__clics=[];document.addEventListener('click',e=>{{const b=e.target.closest('button');if(b)window.__clics.push(b.id+'='+document.querySelector('select').value)}});
              document.querySelector('select').addEventListener('change',()=>{{document.getElementById('g').disabled=false}})}})()</script></body>"""
        r = await guarda(prio('UCROP | SE01FRANCO', 'MEDIUM'), 'prioridad', 'SE01FRANCO', 4, 2)
        assert r['estado'] == 'pulsado' and r['leido'] == 4 and await clics() == ['g=HIGHEST'], (r, await clics())
        r = await guarda(prio('UCROP | SE01FRANCO', 'MEDIUM'), 'prioridad', 'SE01FRANCO', 9, 2); assert not r['ok'] and await clics() == [], r
        r = await guarda(prio('UCROP | SE01FRANCO', 'LOW'), 'prioridad', 'SE01FRANCO', 4, 2); assert r['estado'] == 'distinto' and await clics() == [], r   # ahora es Baja, no Media
        r = await guarda(prio('UCROP | SE01FRANCO', 'HIGHEST'), 'prioridad', 'SE01FRANCO', 4, 2); assert r['estado'] == 'yaestaba' and await clics() == [], r
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

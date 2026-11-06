"""Nutrientes que se respetan al cambiar la CE (v197): la solución del técnico en meq/L o mmol/L; «CE del riego que quieres» escala la
solución (todo en proporción o manteniendo el nitrógeno) y salen los kg; «¿Se está respetando?» compara receta y cuentas con el técnico;
aviso en Ajuste del riego; botón de «Más CE» a la calculadora; y consejo de riego extra de lavado."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("""(()=>{cerrarSplash();st.finca='pinta';st.cab='gas';const D=nuDraft();Object.assign(D.agua.v,{HCO3:3,Ca:3,Mg:2,Na:3,Cl:3,SO4:2,NO3:0.3,K:0.2});st.tab='solucion';renderAll()})()"""); await pg.wait_for_timeout(600)
        # mmol/L: el calcio de 9 meq/L se ve como 4,5 mmol/L; escribir 4 mmol/L guarda 8 meq/L
        await pg.click('[data-nu-ou="mmol"]'); await pg.wait_for_timeout(300)
        assert await pg.input_value('[data-nu="obj.a.Ca"]') == '4,5' and await pg.input_value('[data-nu="obj.a.K"]') == '7,5'
        await pg.fill('[data-nu="obj.a.Ca"]', '4'); await pg.locator('[data-nu="obj.a.Ca"]').dispatch_event('change'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("nuDraft().obj.a.Ca") == 8
        await pg.click('[data-nu-ou="meq"]'); await pg.wait_for_timeout(200)
        ce0 = await pg.evaluate("nuCalc(nuDraft()).ce"); print('CE tal cual', ce0)
        # CE que quiero: 0,3 más, todo en proporción
        meta = round(ce0 + 0.3, 2)
        await pg.fill('[data-nu="obj.ce"]', str(meta).replace('.', ',')); await pg.locator('[data-nu="obj.ce"]').dispatch_event('change'); await pg.wait_for_timeout(400)
        E = await pg.evaluate("(()=>{const D=nuDraft(),E=nuObjEf(D);return{f:E.f,ce:nuCalc(E.D).ce,a:E.D.obj.a,a0:D.obj.a}})()"); print(E)
        assert abs(E['ce'] - meta) < 0.02 and E['f'] > 1
        assert abs(E['a']['NO3'] / E['a0']['NO3'] - E['a']['K'] / E['a0']['K']) < 0.01, 'todo en proporción'
        t = await pg.text_content('#main'); assert 'se multiplica' in t and 'mS/cm (×' in t
        # mantener el nitrógeno: el nitrato no se mueve, sube el potasio
        await pg.select_option('[data-nu="obj.modo"]', 'k'); await pg.wait_for_timeout(400)
        E = await pg.evaluate("(()=>{const D=nuDraft(),E=nuObjEf(D);return{f:E.f,ce:nuCalc(E.D).ce,a:E.D.obj.a,a0:D.obj.a,tope:E.tope||null}})()"); print(E)
        assert E['a']['NO3'] == E['a0']['NO3'] and E['a']['Ca'] == E['a0']['Ca'] and E['a']['K'] > E['a0']['K'] and (abs(E['ce'] - meta) < 0.02 or E['tope'])
        # pasar a la receta usa el objetivo escalado
        await pg.select_option('[data-nu="obj.modo"]', 'prop'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="nu-aplicar"]'); await pg.wait_for_timeout(600)
        kn = await pg.evaluate("(()=>{const R=nuCalc(nuObjEf(nuDraft()).D);return [R.prods.find(x=>x.app==='kno3'),nuReceta('gas','kno3')]})()")
        print('kno3', kn[0] and kn[0]['dosis'], kn[1])
        if kn[0] and kn[1] is not None: assert abs(kn[0]['dosis'] - kn[1]) < 0.2
        # ¿se está respetando?: la receta da lo calculado; de verdad se ha echado un 70 %
        await pg.evaluate("window.dosisReal=(b,x)=>x.dosis*0.7;st.tab='solucion';renderMain()"); await pg.wait_for_timeout(400)
        t = await pg.text_content('#main'); assert '¿Se está respetando?' in t and 'Ha dado de verdad' in t and 'Pide el técnico' in t, t[-800:]
        rojos = await pg.locator('.nurt tr:nth-child(3) .pill.bad').count(); assert rojos >= 2, rojos
        await pg.locator('.nurt').screenshot(path='pruebas/salida/t140-respeta.png')
        # guardar y ver el aviso en Ajuste del riego
        await pg.click('[data-act="nu-guardar"]'); await pg.wait_for_timeout(800)
        await pg.evaluate("st.tab='ajriego';renderAll()"); await pg.wait_for_timeout(900)
        av = await pg.text_content('#main .nuav'); print(av); assert 'frente a lo que pide el técnico' in av and 'mal' in await pg.get_attribute('#main .nuav', 'class')
        # botón de «Más CE» → calculadora con la CE puesta
        await pg.evaluate("document.querySelector('#main').insertAdjacentHTML('afterbegin','<button id=\"bce\" data-nuce=\"2.95\">x</button>')")
        await pg.click('#bce'); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.tab") == 'solucion' and await pg.evaluate("nuDraft().obj.ce") == 2.95
        # riego de lavado: drenaje a 5,5 con riego a 2,8 → sí conviene; 15 min con riegos de 8 = 1,9 riegos; drenaría ~57 %
        L = await pg.evaluate("ajrLavado({ce:{c:{ceD:5.5,ceI:2.8,inc:1.9,D:20,f:hoy()}},hoy:{pulso:8}},15,'mitad')"); print(L)
        assert L['v'] == 'si' and abs(L['veces'] - 1.875) < 1e-9 and abs(L['dR'] - 57.33) < 0.1 and abs(L['ceR'] - 1.85) < 1e-9
        assert (await pg.evaluate("ajrLavado({ce:{c:{ceD:4.3,ceI:2.8,inc:1.9,D:20,f:hoy()}},hoy:{pulso:8}},15,'normal')"))['v'] == 'reparte'
        assert (await pg.evaluate("ajrLavado({ce:{c:{ceD:3.3,ceI:2.8,inc:1.9,D:20,f:hoy()}},hoy:{pulso:8}},15,'normal')"))['v'] == 'no'
        hl = await pg.evaluate("ajrLavHTML({s:{id:'x'},ce:{c:{ceD:5.5,ceI:2.8,inc:1.9,D:20,f:hoy()}},hoy:{pulso:8}})")
        assert 'Sí conviene' in hl and '1,9 riegos normales' in hl and '1,85 mS/cm' in hl, hl
        assert 'Hace falta un día' in await pg.evaluate("ajrLavHTML({s:{id:'y'},ce:null,hoy:{pulso:8}})")
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 420, ancho
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

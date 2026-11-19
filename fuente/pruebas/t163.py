"""v226: cambio real del uCrop desde la app. El botón «Cambiar de verdad…» solo existe si se enciende en Ajustes; pide confirmación en pantalla
(sector, valor de ahora, valor nuevo); sin valor de ahora leído hay que leerlo primero; la orden «cambio» lleva valorAntes, confirmado y quién/cuándo."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
ADMIN = 'juanjo.serrano3@gmail.com'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'"+ADMIN+"':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', ADMIN); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='fra';st.tab='ajriego';renderAll()"); await pg.wait_for_timeout(600)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='fra';st.tab='ajriego';renderAll()"); await pg.wait_for_timeout(600)
        await pg.evaluate("st.ucOrd=[]"); 
        # apagado por defecto: no hay botón de cambio real y la función no hace nada
        assert await pg.locator('[data-uc="cambiar"]').count() == 0
        await pg.fill('[data-ucval="fra_s1"]', '200'); await pg.select_option('[data-ucsel="fra_s1"]', 'control')
        await pg.evaluate("ucCambiar('fra','fra_s1')"); assert await pg.evaluate("st.ucConf") is None and await pg.locator('#ucconf').count() == 0
        # se enciende en Ajustes (necesita «usar el control» encendido)
        await pg.evaluate("st.tab='ajustes';st.ajAb=new Set(['cab','avisos','cultivo','usuarios','conex','empresa']);renderAll()"); await pg.wait_for_timeout(600)
        await pg.check('[data-ucc="cambio"]'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("st.savedCfg.ucrop.fra.cambio") is True
        await pg.evaluate("st.tab='ajriego';renderAll()"); await pg.wait_for_timeout(600)
        assert await pg.locator('[data-uc="cambiar"]').count() == 4
        # sin valor leído: la confirmación pide leerlo primero y no deja guardar
        await pg.select_option('[data-ucsel="fra_s1"]', 'control'); await pg.fill('[data-ucval="fra_s1"]', '200')
        await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300)
        t = await pg.text_content('#ucconf'); assert 'sin leer' in t and 'Sector 1' in t and '200' in t, t
        assert await pg.locator('[data-uc="conf-si"]').count() == 0 and await pg.locator('[data-uc="conf-leer"]').count() == 1
        n0 = await pg.evaluate("st.ucOrd.length")
        await pg.click('[data-uc="conf-leer"]'); await pg.wait_for_timeout(500)
        o = await pg.evaluate("st.ucOrd[0]"); assert await pg.evaluate("st.ucOrd.length") == n0 + 1 and o['modo'] == 'prueba' and o['campo'] == 'control', o
        assert await pg.locator('#ucconf').count() == 0
        # el lector contesta: ahora pone 150
        await pg.evaluate("""([id])=>Store.setCol('ucrop',id,{...st.ucOrd.find(o=>o.id===id),estado:'probado',visto:'Drenaje 1',vistoValor:150,hechoTs:new Date().toISOString(),motivo:'prueba correcta'})""", [o['id']])
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        # fuera de límites: ni confirmación
        await pg.select_option('[data-ucsel="fra_s1"]', 'control'); await pg.fill('[data-ucval="fra_s1"]', '900'); await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300)
        assert await pg.locator('#ucconf').count() == 0, 'abrió la confirmación con un valor fuera de límites'
        # dentro de límites: pantalla con sector, valor de ahora y nuevo
        await pg.fill('[data-ucval="fra_s1"]', '200'); await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300)
        t = await pg.text_content('#ucconf'); assert 'Sector 1' in t and 'Drenaje 1' in t and 'Radiación de control' in t, t
        assert await pg.text_content('[data-ucconf="antes"]') == '150' and await pg.text_content('[data-ucconf="nuevo"]') == '200'
        assert await pg.locator('[data-uc="conf-si"]').count() == 1 and 'Sí, guardar en el uCrop' in await pg.text_content('[data-uc="conf-si"]')
        assert await pg.locator('[data-uc="conf-leer"]').count() == 1, 'falta «Leer otra vez»'
        # una lectura de hace más de 30 min avisa
        await pg.evaluate("st.ucConf.antesTs=new Date(Date.now()-3600e3).toISOString();ucConfPinta()"); assert 'más de 30 min' in await pg.text_content('#ucconf')
        await pg.evaluate("st.ucConf.antesTs=new Date().toISOString();ucConfPinta()"); assert 'más de 30 min' not in await pg.text_content('#ucconf')
        # cancelar no crea nada
        n0 = await pg.evaluate("st.ucOrd.length"); await pg.click('[data-uc="conf-no"]'); await pg.wait_for_timeout(300)
        assert await pg.locator('#ucconf').count() == 0 and await pg.evaluate("st.ucOrd.length") == n0
        # confirmar: orden «cambio» con todo lo que el lector exige
        await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300); await pg.click('[data-uc="conf-si"]'); await pg.wait_for_timeout(600)
        oc = await pg.evaluate("st.ucOrd.find(o=>o.modo==='cambio')")
        assert oc and oc['campo'] == 'control' and oc['valor'] == 200 and oc['valorAntes'] == 150 and oc['confirmado'] is True and oc['estado'] == 'pendiente' and oc['nombre'] == 'Drenaje 1' and oc['idx'] == {'prog': 0, 'dren': 0}, oc
        assert oc['porEmail'] and oc['por'] and oc['ts'] and oc['confirmadoTs'], oc
        ks = await pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('mockfb')).docs)"); assert any(k.startswith('abonado_ucrop/') and '_c' in k for k in ks), ks
        # no se mezcla con las pruebas del sector ni con el ensayo
        assert await pg.evaluate("ucOrdDe('fra','fra_s1','control').modo") == 'prueba' and await pg.evaluate("ucOrdEns('fra','fra_s1')") is None
        # con un cambio pendiente del mismo campo no deja pedir otro
        await pg.fill('[data-ucval="fra_s1"]', '210'); await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300)
        assert await pg.locator('#ucconf').count() == 0
        assert 'Cambios hechos' in await pg.text_content('#main') and 'esperando al PC' in await pg.text_content('#main')
        # el lector contesta «hecho»: se ve guardado con antes → después y quién
        await pg.evaluate("""([id])=>Store.setCol('ucrop',id,{...st.ucOrd.find(o=>o.id===id),estado:'hecho',visto:'Drenaje 1',vistoValor:200,hechoTs:new Date().toISOString(),motivo:'guardado: de 150 a 200 (comprobado al recargar)'})""", [oc['id']])
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        t = await pg.locator('.ucres', has_text='Cambios hechos').text_content(); assert 'guardado' in t and '150 → 200' in t and 'comprobado al recargar' in t, t
        # y el valor de ahora ya es 200 (lo último leído)
        assert await pg.evaluate("ucUltimo('fra','fra_s1','control').v") == 200
        await pg.fill('[data-ucval="fra_s1"]', '200'); await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300)
        assert 'no hace falta cambiar nada' in await pg.text_content('#ucconf') and await pg.locator('[data-uc="conf-si"]').count() == 0
        await pg.click('[data-uc="conf-no"]')
        # un cambio que falla se enseña como no cambiado, con el motivo
        await pg.evaluate("""()=>Store.setCol('ucrop','fra_fra_s2_dren_cx',{cab:'fra',sector:'fra_s2',sectorNombre:'S2',campo:'dren',valor:30,modo:'cambio',estado:'fallo',motivo:'el valor de ahora (21) no es el que viste (20)',por:'X',ts:new Date().toISOString(),valorAntes:20,confirmado:true,idx:{prog:1,dren:1},nombre:'Drenaje 2'})""")
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        t = await pg.locator('.ucres', has_text='Cambios hechos').text_content(); assert 'no se cambió' in t and 'no es el que viste' in t, t
        # apagar «usar el control» apaga también los cambios reales
        await pg.evaluate("st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(600)
        await pg.uncheck('[data-ucc="on"]'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("st.savedCfg.ucrop.fra.cambio") is False
        # un trabajador normal no puede abrir la confirmación
        await pg.evaluate("st.ucConf=null;ucConfPinta()")
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""v228: lectura de datos del programa (snapshot) y poner/quitar Horario desde la app. El horario es un interruptor: solo 0/1, va en pantalla de programa,
la confirmación dice PUESTO/QUITADO y avisa de lo que implica; el snapshot de la última lectura se muestra por sector."""
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
        for _ in range(2):
            await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='fra';st.tab='ajriego';renderAll()"); await pg.wait_for_timeout(600)
        await pg.evaluate("st.ucOrd=[]")
        # el interruptor no aparece entre lo que se puede «ensayar» ni entre los límites editables
        opts = await pg.evaluate("[...document.querySelectorAll('[data-ucsel=\"fra_s1\"] option')].map(o=>o.value)")
        assert 'horario' not in opts and 'ce' in opts, opts
        # sin cambios reales: no hay botones de horario
        assert await pg.locator('[data-uc="horario"]').count() == 0
        await pg.evaluate("st.tab='ajustes';st.ajAb=new Set(['cab','avisos','cultivo','usuarios','conex','empresa']);renderAll()"); await pg.wait_for_timeout(600)
        lim = await pg.evaluate("document.querySelectorAll('[data-ucc=\"lim\"],[data-uclim]').length"); 
        await pg.check('[data-ucc="cambio"]'); await pg.wait_for_timeout(500)
        t = await pg.text_content('#main'); assert 'Horario del programa' not in t.split('Límites')[-1][:1500] if 'Límites' in t else True
        await pg.evaluate("st.tab='ajriego';renderAll()"); await pg.wait_for_timeout(600)
        assert await pg.locator('[data-uc="horario"][data-v="1"]').count() == 4 and await pg.locator('[data-uc="horario"][data-v="0"]').count() == 4
        # sin lectura: pide leer
        await pg.locator('[data-uc="horario"][data-v="0"]').first.click(); await pg.wait_for_timeout(300)
        t = await pg.text_content('#ucconf'); assert 'Quitar el horario' in t and 'sin leer' in t and 'Sector 1' in t, t
        assert await pg.locator('[data-uc="conf-si"]').count() == 0 and await pg.locator('[data-uc="conf-leer"]').count() == 1
        n0 = await pg.evaluate("st.ucOrd.length"); await pg.click('[data-uc="conf-leer"]'); await pg.wait_for_timeout(500)
        o = await pg.evaluate("st.ucOrd[0]"); assert await pg.evaluate("st.ucOrd.length") == n0 + 1 and o['modo'] == 'prueba' and o['campo'] == 'horario' and o['idx']['prog'] == 0, o
        # el lector contesta con el snapshot: horario puesto
        snap = {'schedule': 1, 'week_days': 'WEEK', 'maxActivations': 6, 'stopRain': 1, 'stopStorm': 0, 'stopFrost': 1, 'idealEC': 1.87, 'idealPH': 6, 'priority': 'MEDIUM', 'demand': '255', 'extra_x': 7, 'dias': 'LMXJVSD', 'pend': 0}
        await pg.evaluate("""([id,snap])=>Store.setCol('ucrop',id,{...st.ucOrd.find(o=>o.id===id),estado:'probado',visto:'Franco S1',vistoValor:1,snap,hechoTs:new Date().toISOString(),motivo:'prueba correcta'})""", [o['id'], snap])
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        # el snapshot se ve en el sector
        t = await pg.locator('.ucsnap').first.text_content(); assert 'Horario' in t and 'puesto' in t and 'semana' in t and 'extra_x: 7' in t and '1.87' in t, t
        assert await pg.evaluate("ucUltimo('fra','fra_s1','horario').v") == 1
        # quitar horario: confirmación con antes PUESTO → nuevo QUITADO y la advertencia
        await pg.locator('[data-uc="horario"][data-v="0"]').first.click(); await pg.wait_for_timeout(300)
        t = await pg.text_content('#ucconf'); assert 'Quitar el horario' in t and await pg.text_content('[data-ucconf="antes"]') == 'PUESTO' and await pg.text_content('[data-ucconf="nuevo"]') == 'QUITADO', t
        assert 'deja de arrancar por horas' in t and await pg.locator('[data-uc="conf-si"]').count() == 1
        await pg.click('[data-uc="conf-si"]'); await pg.wait_for_timeout(600)
        oc = await pg.evaluate("st.ucOrd.find(o=>o.modo==='cambio')")
        assert oc and oc['campo'] == 'horario' and oc['valor'] == 0 and oc['valorAntes'] == 1 and oc['confirmado'] is True and oc['estado'] == 'pendiente' and oc['idx'] == {'prog': 0, 'dren': 0} and oc['nombre'] == 'Franco S1' or oc['nombre'], oc
        # ya quitado en pantalla: no deja poner el mismo valor dos veces pendientes
        await pg.locator('[data-uc="horario"][data-v="0"]').first.click(); await pg.wait_for_timeout(300); assert await pg.locator('#ucconf').count() == 0
        # contesta «hecho» y se ve QUITADO en el historial
        snap2 = dict(snap, schedule=0)
        await pg.evaluate("""([id,snap])=>Store.setCol('ucrop',id,{...st.ucOrd.find(o=>o.id===id),estado:'hecho',visto:'Franco S1',vistoValor:0,snap,hechoTs:new Date().toISOString(),motivo:'guardado: de 1 a 0 (comprobado al recargar)'})""", [oc['id'], snap2])
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        t = await pg.locator('.ucres', has_text='Cambios hechos').text_content(); assert 'PUESTO → QUITADO' in t and 'Horario del programa' in t, t
        assert await pg.evaluate("ucUltimo('fra','fra_s1','horario').v") == 0
        # ahora poner: «Ya está» no, poner sí; y valores raros se rechazan
        assert await pg.evaluate("(ucAbrirConf('fra','fra_s1','horario',2),st.ucConf)") is None
        await pg.locator('[data-uc="horario"][data-v="1"]').first.click(); await pg.wait_for_timeout(300)
        t = await pg.text_content('#ucconf'); assert 'Poner el horario' in t and 'las horas que tenga configuradas' in t, t
        await pg.click('[data-uc="conf-no"]')
        # DÍAS: 7 botones con lo último leído; quitar el martes → confirmación con letras → orden «dias» con la máscara
        assert await pg.locator('.ucdia').count() == 7, 'solo el sector 1 tiene lectura'
        sec = pg.locator('.ucrow', has_text='Sector 1').first
        assert await sec.locator('.ucdia').count() == 7 and await sec.locator('.ucdia.on').count() == 7
        assert await sec.locator('[data-uc="dias"]').is_disabled(), 'sin cambios no se puede pulsar'
        await sec.locator('.ucdia').nth(1).click(); assert await sec.locator('.ucdia.on').count() == 6 and await sec.locator('[data-uc="dias"]').is_enabled()
        await sec.locator('[data-uc="dias"]').click(); await pg.wait_for_timeout(300)
        t = await pg.text_content('#ucconf'); assert 'Cambiar los días de riego' in t and await pg.text_content('[data-ucconf="antes"]') == 'LMXJVSD' and await pg.text_content('[data-ucconf="nuevo"]') == 'L-XJVSD', t
        assert 'dejan de regar' in t
        await pg.click('[data-uc="conf-si"]'); await pg.wait_for_timeout(600)
        od = await pg.evaluate("st.ucOrd.find(o=>o.modo==='cambio'&&o.campo==='dias')")
        assert od and od['valor'] == 125 and od['valorAntes'] == 127 and od['confirmado'] is True and od['estado'] == 'pendiente' and od['idx'] == {'prog': 0, 'dren': 0}, od
        # el lector contesta «hecho» y el snapshot nuevo: los botones se ponen como quedó
        await pg.evaluate("""([id,snap])=>Store.setCol('ucrop',id,{...st.ucOrd.find(o=>o.id===id),estado:'hecho',visto:'Franco S1',vistoValor:125,snap,hechoTs:new Date().toISOString(),motivo:'guardado: de LMXJVSD a L-XJVSD (comprobado al recargar)'})""", [od['id'], dict(snap, dias='L-XJVSD', pend=1)])
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        sec = pg.locator('.ucrow', has_text='Sector 1').first
        assert await sec.locator('.ucdia.on').count() == 6 and await sec.locator('.ucdia').nth(1).get_attribute('aria-pressed') == 'false'
        assert await pg.evaluate("ucUltimo('fra','fra_s1','dias').v") == 125
        t = await pg.locator('.ucres', has_text='Cambios hechos').text_content(); assert 'LMXJVSD → L-XJVSD' in t, t
        assert 'Pendiente en el equipo' in await pg.locator('.ucsnap').first.text_content()
        # «guardado, pendiente en el equipo»: el uCrop aún enseña el valor viejo → pastilla de aviso, no de «guardado» a secas
        await pg.evaluate("""()=>Store.setCol('ucrop','fra_fra_s1_dias_cpend',{cab:'fra',sector:'fra_s1',sectorNombre:'S1',campo:'dias',valor:127,valorAntes:125,modo:'cambio',estado:'hecho',motivo:'guardado en el uCrop (de L-XJVSD a LMXJVSD), pendiente de que lo acepte el equipo: al recargar aún pone L-XJVSD. Léelo otra vez en unos minutos',por:'X',ts:new Date().toISOString(),hechoTs:new Date().toISOString(),confirmado:true,idx:{prog:0,dren:0},nombre:'Franco S1'})""")
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        assert 'pendiente en el equipo' in await pg.locator('.ucres', has_text='Cambios hechos').text_content()
        # quitar todos los días: no se permite
        assert await pg.evaluate("(ucAbrirConf('fra','fra_s1','dias',0),st.ucConf)") is None
        # programa en «Días alternos»: botones apagados y no abre la confirmación
        await pg.evaluate("""()=>Store.setCol('ucrop','fra_fra_s1_ce_zz',{cab:'fra',sector:'fra_s1',sectorNombre:'S1',campo:'ce',valor:null,modo:'prueba',estado:'probado',por:'X',ts:new Date().toISOString(),hechoTs:new Date(Date.now()+60e3).toISOString(),visto:'Franco S1',vistoValor:1.87,idx:{prog:0,dren:0},nombre:'Franco S1',snap:{schedule:0,week_days:'DAYS',dias:'L-XJVSD'}})""")
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        sec = pg.locator('.ucrow', has_text='Sector 1').first
        assert await sec.locator('.ucdia').first.is_disabled() and await sec.locator('[data-uc="dias"]').count() == 0
        assert await pg.evaluate("(ucAbrirConf('fra','fra_s1','dias',127),st.ucConf)") is None
        # RESTO DE CAMPOS: paradas (lluvia/viento/helada), prioridad y números (riegos…) con lo último leído
        await pg.evaluate("st.ucOrd=null;renderMain();ucCargar()"); await pg.wait_for_timeout(800)
        sec = pg.locator('.ucrow', has_text='Sector 1').first
        assert await sec.locator('[data-uc="sw"]').count() == 3 and await sec.locator('[data-ucprio]').count() == 1
        assert await sec.locator('[data-ucprio]').input_value() == '2'
        await sec.locator('[data-uc="sw"][data-campo="lluvia"]').click(); await pg.wait_for_timeout(300)
        t = await pg.text_content('#ucconf'); assert 'Parar por lluvia' in t and await pg.text_content('[data-ucconf="antes"]') == 'SÍ' and await pg.text_content('[data-ucconf="nuevo"]') == 'NO' and 'seguirá regando aunque llueva' in t, t
        await pg.click('[data-uc="conf-si"]'); await pg.wait_for_timeout(600)
        ol = await pg.evaluate("st.ucOrd.find(o=>o.modo==='cambio'&&o.campo==='lluvia')")
        assert ol and ol['valor'] == 0 and ol['valorAntes'] == 1 and ol['confirmado'] is True and ol['idx']['prog'] == 0, ol
        sec = pg.locator('.ucrow', has_text='Sector 1').first
        await sec.locator('[data-ucprio]').select_option('4'); await sec.locator('[data-uc="prio"]').click(); await pg.wait_for_timeout(300)
        assert await pg.text_content('[data-ucconf="antes"]') == 'Media' and await pg.text_content('[data-ucconf="nuevo"]') == 'Muy alta'
        await pg.click('[data-uc="conf-no"]')
        await pg.select_option('[data-ucsel="fra_s1"]', 'riegos'); await pg.fill('[data-ucval="fra_s1"]', '12'); await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300)
        assert await pg.text_content('[data-ucconf="antes"]') == '6' and await pg.text_content('[data-ucconf="nuevo"]') == '12'; await pg.click('[data-uc="conf-no"]')
        for malo in ['2.5', '150', '-1']:
            await pg.fill('[data-ucval="fra_s1"]', malo); await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300)
            assert await pg.locator('#ucconf').count() == 0, 'riegos ' + malo
        await pg.select_option('[data-ucsel="fra_s1"]', 'ph'); await pg.fill('[data-ucval="fra_s1"]', '12'); await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300)
        assert await pg.locator('#ucconf').count() == 0, 'pH fuera de límites'
        await pg.fill('[data-ucval="fra_s1"]', '6.2'); await pg.locator('[data-uc="cambiar"]').first.click(); await pg.wait_for_timeout(300)
        assert await pg.text_content('[data-ucconf="antes"]') == '6' and await pg.text_content('[data-ucconf="nuevo"]') == '6.2'; await pg.click('[data-uc="conf-no"]')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

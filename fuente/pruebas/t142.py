"""Válvulas del cabezal (v199) para máquinas de riego antiguas sin web: placa N10 del Taller (código generado), puente (/p con N10: guarda y
avisa con el sector), Ajustes (placa, cabezal, litros por pulso y sector de cada válvula), barra verde «Regando ahora» y riegos de hoy en
Ajuste del riego, y m³ del contador en Cuentas del día."""
import asyncio, sys, subprocess
from playwright.async_api import async_playwright
r = subprocess.run(['node', 'pruebas/datos/prueba-puente-n10.mjs', '../servidor/puente-worker.js'], capture_output=True, text=True, timeout=60)
print(r.stdout, r.stderr); assert 'PUENTE N10 OK' in r.stdout
ino = open('firmware/src/N10/N10.ino').read()
assert 'const int VALV[8] = {2, 4, 5, 6, 7, 38, 39, 40};' in ino and '#define PULSOS 41' in ino and '${' not in ino and 'SX1262 radio' in ino and 'void loop()' in ino
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
        # Ajustes: añadir la placa, cabezal Planos, 100 L/pulso, válvula 1 = primer sector de Planos
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='pla';st.lec=[];st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(600)
        await pg.click('[data-ajt="conex"]'); await pg.wait_for_timeout(300)
        await pg.fill('#vlv_nuevo', 'zz'); await pg.click('[data-act="vlv-add"]'); await pg.wait_for_timeout(200)
        assert await pg.evaluate("Object.keys(st.cfg.valv||{}).length") == 0, 'número de placa mal: no se añade'
        await pg.fill('#vlv_nuevo', '1a2b3c'); await pg.click('[data-act="vlv-add"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.cfg.valv['1A2B3C'].cab") == 'pla' and await pg.evaluate("st.dirtyCfg") is True
        s1 = await pg.evaluate("cabById('pla').sectores[0]"); print(s1)
        await pg.select_option('[data-vlv-can="1A2B3C|1"]', s1['id']); await pg.wait_for_timeout(200)
        await pg.fill('#vll_1A2B3C', '50'); await pg.locator('#vll_1A2B3C').dispatch_event('change'); await pg.wait_for_timeout(200)
        cfg = await pg.evaluate("st.cfg.valv['1A2B3C']"); print(cfg)
        assert cfg['lpp'] == 50 and cfg['can']['1']['n'] == s1['nombre'] and cfg['can']['1']['s'] == s1['id']
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500)
        g = await pg.evaluate("Store.getConfig().then(c=>c.valv)"); assert g['1A2B3C']['lpp'] == 50, g
        # Datos de la placa hoy: riego de la válvula 1 de 8 min (40 pulsos = 2 m³), 0,5 m³ sin válvula, y ahora regando la 1 desde hace 3 min
        await pg.evaluate("""(async()=>{const n=Date.now(),m=60000,d=hoy();const doc={dev:'1A2B3C',nodo:'N10',fecha:d,ts:new Date(n-60000).toISOString(),p:[
          {t:n-60*m,v:{on:0,pm:10,up:5}},{t:n-50*m,v:{ev:1,c:1,pm:0}},{t:n-42*m,v:{ev:2,c:1,dur:480,pul:40,pm:40}},{t:n-3*m,v:{ev:1,c:1,pm:0}},{t:n-2*m,v:{on:1,pm:4}},{t:n-1*m,v:{on:1,pm:5}}]};
          await Store.setCol('lecturas','1A2B3C_'+d,doc);st.lec=[{...doc,id:'1A2B3C_'+d}];st.tab='ajriego';renderAll()})()"""); await pg.wait_for_timeout(1500)
        V = await pg.evaluate("vlvDia('pla',hoy())"); print({k: V[k] for k in ['m3', 'm3Sin', 'q']}, V['abiertas'])
        assert abs(V['m3'] - 2.95) < 1e-9 and abs(V['m3Sin'] - 0.5) < 1e-9 and abs(V['q'] - 15) < 0.01 and V['abiertas'][0]['c'] == 1
        bar = await pg.text_content('#main .ajv'); print(bar)
        assert 'Regando ahora' in bar and s1['nombre'] in bar and 'Válvula 1' in bar and 'de unos 08:00' in bar and '15,0 m³/h' in bar, bar
        t = await pg.text_content('#main'); assert 'Riegos de hoy en' in t and '2,95 m³' in t and 'sin ninguna válvula abierta' in t, t[:400]
        # sin regar: el último riego
        await pg.evaluate("(()=>{const l=st.lec.find(x=>x.dev==='1A2B3C');l.p.push({t:Date.now(),v:{ev:2,c:1,dur:180,pul:9,pm:0}});renderMain()})()"); await pg.wait_for_timeout(300)
        bar = await pg.text_content('#main .ajv'); assert 'Ahora no está regando' in bar and 'Último riego' in bar and '03:00' in bar, bar
        # Cuentas del día: botón con los m³ del contador
        await pg.evaluate("st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(600)
        bt = pg.locator('[data-act="vlv-m3"]'); assert await bt.count() == 1; print(await bt.text_content())
        await bt.click(); await pg.wait_for_timeout(300); assert await pg.evaluate("st.reg.m3.pla") == 2.95
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 420, ancho
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

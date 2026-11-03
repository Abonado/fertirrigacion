"""Ajuste del riego: con lo apuntado en Drenaje (minutos, nº de riegos y drenaje de las bandejas), la radiación de control de ayer y el
tiempo (sol, máxima y viento) saca cuánto se llevó la planta y cómo poner hoy la máquina para el drenaje que se busca."""
import asyncio, sys, json, datetime
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
HOY = datetime.date.today()
def meteo():
    t = [(HOY + datetime.timedelta(days=i)).isoformat() for i in range(-10, 3)]
    R = [24.0 if d == HOY.isoformat() else 20.0 for d in t]; Tx = [30 if d == HOY.isoformat() else 25 for d in t]
    return json.dumps({'daily': {'time': t, 'shortwave_radiation_sum': R, 'temperature_2m_max': Tx, 'temperature_2m_min': [12]*len(t), 'wind_speed_10m_max': [15]*len(t), 'et0_fao_evapotranspiration': [3]*len(t)}})
async def ruta(r):
    if 'shortwave_radiation_sum,temperature_2m_max' in r.request.url: await r.fulfill(content_type='application/json', body=meteo())
    else: await r.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', ruta)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # 7 días de riego. Sector 1: 84 min en 14 riegos (6 min), drenó un 25 %, radiación de control 140.
        # Sector 2: 96 min en 12 riegos (8 min), drenó un 40 %, radiación de control 160.
        await pg.evaluate("""(()=>{cerrarSplash();st.finca='pinta';st.cab='gas';const c=cabById('gas'),[s1,s2]=c.sectores,H=[];
          for(let i=1;i<=7;i++){const f=isoD(new Date(Date.now()-(i-1)*864e5)),r={fecha:f,min:{},rie:{},dren:{},rcs:{}};
            r.min[s1.id]=84;r.rie[s1.id]=14;for(const bj of s1.bandejas)r.dren[bj.id]=0.25*84*bj.caudal;
            r.min[s2.id]=96;r.rie[s2.id]=12;for(const bj of s2.bandejas)r.dren[bj.id]=0.40*96*bj.caudal;
            r.ceB={gas:1.5};r.inc={gas:0.9};r.ceD={};for(const bj of s1.bandejas)r.ceD[bj.id]=4.0;
            if(i===1){r.rcs[s1.id]=140;r.rcs[s2.id]=160}H.push(r)}
          st.hist=H.slice(1);st.reg=normReg(H[0],H[0].fecha);st.fecha=H[0].fecha;st.tab='ajriego';renderAll()})()""")
        await pg.wait_for_timeout(1200)
        assert await pg.evaluate("cabById('gas').sectores.length") >= 2
        R = await pg.evaluate("cabById('gas').sectores.slice(0,2).map(s=>{const R=ajrCalc('gas',s);return {n:R.ok.length,a:R.a,pulso:R.pulso,k:R.k,N:R.hoy.N,nr:R.hoy.nr,rc:R.hoy.rc,D:R.hoy.Dreal}})"); print(R)
        a, b2 = R
        assert a['n'] == 7 and abs(a['a'] - 31.5) < 0.01 and a['pulso'] == 6 and abs(a['k'] - 0.91) < 0.001 and a['N'] == 18 and a['nr'] == 17 and a['rc'] == 130 and 22 < a['D'] < 24, a
        assert abs(b2['a'] - 28.8) < 0.01 and b2['pulso'] == 8 and abs(b2['k'] - 0.88) < 0.001 and b2['N'] == 13 and b2['rc'] == 175 and 26 < b2['D'] < 28, b2
        t = (await pg.locator('#main').inner_text()).upper(); print(t[:900])
        assert t.count('RADIACIÓN DE CONTROL') >= 2 and 'UN 32 % MÁS' in t and 'DRENÓ 25 %' in t and 'DRENÓ 40 %' in t and '+ 17 POR RADIACIÓN' in t and '+ 12 POR RADIACIÓN' in t
        assert 'LA VUELTA DURA 14 MIN' in t and 'LOS RIEGOS SE PISAN' not in t
        await pg.screenshot(path='pruebas/salida/t128.png', full_page=True)
        # banda baja / alta (la máquina cambia según la bandeja): con todos los días iguales sale de ±5 puntos de drenaje
        B = await pg.evaluate("ajrCalc('gas',cabById('gas').sectores[0]).banda()"); print('banda', B); assert B['rb'] == 115 and B['ra'] == 145 and B['rc'] == 130, B
        assert '115 / 145' in t
        # lo que tiene la máquina: 150 / 300 → con la baja drenaría ≈ 13 % y con la alta nada: la baja está demasiado alta
        await pg.fill('[data-ajr="rb"]:not([data-sec])', '150'); await pg.locator('[data-ajr="rb"]:not([data-sec])').dispatch_event('change'); await pg.wait_for_timeout(200)
        await pg.fill('[data-ajr="ra"]:not([data-sec])', '300'); await pg.locator('[data-ajr="ra"]:not([data-sec])').dispatch_event('change'); await pg.wait_for_timeout(300)
        q = (await pg.locator('.ajr-sec').first.inner_text()).upper(); print(q[:900])
        assert 'CON LO QUE TIENE LA MÁQUINA (150 / 300)' in q and 'DRENARÍA ≈ 13 %' in q and 'LA BAJA ESTÁ DEMASIADO ALTA' in q, q
        s1 = await pg.evaluate("cabById('gas').sectores[0].id")
        await pg.click(f'[data-ajo="ce+"][data-sec="{s1}"]'); await pg.wait_for_timeout(300)
        p = (await pg.locator('.ajo-p').first.inner_text()).upper(); print(p)
        assert 'DE 4000 A 4500' in p and '2,70' in p and '1,20' in p and '0,90' in p, p
        assert await pg.locator('.ajo-t .nt').first.inner_text() == 'µS/cm', 'la unidad no sale en mayúsculas (µS no es MS)'
        X = await pg.evaluate(f"(()=>{{const X=ajrObjetivo(ajrCalc('gas',cabById('gas').sectores[0]),'ce+');return [X.dren,X.Q.rc,X.Q.N]}})()"); print('ce+', X)
        assert X[0] == 20 and X[2] < 18 and X[1] > 130, 'para subir la CE: drenar menos → menos riegos, radiación más alta'
        await pg.screenshot(path='pruebas/salida/t128-ce.png', full_page=True)
        anc = await pg.evaluate("[document.documentElement.scrollWidth,[...document.querySelectorAll('#main *')].filter(e=>e.getBoundingClientRect().right>392).slice(0,5).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))]"); print('ancho', anc)
        assert anc[0] <= 390, 'no se sale de la pantalla del móvil'
        await pg.click(f'[data-ajo="rie+"][data-sec="{s1}"]'); await pg.wait_for_timeout(300)
        X = await pg.evaluate("(()=>{const X=ajrObjetivo(ajrCalc('gas',cabById('gas').sectores[0]),'rie+');return [X.Q.N,X.pulso,X.Q.rc,Math.round(X.Q.Dreal)]})()"); print('rie+', X)
        assert X[0] > 18 and X[1] < 6 and X[2] < 130 and 21 <= X[3] <= 25, 'más riegos con la misma agua'
        await pg.click(f'[data-ajo="dren+"][data-sec="{s1}"]'); await pg.wait_for_timeout(300)
        assert 'DRENAJE DEL 25 % AL 30 %' in (await pg.locator('.ajo-p').first.inner_text()).upper()
        await pg.click(f'[data-ajap="dren+"][data-sec="{s1}"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate(f"st.cfg.ajr.gas.sec['{s1}'].dren") == 30 and await pg.evaluate("ajrCalc('gas',cabById('gas').sectores[0]).hoy.N") > 18
        await pg.evaluate(f"st.cfg.ajr.gas.sec['{s1}']={{}};renderMain()")
        # drenaje objetivo solo del sector 2: más bajo → menos riegos en ese sector, el 1 igual
        s2 = await pg.evaluate("cabById('gas').sectores[1].id")
        await pg.fill(f'[data-ajr="dren"][data-sec="{s2}"]', '15'); await pg.locator(f'[data-ajr="dren"][data-sec="{s2}"]').dispatch_event('change'); await pg.wait_for_timeout(300)
        n = await pg.evaluate("cabById('gas').sectores.slice(0,2).map(s=>ajrCalc('gas',s).hoy.N)"); assert n == [18, 11], n
        assert await pg.locator('#savebar').is_visible()
        # la radiación de control de ayer se guarda en el día, sector a sector
        await pg.fill(f'[data-k="reg.rcs.{s2}"]', '170'); await pg.locator(f'[data-k="reg.rcs.{s2}"]').dispatch_event('input'); await pg.wait_for_timeout(200)
        assert await pg.evaluate(f"st.reg.rcs['{s2}']") == 170
        # si la vuelta es más larga que lo que tarda en juntar la radiación a mediodía, avisa
        await pg.evaluate("(()=>{const [s1,s2]=cabById('gas').sectores;st.cfg.ajr.gas={...st.cfg.ajr.gas,sec:{[s1.id]:{pulso:2},[s2.id]:{pulso:30}}};renderMain()})()"); await pg.wait_for_timeout(200)
        assert 'LOS RIEGOS SE PISAN' in (await pg.locator('#main').inner_text()).upper()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

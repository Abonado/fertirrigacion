"""Reposo y cola de sectores en la calculadora: la calculadora de Juanjo dentro de la app (Riego), por sector y rellenada con lo que ya hay: caudal de la bandeja,
minutos, riegos y drenaje apuntados, sol y aire de la previsión. La k sale de los días apuntados y dice cuánto habría acertado."""
import asyncio, sys, json, datetime, math
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
HOY = datetime.date.today()
def meteo():
    t = [(HOY + datetime.timedelta(days=i)).isoformat() for i in range(-10, 3)]
    return json.dumps({'daily': {'time': t, 'shortwave_radiation_sum': [24.0 if d == HOY.isoformat() else 20.0 for d in t], 'temperature_2m_max': [25]*len(t), 'temperature_2m_min': [12]*len(t), 'wind_speed_10m_max': [15]*len(t), 'et0_fao_evapotranspiration': [3]*len(t)}})
def meteo2(rh_hoy=50):
    tm, r, T, H, dt, sr, ss, rs = [], [], [], [], [], [], [], []
    for i in range(-31, 2):
        d = (HOY + datetime.timedelta(days=i)).isoformat(); tgt = 24.0 if d == HOY.isoformat() else 20.0
        forma = [max(0, math.sin(math.pi * (h - 0.5 - 7.9) / 9.8)) if 7.9 < h - 0.5 < 17.7 else 0 for h in range(24)]
        esc = tgt * 1e6 / 3600 / sum(forma)
        for h in range(24):
            tm.append(f'{d}T{h:02d}:00'); r.append(forma[h] * esc); T.append(25); H.append(rh_hoy if d == HOY.isoformat() else 50)
        dt.append(d); sr.append(d + 'T07:55'); ss.append(d + 'T17:40'); rs.append(tgt)
    return json.dumps({'hourly': {'time': tm, 'shortwave_radiation': r, 'temperature_2m': T, 'relative_humidity_2m': H}, 'daily': {'time': dt, 'sunrise': sr, 'sunset': ss, 'shortwave_radiation_sum': rs}})
RH = {'v': 50}
async def ruta(r):
    u = r.request.url
    if 'sunrise' in u: await r.fulfill(content_type='application/json', body=meteo2(RH['v']))
    elif 'shortwave_radiation_sum,temperature_2m_max' in u: await r.fulfill(content_type='application/json', body=meteo())
    else: await r.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid', is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', ruta)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # 7 días: sector 1 con 84 min en 14 riegos (6 min), drenó el 25 % y la CE del drenaje a 4,0 mS; sector 2 con 96 min en 12 riegos, 40 %
        await pg.evaluate("""(()=>{cerrarSplash();st.finca='pinta';st.cab='gas';const c=cabById('gas'),[s1,s2]=c.sectores,H=[];
          for(let i=1;i<=7;i++){const f=isoD(new Date(Date.now()-(i-1)*864e5)),r={fecha:f,min:{},rie:{},dren:{},rcs:{}};
            r.min[s1.id]=84;r.rie[s1.id]=14;for(const bj of s1.bandejas)r.dren[bj.id]=0.25*84*bj.caudal;
            r.min[s2.id]=96;r.rie[s2.id]=12;for(const bj of s2.bandejas)r.dren[bj.id]=0.40*96*bj.caudal;
            r.ceB={gas:1.5};r.inc={gas:0.9};r.ceD={};for(const bj of s1.bandejas)r.ceD[bj.id]=4.0;
            if(i===1){r.rcs[s1.id]=140;r.rcs[s2.id]=160}H.push(r)}
          st.hist=H.slice(1);st.reg=normReg(H[0],H[0].fecha);st.fecha=H[0].fecha;st.tab='calcriego';renderAll()})()""")
        await pg.wait_for_timeout(1500)
        K = "(()=>{const c=cabById('gas'),X=ccCalc('gas',c.sectores[0]);return {rep:X.rep,sec:X.rp.sec.map(o=>({n:o.N,nlib:o.Nlib,D:o.D,wh:o.wh,min:o.min,p:o.P.pulso,ev:o.ev.map(e=>[e.t,e.end])})),repLibre:X.rp.J.repLibre,repRot:X.rp.J.repRot}})()"
        R = await pg.evaluate(K); print({k: R[k] for k in ('rep', 'repLibre', 'repRot')}, [(o['n'], o['nlib'], round(o['D'], 1)) for o in R['sec']])
        assert R['rep'] == 24, 'sin tocar nada el reposo es el de siempre: 24 min'
        # 1) nunca coinciden dos sectores y cada uno respeta su reposo desde que ACABA su riego
        todos = sorted([(a, b, i) for i, o in enumerate(R['sec']) for a, b in o['ev']])
        for x, y in zip(todos, todos[1:]): assert y[0] >= x[1] - 1e-6, ('solapan', x, y)
        for o in R['sec']:
            for (a1, b1), (a2, b2) in zip(o['ev'], o['ev'][1:]): assert a2 >= b1 + 24 / 60 - 1e-6, ('reposo', b1, a2)
        # 2) con 6 min + 24 de reposo no caben los 17 riegos que pide el sol: se recortan y lo dice
        assert R['sec'][0]['n'] < R['sec'][0]['nlib'] and R['sec'][0]['nlib'] >= 16, R['sec'][0]
        t = (await pg.locator('#main').inner_text()).upper()
        assert 'EL REPOSO Y LA COLA TE RECORTAN' in t and 'HASTA' in t and 'MIN DE REPOSO' in t and 'REPARTO DEL CABEZAL' in t, t[:900]
        assert await pg.locator('svg.cch rect').count() == sum(o['n'] for o in R['sec']), 'una barra por riego de cada sector'
        assert await pg.locator('table.cc-all tbody tr').count() == len(R['sec'])
        # 3) el reposo se cambia aquí y se guarda; con 0 min vuelven los riegos que pide el sol
        await pg.fill('[data-cc="reposo"]', '0'); await pg.locator('[data-cc="reposo"]').dispatch_event('change'); await pg.wait_for_timeout(300)
        R0 = await pg.evaluate(K); assert R0['rep'] == 0 and R0['sec'][0]['n'] >= 16 and await pg.evaluate("st.cfg.calc.gas.reposo") == 0, R0['sec'][0]
        todos = sorted([(a, b, i) for i, o in enumerate(R0['sec']) for a, b in o['ev']])
        for x, y in zip(todos, todos[1:]): assert y[0] >= x[1] - 1e-6, ('solapan sin reposo', x, y)
        # 4) reposo de 24 min con 4 sectores de 8 min = rotación justa (3 × 8): un solo cabezal, sin huecos ni solapes
        await pg.evaluate("""(()=>{const c=cabById('gas');st.cfg.calc.gas.reposo=24;for(const s of c.sectores){const A=st.cfg.ajr=st.cfg.ajr||{};const x=A.gas=A.gas||{};x.sec=x.sec||{};x.sec[s.id]={...(x.sec[s.id]||{}),pulso:8,hIni:'08:00',ini:true}};renderMain()})()""")
        R8 = await pg.evaluate(K); print('8 min', R8['repRot'], [(o['n'], o['nlib']) for o in R8['sec']]); assert R8['repRot'] == 8, R8['repRot']
        todos = sorted([(a, b, i) for i, o in enumerate(R8['sec']) for a, b in o['ev']])
        for x, y in zip(todos, todos[1:]): assert y[0] >= x[1] - 1e-6, ('solapan con 8 min', x, y)
        assert R8['sec'][0]['ev'][0][0] <= 8.01 + 1e-6 and R8['sec'][1]['ev'][0][0] >= R8['sec'][0]['ev'][0][1] - 1e-6, 'los dos primeros riegos por hora se ponen en cola'
        # 5) CE de entrada: D × CE drenaje + (1 − D) × lo que se lleva la planta; 6000 µS lleva su aviso honesto
        await pg.fill('[data-cc="ceT"]', '6000'); await pg.locator('[data-cc="ceT"]').dispatch_event('change'); await pg.wait_for_timeout(300)
        C = await pg.evaluate("(()=>{const X=ccCalc('gas',cabById('gas').sectores[0]);return [X.cem,X.ceIn,X.Dobj,X.cu,X.cuN]})()"); print('ce', C)
        assert C[0] == 6000 and abs(C[1] - (C[2] * 6000 + (1 - C[2]) * C[3])) < 1e-6 and C[4] >= 1
        t = (await pg.locator('#main').inner_text()).upper(); assert 'OJO: UN DRENAJE DE 6.000' in t or 'OJO: UN DRENAJE DE 6000' in t, t[-1500:]
        # 6) la duración del perito se cambia aquí y se guarda en el Ajuste del riego
        await pg.fill('[data-cc="pulso"]', '10'); await pg.locator('[data-cc="pulso"]').dispatch_event('change'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.cfg.ajr.gas.sec[cabById('gas').sectores[0].id].pulso") == 10
        anc = await pg.evaluate("document.documentElement.scrollWidth"); assert anc <= 390, anc
        await pg.screenshot(path='pruebas/salida/t170.png', full_page=True)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""Calculadora de riego: la calculadora de Juanjo dentro de la app (Riego), por sector y rellenada con lo que ya hay: caudal de la bandeja,
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
        assert await pg.evaluate("TABS.some(t=>t[0]==='calcriego')") and await pg.evaluate("GRUPOS_RIEGO.find(g=>g.id==='riego').tabs.includes('calcriego')")
        t = (await pg.locator('#main').inner_text()).upper(); print(t[:1400])
        X = await pg.evaluate("(()=>{const X=ccCalc('gas',cabById('gas').sectores[0]);return {nD:X.nD,fuente:X.fuente,k:X.k,ml:X.ml,pulso:X.pulso,mae:X.prueba.mae,n:X.prueba.n,wh:X.best&&X.best.wh,N:X.best&&X.best.N,D:X.best&&X.best.D,base:X.base&&X.base.wh,Rd:X.Rd,ceD:X.ceD,sr:X.sr,ss:X.ss,fd:X.fdH}})()"); print(X)
        assert X['nD'] == 7 and X['fuente'] == 'cal' and X['pulso'] == 6 and X['Rd'] == 2400 and abs(X['sr'] - 7.9167) < 0.01, X
        assert X['mae'] is not None and X['mae'] < 0.01 and X['n'] == 6, 'con días iguales acierta el drenaje'
        assert 16 <= X['N'] <= 18 and 23 <= X['D'] <= 28, X  # hoy hay un 20 % más de sol que los días apuntados: ~17 riegos en vez de 14
        assert 'CALCULADORA DE RIEGO' in t and 'PON HOY EN LA MÁQUINA' in t and 'RADIACIÓN DE CONTROL (POR RIEGO)' in t and 'FIABILIDAD' in t and '±0,0 PUNTOS' in t, t[:600]
        assert 'CE BAJA CON EL DRENAJE BIEN: SUBE LA CE DE ENTRADA' in t, 'CE 4000 < 5500 con el drenaje en su sitio'
        assert await pg.locator('svg.ccg').count() == 1 and await pg.locator('svg.ccg path.ccradf, svg.ccg path.cchoraf').count() >= 12, 'la gráfica lleva una gota por riego'
        await pg.screenshot(path='pruebas/salida/t160.png', full_page=True)
        anc = await pg.evaluate("[document.documentElement.scrollWidth,[...document.querySelectorAll('#main *')].filter(e=>e.getBoundingClientRect().right>392).slice(0,5).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))]"); print(anc)
        assert anc[0] <= 390, 'no se sale de la pantalla'
        # drenaje que se busca más bajo → menos riegos y más sol por riego; se guarda en el mismo sitio que el Ajuste del riego
        N0, W0 = X['N'], X['wh']
        await pg.fill('[data-cc="dObj"]', '15'); await pg.locator('[data-cc="dObj"]').dispatch_event('change'); await pg.wait_for_timeout(300)
        Y = await pg.evaluate("(()=>{const X=ccCalc('gas',cabById('gas').sectores[0]);return [X.best.N,X.best.wh,X.best.D,st.cfg.ajr.gas.sec[cabById('gas').sectores[0].id].dren]})()"); print('dren 15', Y)
        assert Y[0] < N0 and Y[1] > W0 and Y[3] == 15 and 12 <= Y[2] <= 18, Y
        assert await pg.locator('#savebar').is_visible()
        await pg.fill('[data-cc="dObj"]', '25'); await pg.locator('[data-cc="dObj"]').dispatch_event('change'); await pg.wait_for_timeout(300)
        # el sector 2 (drenó el 40 %) necesita más sol por riego que el 1 para llegar al mismo drenaje... y se ve en otra pestaña de sector
        await pg.click('[data-ccs]:nth-child(2)'); await pg.wait_for_timeout(300)
        Z = await pg.evaluate("(()=>{const X=ccCalc('gas',cabById('gas').sectores[1]);return [X.pulso,X.best.wh,X.best.N,X.best.D,X.prueba.mae]})()"); print('sector 2', Z)
        assert Z[0] == 8 and 10 <= Z[2] <= 15 and 22 <= Z[3] <= 28.5 and Z[4] < 0.01, Z
        n2 = (await pg.evaluate("cabById('gas').sectores[1].nombre")).upper(); assert ('PON HOY EN LA MÁQUINA · ' + n2) in (await pg.locator('#main').inner_text()).upper()
        # el aire más húmedo (DPV bajo) → la planta bebe menos → hace falta más sol por riego
        RH['v'] = 80
        await pg.evaluate("ccCargar('gas',true)"); await pg.wait_for_timeout(600)
        V = await pg.evaluate("(()=>{const X=ccCalc('gas',cabById('gas').sectores[0]);return [X.fdH,X.dpH,X.best.wh]})()"); print('rh 80', V)
        assert V[0] > 1.0 and V[2] > W0 * 0.9, V
        # sin días apuntados: valores de partida y lo dice
        await pg.evaluate("st.hist=[];st.reg=normReg({fecha:isoD(new Date())},isoD(new Date()));st.ccSec={};renderMain()"); await pg.wait_for_timeout(400)
        t2 = (await pg.locator('#main').inner_text()).upper(); print(t2[:700])
        assert 'SIN DATOS DE TU FINCA TODAVÍA' in t2 and 'FIABILIDAD' not in t2
        # copiar ajustes
        await pg.evaluate("window.__cp=null;Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window.__cp=t;return Promise.resolve()}},configurable:true})")
        await pg.click('[data-cc="copiar"]'); await pg.wait_for_timeout(300)
        cp = await pg.evaluate("window.__cp"); print(cp); assert cp and 'Radiación de control' in cp and 'Riegos previstos' in cp
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

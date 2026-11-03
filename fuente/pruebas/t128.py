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
        # 7 días de riego: 84 min en 14 riegos (6 min) y drenó un 25 %; la radiación de control de ayer, 140
        await pg.evaluate("""(()=>{cerrarSplash();st.finca='pinta';st.cab='gas';const c=cabById('gas'),H=[];
          for(let i=1;i<=7;i++){const f=isoD(new Date(Date.now()-(i-1)*864e5)),r={fecha:f,min:{},rie:{},dren:{},rcon:{}};
            for(const s of c.sectores){r.min[s.id]=84;r.rie[s.id]=14;for(const bj of s.bandejas)r.dren[bj.id]=0.25*84*bj.caudal}if(i===1)r.rcon.gas=140;H.push(r)}
          st.hist=H.slice(1);st.reg=normReg(H[0],H[0].fecha);st.fecha=H[0].fecha;st.tab='ajriego';renderAll()})()""")
        await pg.wait_for_timeout(1200)
        R = await pg.evaluate("(()=>{const R=ajrCalc('gas');return {n:R.ok.length,a:R.a,pulso:R.pulso,k:R.k,N:R.hoy.N,rc:R.hoy.rc,D:R.hoy.Dreal}})()"); print(R)
        assert R['n'] == 7 and abs(R['a'] - 31.5) < 0.01 and R['pulso'] == 6 and abs(R['k'] - 0.98) < 0.001
        assert R['N'] == 18 and R['rc'] == 130 and 22 < R['D'] < 24, R
        t = (await pg.locator('#main').inner_text()).upper(); print(t[:700])
        assert 'RADIACIÓN DE CONTROL' in t and '130' in t and '18' in t and 'UN 32 % MÁS' in t and 'DRENÓ 25 %' in t
        assert await pg.locator('.ajr-t tbody tr').count() == 7
        await pg.screenshot(path='pruebas/salida/t128.png', full_page=True)
        # buscar menos drenaje → menos riegos
        await pg.fill('#ajr_dr', '15'); await pg.locator('#ajr_dr').dispatch_event('change'); await pg.wait_for_timeout(300)
        n2 = await pg.evaluate("ajrCalc('gas').hoy.N"); assert n2 == 16, n2
        assert await pg.locator('#savebar').is_visible()
        # el campo de la radiación de control se guarda en el día
        await pg.fill('#ajr_rc', '150'); await pg.locator('#ajr_rc').dispatch_event('input'); await pg.wait_for_timeout(200)
        assert await pg.evaluate("st.reg.rcon.gas") == 150
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

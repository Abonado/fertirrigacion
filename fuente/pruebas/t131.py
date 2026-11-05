"""Riego del uCrop: el lector lee la página de riego (Estado del cabezal: cada Drenaje con activaciones, % de drenaje, litros, pulsos,
corte, anterior y corrección; arriba la radiación acumulada, ET0, CE y pH) y la app lo usa en Ajuste del riego de Franco: el Drenaje N es el
sector N, los riegos y el drenaje salen de la máquina, la radiación de la máquina cuadra sola y se ve lo que lleva hoy; si un drenaje está en la
mínima y no drena, avisa. Todo en Wh/m² como el uCrop."""
import asyncio, sys, json, re, datetime
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
LEER = re.search(r'function leerRiego\(\) \{.*?\n\}\n', open('lector-clima/background.js').read(), re.S).group(0)
HOY = datetime.date.today()
def meteo():
    t = [(HOY + datetime.timedelta(days=i)).isoformat() for i in range(-10, 3)]
    R = [24.0 if d == HOY.isoformat() else 20.0 for d in t]; Tx = [30 if d == HOY.isoformat() else 25 for d in t]
    hs = [HOY.isoformat() + 'T%02d:00' % h for h in range(24)]
    return json.dumps({'hourly': {'time': hs, 'shortwave_radiation': [300 if 8 <= h <= 16 else 0 for h in range(24)]}, 'daily': {'time': t, 'shortwave_radiation_sum': R, 'temperature_2m_max': Tx, 'temperature_2m_min': [12]*len(t), 'wind_speed_10m_max': [15]*len(t), 'et0_fao_evapotranspiration': [3]*len(t)}})
async def ruta(r):
    if 'shortwave_radiation_sum,temperature_2m_max' in r.request.url: await r.fulfill(content_type='application/json', body=meteo())
    else: await r.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        # 1) el lector en la página del uCrop
        pu = await b.new_page(viewport={'width': 1600, 'height': 1000}); await pu.goto('file://' + __import__('os').path.abspath('pruebas/datos/ucrop-riego.html'))
        L = await pu.evaluate('(' + LEER + ')()'); await pu.close()
        assert L['ok'] and L['tipo'] == 'riego' and len(L['dren']) == 4, L
        d1 = L['dren'][0]; assert (d1['act'], d1['dU'], d1['dH'], d1['rH'], d1['drH'], d1['corte'], d1['ant'], d1['corr']) == (3, 27, 9, 4.73, 0.46, 245, 150, 95), d1
        E = L['estado']; print('estado', E)
        assert E['regando'] and E['prog'] == 'SE04ENCAÑE' and E['fase'] == 'Regando' and E['valv'] == 'Válvula 4' and E['act'] == 3 and E['t'] == '00:05:42' and E['tt'] == '00:08:00' and E['espera'] == 'SEO3ALTO 08:38:00', E
        assert L['dren'][3]['corr'] == -1080 and L['ext'] == {'racc': 563, 'rad': 185, 'eto': 2.43, 'ta': 16, 'hr': 72, 'viento': 5, 'ceE': 1.4, 'ceS': 3.26, 'ceI': 3.18, 'ph': 5.52}, L['ext']
        # 2) la app
        ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', ruta)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # lo que habría guardado el puente: 7 días enteros (14 riegos, drena un 20 %, 5000 Wh/m² en la máquina) y hoy lo leído ahora
        await pg.evaluate("""(async L=>{const f=n=>isoD(new Date(Date.now()-n*864e5));
          for(let i=1;i<=7;i++){const dren=[1,2,3,4].map(n=>({n,act:14,dU:20,dH:20,rU:1.58,rH:22.12,drU:0.32,drH:4.424,corte:300,ant:290,corr:10}));
            await Store.setCol('lecturas','UCR-FRA_'+f(i),{dev:'UCR-FRA',nodo:'UCR',cab:'fra',fecha:f(i),ts:new Date().toISOString(),p:[{t:Date.now()-i*864e5-3600e3,v:{dren:dren.map(d=>({...d,act:5,rH:7.9,drH:0.5})),ext:{racc:2000}}},{t:Date.now()-i*864e5,v:{dren,ext:{racc:5000,ceE:1.4,ceS:3.2}}}]})}
          await Store.setCol('lecturas','UCR-FRA_'+hoy(),{dev:'UCR-FRA',nodo:'UCR',cab:'fra',fecha:hoy(),ts:new Date().toISOString(),p:[{t:Date.now()-60e3,v:{dren:L.dren,ext:L.ext,estado:L.estado}}]});
          st.lec=undefined;cerrarSplash();st.finca='pinta';st.cab='fra';st.hist=[];st.tab='ajriego';renderAll()})""" , L)
        await pg.wait_for_timeout(1500)
        R = await pg.evaluate("(()=>{const c=cabById('fra'),R=ajrCalc('fra',c.sectores[0]),x=R.ay;return {n:R.ok.length,src:x.src,N:x.N,D:Math.round(x.D),M:x.M,k:R.k,kSrc:R.kSrc,pulso:R.pulso,Nh:R.hoy.N,ctrl:R.banda().ctrl,vivo:R.vivo&&R.vivo.corte,sect:c.sectores.length}})()"); print(R)
        assert R['n'] == 7 and R['src'] == 'ucrop' and R['N'] == 14 and R['D'] == 20 and R['M'] == 112 and R['pulso'] == 8
        assert abs(R['k'] - 0.9) < 0.001 and R['kSrc'] == 'maquina', 'la radiación de la máquina sale del uCrop (5000 Wh/m² = 1800 J/cm²)'
        # hoy 6000 Wh/m² en la máquina, de ellos el 11 % antes del primer riego (08:00): 5333 ÷ (18,6 riegos sin redondear + 0,5 que sobra) ≈ 280
        assert R['Nh'] == 20 and R['ctrl'] == 280 and R['vivo'] == 245, R
        t = (await pg.locator('#main').inner_text()).upper(); print(t[:1200])
        assert 'AHORA EN EL UCROP' in t and '3 RIEGOS' in t and 'DRENA 9 %' in t and 'CORTE 245' in t and '(ANTES 150, +95)' in t
        assert 'DATOS DEL UCROP: ÚLTIMA LECTURA' in t and '(DEL UCROP)' in t
        assert 'REGANDO AHORA: SECTOR 4 (ENCAÑE) · VÁLVULA 4 · 05:42 DE 08:00 · EN ESPERA: SEO3ALTO 08:38:00' in t, 'lo que riega ahora'
        assert 'AVISARME AL MÓVIL CADA VEZ QUE EMPIECE UN RIEGO' in t
        await pg.fill('[data-ajav="para"]', 'juanjo.serrano3@gmail.com, encargado@demo.es'); await pg.locator('[data-ajav="para"]').dispatch_event('change'); await pg.wait_for_timeout(200)
        assert await pg.evaluate("st.cfg.avisoRiego.para") == ['juanjo.serrano3@gmail.com', 'encargado@demo.es'] and await pg.locator('#savebar').is_visible()
        await pg.evaluate("st.cfg.avisoRiego=undefined;st.dirtyCfg=false;renderSave()")
        # mínima 150 en todos: el Drenaje 4 está en la mínima y no drena → aviso
        await pg.fill('[data-ajr="rb"]:not([data-sec])', '150'); await pg.locator('[data-ajr="rb"]:not([data-sec])').dispatch_event('change'); await pg.wait_for_timeout(300)
        q4 = (await pg.locator('.ajr-sec').nth(3).inner_text()).upper(); assert 'ESTÁ EN LA MÍNIMA (150) Y AUN ASÍ NO DRENA' in q4, q4[:600]
        q1 = (await pg.locator('.ajr-sec').nth(0).inner_text()).upper(); assert 'ESTÁ EN LA MÍNIMA' not in q1
        assert 'YA LLEVA 3' in q1, 'los riegos que ya lleva la máquina hoy'
        await pg.screenshot(path='pruebas/salida/t131.png', full_page=True)
        # la control de la app frente al corte con el que acabó la máquina (300 cada día)
        A = await pg.evaluate("(()=>{const R=ajrCalc('fra',cabById('fra').sectores[0]);return [R.acCorte&&R.acCorte.n,R.acCorte&&Math.round(R.acCorte.mae),R.D.filter(x=>x.rcP!=null).length]})()"); print('corte real', A)
        assert A[0] == 6 and A[2] == 6 and A[1] < 20, A
        assert 'FRENTE AL CORTE CON EL QUE ACABA LA MÁQUINA' in q1, q1[:1500]
        await pg.evaluate("document.querySelectorAll('[data-ajdet]').forEach(d=>{d.open=true})")
        assert 'CORTE REAL' in (await pg.locator('.ajr-sec').nth(0).inner_text()).upper()
        # los riegos que quiero: 16 en el sector 1 → la radiación por riego para 16 y la duración para el drenaje ideal
        s1 = await pg.evaluate("cabById('fra').sectores[0].id")
        await pg.fill(f'[data-ajr="nq"][data-sec="{s1}"]', '16'); await pg.locator(f'[data-ajr="nq"][data-sec="{s1}"]').dispatch_event('change'); await pg.wait_for_timeout(300)
        Q = await pg.evaluate("(()=>{const R=ajrCalc('fra',cabById('fra').sectores[0]);return [R.hoy.N,R.banda().ctrl,R.calc.N,Math.round(R.hoy.puIdeal*10)/10]})()"); print('quiero 16', Q)
        assert Q[0] == 16 and Q[1] > 280 and Q[2] == 20 and Q[3] > 8, Q
        q1 = (await pg.locator('.ajr-sec').nth(0).inner_text()).upper(); print(q1[:900])
        assert 'RIEGOS (LOS QUE QUIERES)' in q1 and 'CON 16 RIEGOS LA MÁQUINA TIENE QUE CORTAR' in q1 and 'SIN FIJARLOS SALÍAN 20 RIEGOS' in q1, q1
        assert 'TIEMPO DE RIEGO ·' not in q1, 'con los riegos fijados no aconseja otro tiempo de riego'
        assert 'CON 16' not in (await pg.locator('.ajr-sec').nth(1).inner_text()).upper(), 'solo en su sector'
        await pg.screenshot(path='pruebas/salida/t131-quiero.png', full_page=True)
        await pg.click(f'[data-ajnq="0"][data-sec="{s1}"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("ajrCalc('fra',cabById('fra').sectores[0]).hoy.N") == 20
        await pg.fill(f'[data-ajr="nq"][data-sec="{s1}"]', '1'); await pg.locator(f'[data-ajr="nq"][data-sec="{s1}"]').dispatch_event('change'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("ajrCalc('fra',cabById('fra').sectores[0]).hoy.N") == 20, 'menos de 2 riegos no vale'
        # el primer día (sin días enteros del uCrop): la radiación de la máquina se compara con la del servicio hasta la hora leída
        K = await pg.evaluate("""(()=>{st.lec=st.lec.filter(d=>d.fecha===hoy());const d=st.lec.find(x=>x.dev==='UCR-FRA');d.p[0].t=new Date(hoy()+'T14:01:00').getTime();
          const R=ajrCalc('fra',cabById('fra').sectores[0]);return [R.kSrc,R.k]})()"""); print('k de hoy', K)
        assert K[0] == 'hoy' and abs(K[1] - 563 / 2100) < 0.001, K
        # no sale como aparato suelto
        assert not await pg.evaluate("(st.lec||[]).filter(d=>d.dev==='UCR-FRA').some(d=>document.body.innerText.includes('UCR-FRA'))")
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

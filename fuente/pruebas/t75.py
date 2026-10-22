"""Satélite: radiación por satélite (con el riego de la finca) y parcela al aire libre con Sentinel-2.
El servidor de satélite, Open-Meteo y la ortofoto del IGN se simulan."""
import asyncio, sys, json, math, base64, io, datetime as dt
from zoneinfo import ZoneInfo
from playwright.async_api import async_playwright
from PIL import Image
MOCK = open('mock-firebase.js').read()
TZ = ZoneInfo('Europe/Madrid')
ahora = dt.datetime.now(TZ)
hoy = ahora.date()

def png_ndvi(w, h):
    im = Image.new('RGBA', (w, h))
    for x in range(w):
        for y in range(h):
            v = 0.5 + 0.5 * math.sin(x / 3) * math.cos(y / 4)
            im.putpixel((x, y), (int(200 - 150 * v), int(120 + 100 * v), 60, 255))
    b = io.BytesIO(); im.save(b, 'PNG'); return base64.b64encode(b.getvalue()).decode()
def jpg_orto():
    im = Image.new('RGB', (64, 64), (150, 140, 110))
    for x in range(0, 64, 8):
        for y in range(64): im.putpixel((x, y), (90, 120, 70))
    b = io.BytesIO(); im.save(b, 'JPEG'); return b.getvalue()
ORTO = jpg_orto()

def radiacion():
    t, v = [], []
    d0 = hoy - dt.timedelta(days=35)
    for i in range(36 * 24):
        x = dt.datetime.combine(d0, dt.time(0), TZ) + dt.timedelta(hours=i)
        if x.date() > hoy: break
        t.append(x.strftime('%Y-%m-%dT%H:%M'))
        k = 0.6 if x.date().day % 7 == 0 else 1.0     # algún día nublado
        r = max(0, 700 * k * math.sin(math.pi * (x.hour - 7) / 12)) if 7 <= x.hour <= 19 else 0
        v.append(None if x > ahora else round(r, 1))
    return {'hourly': {'time': t, 'shortwave_radiation': v}, 'hourly_units': {'shortwave_radiation': 'W/m²'}}
RAD = radiacion()

CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST, OPTIONS'}
GEOM = {'type': 'Polygon', 'coordinates': [[[-1.6010, 37.3950], [-1.5985, 37.3952], [-1.5983, 37.3968], [-1.6006, 37.3971], [-1.6010, 37.3950]]]}
llamadas = []
async def servidor(route):
    rq = route.request
    if rq.method == 'OPTIONS': return await route.fulfill(status=204, headers=CORS)
    ruta = rq.url.rstrip('/').split('/')[-1]; b = json.loads(rq.post_data or '{}'); llamadas.append(ruta)
    assert rq.headers.get('authorization', '').startswith('Bearer tok-'), 'falta el token'
    if ruta == 'recinto':
        o = {'ok': True, 'encontrado': True, 'ref': [30, 3, 0, 0, 19, 90, 2], 'uso': 'CI', 'sup': 4.27, 'alt': 40, 'pend': 2.1, 'geom': GEOM}
    elif ruta == 'serie':
        d = dt.date.fromisoformat(b['desde']); fin = dt.date.fromisoformat(b['hasta']); pts = []; i = 0
        while d <= fin:
            n = 0.62 + 0.05 * math.sin(i / 9)
            if (fin - d).days < 12: n -= 0.12          # bajada al final
            pts.append({'f': d.isoformat(), 'n': round(n, 3), 'p10': round(n - 0.1, 3), 'p50': round(n, 3), 'p90': round(n + 0.08, 3), 'w': round(0.2 + 0.04 * math.cos(i / 7), 3), 'c': 0.95})
            d += dt.timedelta(days=5); i += 1
        o = {'ok': True, 'puntos': pts, 'desde': b['desde'], 'hasta': b['hasta']}
    elif ruta == 'imagen':
        o = {'ok': True, 'png': png_ndvi(24, 18), 'w': 24, 'h': 18, 'bbox': [-178218.0, 4493400.0, -177940.0, 4493630.0], 'fecha': b['fecha'], 'tipo': b['tipo']}
        # bbox real de GEOM en Mercator
        R = 6378137; xs = [R * p[0] * math.pi / 180 for p in GEOM['coordinates'][0]]; ys = [R * math.log(math.tan(math.pi / 4 + p[1] * math.pi / 360)) for p in GEOM['coordinates'][0]]
        o['bbox'] = [min(xs), min(ys), max(xs), max(ys)]
    else: o = {'error': 'ruta'}
    await route.fulfill(status=200, headers={**CORS, 'content-type': 'application/json'}, body=json.dumps(o))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await ctx.route('https://satellite-api.open-meteo.com/**', lambda r: r.fulfill(headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps(RAD)))
        await ctx.route('https://www.ign.es/**', lambda r: r.fulfill(content_type='image/jpeg', body=ORTO))
        await ctx.route('https://sat.prueba.workers.dev/**', servidor)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # 30 días de cuentas: m³ según el sol, y ayer bastante menos
        await pg.evaluate("""(()=>{cerrarSplash();st.finca='pinta';const l=[];const d=new Date();for(let i=1;i<=30;i++){const x=new Date(d);x.setDate(d.getDate()-i);const f=isoD(x);const k=x.getDate()%7===0?0.6:1;
            const m=60*k*(i===1?0.55:1);l.push({fecha:f,m3:{pla:m*0.5,gas:m*0.3,fra:m*0.2}})}st.hist=l;st.cfg.satUrl=null})()""")
        # sin servidor: se ve la radiación y la tarjeta para conectar
        await pg.evaluate("st.tab='satelite';renderAll()"); await pg.wait_for_timeout(1500)
        txt = await pg.evaluate("document.querySelector('#main').textContent")
        print('fuente radiación:', await pg.evaluate("st.rad&&st.rad.fuente"), '· días:', await pg.evaluate("radDias().length"))
        assert 'por satélite' in txt and 'Conectar con Copernicus' in txt and 'Riego frente al sol' in txt
        rr = await pg.evaluate("(()=>{const r=radRiego();return r&&{dif:Math.round(r.dif),n:r.filas.length}})()"); print('riego frente al sol:', rr)
        assert rr['dif'] < -20 and 'Se regó poco para el sol que hizo' in txt
        await pg.screenshot(path='pruebas/salida/t75-radiacion.png', full_page=True)
        # se conecta el servidor y se añade una parcela de limoneros por coordenadas
        await pg.evaluate("st.cfg.satUrl='https://sat.prueba.workers.dev';st.savedCfg.satUrl=st.cfg.satUrl;renderMain()"); await pg.wait_for_timeout(300)
        await pg.click('[data-sat-act="nueva"]'); await pg.click('[data-sat-modo="coord"]')
        await pg.fill('#sat_c', '37.3960, -1.5995'); await pg.click('[data-sat-act="buscar"]'); await pg.wait_for_timeout(800)
        assert await pg.locator('.satbox').count() == 1
        await pg.fill('#sat_n', 'Limoneros de la Rambla'); await pg.fill('#sat_cu', 'Limonero Verna')
        await pg.screenshot(path='pruebas/salida/t75-alta.png', full_page=True)
        await pg.click('[data-sat-act="guardar"]'); await pg.wait_for_timeout(2500)
        p0 = await pg.evaluate("(()=>{const p=st.sat[0];return {n:p.nombre,serie:p.serie.length,ref:p.ref,est:satEstado(p)}})()"); print('parcela:', p0)
        assert p0['serie'] > 50 and p0['est'][0] == 'bad'
        assert await pg.locator('#g_satn svg').count() == 1 and await pg.locator('#g_satw svg').count() == 1
        await pg.wait_for_timeout(800); assert await pg.locator('.satbox img.satov').count() == 1
        await pg.screenshot(path='pruebas/salida/t75-parcela.png', full_page=True)
        await pg.click('[data-sat-tipo="rel"]'); await pg.wait_for_timeout(800)
        assert await pg.locator('.satbox img.satov').count() == 1
        print('llamadas al servidor:', llamadas)
        # el aviso sale en la tarjeta de la finca
        av = await pg.evaluate("avisosFinca(st.cfg.fincas.find(f=>f.id==='pinta')).map(x=>x[1]).filter(t=>t.startsWith('Satélite'))"); print('aviso finca:', av); assert av
        # se guardó en la nube y se lee al volver
        n = await pg.evaluate("Store.listCol('satelite',50).then(l=>l.length)"); assert n == 1
        await pg.evaluate("st.satSel=null;renderMain()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='pruebas/salida/t75-lista.png', full_page=True)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

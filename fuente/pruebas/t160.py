"""v222: entrada al taller por QR. El encargado imprime un QR por lugar; al escanearlo (abrir la app con #qr=lugar) se apunta la entrada,
la siguiente vez la salida, y se cuenta el tiempo dentro. Un segundo escaneo en menos de un minuto no cuenta; se puede deshacer;
el encargado cierra una salida olvidada y ve el tiempo por persona; un trabajador solo ve lo suyo."""
import asyncio, sys, json
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
ADMIN = json.load(open('firebase-config.json'))['admin']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'"+ADMIN+"':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', ADMIN); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='qrtaller';renderAll()"); await pg.wait_for_timeout(800)
        t = await pg.text_content('#main'); assert 'Mi tiempo en el taller' in t and 'QR para imprimir' in t and 'Tiempo por persona' in t, t[:300]
        await pg.wait_for_timeout(800)
        assert await pg.locator('.qtqrsvg svg').count() == 1, 'falta el QR'
        DOC = "NUBE.db.doc('qrtaller/'+fichId(miEmail(),hoy())).get().then(s=>s.exists?s.data():null)"
        # 1) primer escaneo: entrada
        await pg.evaluate("qtEscanear('taller')"); await pg.wait_for_timeout(900)
        d = await pg.evaluate(DOC); assert d and len(d['tramos']) == 1 and d['tramos'][0]['o'] is None and d['tramos'][0]['l'] == 'taller', d
        assert 'Has entrado' in await pg.text_content('#main')
        # 2) otro escaneo enseguida: no cuenta
        await pg.evaluate("qtEscanear('taller')"); await pg.wait_for_timeout(700)
        d = await pg.evaluate(DOC); assert len(d['tramos']) == 1 and d['tramos'][0]['o'] is None, d
        # 3) entró hace 2 horas: el siguiente escaneo es la salida y cuenta 2 h
        await pg.evaluate("""async()=>{const d=await """+DOC+""";d.tramos[0].i=new Date(Date.now()-2*36e5).toISOString();await NUBE.db.doc('qrtaller/'+fichId(miEmail(),hoy())).set(d)}"""); 
        await pg.evaluate("qtEscanear('taller')"); await pg.wait_for_timeout(900)
        d = await pg.evaluate(DOC); assert d['tramos'][0]['o'], d
        t = await pg.text_content('#main'); assert 'Has salido' in t and '2 h 00 min' in t, t[:600]
        # 4) deshacer la salida: vuelve a estar dentro
        await pg.click('[data-act="qt-deshacer"]'); await pg.wait_for_timeout(900)
        d = await pg.evaluate(DOC); assert d['tramos'][0]['o'] is None and len(d['tramos']) == 1, d
        # 5) un QR que no existe no apunta nada
        await pg.evaluate("qtEscanear('zzz')"); await pg.wait_for_timeout(500)
        d = await pg.evaluate(DOC); assert len(d['tramos']) == 1, d
        # 6) el encargado cierra la salida olvidada: entrada a las 00:01 de hoy, salida 00:31 → 30 min
        await pg.evaluate("""async()=>{const d=await """+DOC+""";d.tramos[0].i=new Date(hoy()+'T00:01:00').toISOString();await NUBE.db.doc('qrtaller/'+fichId(miEmail(),hoy())).set(d);st.qt=null;renderMain()}"""); await pg.wait_for_timeout(900)
        await pg.fill('#qth_0', '00:31'); await pg.click('[data-act="qt-cerrar"][data-k="0"]'); await pg.wait_for_timeout(900)
        d = await pg.evaluate(DOC); assert d['tramos'][0]['o'], d
        t = await pg.text_content('#main'); assert '30 min' in t, t[:800]
        # 7) lugares: añadir uno nuevo y se ve su QR; renombrar
        await pg.fill('#qt_nuevo', 'Nave 2'); await pg.click('[data-act="qt-lugar-add"]'); await pg.wait_for_timeout(900)
        assert await pg.evaluate("st.savedCfg.qrLugares.length") == 2 and await pg.locator('.qtqrsvg svg').count() == 2
        await pg.fill('[data-qtn="taller"]', 'Taller grande'); await pg.dispatch_event('[data-qtn="taller"]', 'change'); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.savedCfg.qrLugares[0].nombre") == 'Taller grande'
        # 8) un trabajador normal solo ve lo suyo: sin QR ni totales de los demás
        v = await pg.evaluate("(()=>{const a=NUBE.user.admin,e=NUBE.user.encargado;NUBE.user.admin=false;NUBE.user.encargado=false;const r=vQrTaller();NUBE.user.admin=a;NUBE.user.encargado=e;return r})()")
        assert 'Mi tiempo en el taller' in v and 'QR para imprimir' not in v and 'Tiempo por persona' not in v, v[:300]
        # 9) abrir la app con el QR (#qr=…) apunta la entrada solo
        await pg.evaluate("""async()=>{await NUBE.db.doc('qrtaller/'+fichId(miEmail(),hoy())).delete()}"""); 
        await pg.goto('http://localhost:8776/#qr=taller'); await pg.reload(); await pg.wait_for_timeout(5000)
        d = await pg.evaluate(DOC); assert d and len(d['tramos']) == 1 and d['tramos'][0]['o'] is None, d
        assert await pg.evaluate("location.hash") == '' and await pg.evaluate("st.tab") == 'qrtaller'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

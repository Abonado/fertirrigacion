"""Cambiar de día mientras se guarda no mezcla días: el parte de cada día lleva sus datos y no los del otro.
(Se vio en datos reales: el parte de Franco del 15/10 salió con los m³ y los cm del 19/10.)"""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def lento(route):
    await asyncio.sleep(1.5)      # el servicio del tiempo tarda: es cuando se cambiaba de día a mitad de guardar
    await route.abort()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lento); await ctx.route('https://archive-api.open-meteo.com/**', lento)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='fra'")
        A, B = await pg.evaluate("[diaRiego(diaRiego(diaRiego(hoy()))),diaRiego(hoy())]")
        # día A: 131 m³ en Franco, guardado tranquilamente
        await pg.evaluate(f"(async()=>{{await loadFecha('{A}');st.reg.m3.fra=131;marcaReg('m3.fra');const b=bidonesDe('fra')[0];st.reg.cm[b.id]=10;marcaReg('cm.'+b.id);await saveReg()}})()"); await pg.wait_for_timeout(2500)
        # día B: 460 m³; se pulsa guardar y, mientras guarda, se cambia al día A
        await pg.evaluate(f"(async()=>{{await loadFecha('{B}');st.reg.m3.fra=460;marcaReg('m3.fra');const b=bidonesDe('fra')[0];st.reg.cm[b.id]=30;marcaReg('cm.'+b.id);saveReg();await new Promise(r=>setTimeout(r,150));loadFecha('{A}')}})()")
        await pg.wait_for_timeout(5000)
        ra = await pg.evaluate(f"Store.getReg('{A}').then(r=>r.m3.fra)"); rb = await pg.evaluate(f"Store.getReg('{B}').then(r=>r.m3.fra)")
        pa = await pg.evaluate(f"NUBE.db.doc('partes/{A}_fra').get().then(s=>s.exists?s.data().d.m3:null)")
        pb = await pg.evaluate(f"NUBE.db.doc('partes/{B}_fra').get().then(s=>s.exists?s.data().d.m3:null)")
        print(f'día A: registro {ra} · parte {pa}   |   día B: registro {rb} · parte {pb}   |   en pantalla {await pg.evaluate("st.fecha")} con {await pg.evaluate("st.reg.m3.fra")}')
        assert ra == 131 and rb == 460, 'los registros no pueden mezclarse'
        assert pa in (131, None) and pb == 460, 'el parte de un día no puede llevar los datos de otro'
        assert await pg.evaluate("st.fecha") == A and await pg.evaluate("st.reg.m3.fra") == 131, 'la pantalla tiene que quedar en el día A con sus datos'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

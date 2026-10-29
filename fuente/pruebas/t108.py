"""Leer informe con la pantalla de compartimentos del controlador de clima: por defecto se apunta la MEDIA de los 6 en todas
las naves de la Gasolinera (da igual el orden); con un toque, cada compartimento en su nave, al revés (el 1 es la nave 6) o al
derecho, aunque se esté en otro cabezal; el modo y el orden se guardan; se apuntan
temperatura, humedad y ventanas en cada nave y los datos de fuera (viento, radiación, lluvia) en el día, y se ven en Clima y estrés."""
import asyncio, sys, json, io
from playwright.async_api import async_playwright
from PIL import Image
MOCK = open('mock-firebase.js').read()
T = [27.9, 28.2, 27.3, 28.0, 28.8, 29.0]; H = [66, 66, 71, 72, 70, 64]
RESP = {'hora': '11:28', 'lecturas': [{'zona': f'Compartimento {i+1}', 'nave': None, 'ta': T[i], 'hr': H[i], 'vent': ['99% (Barlov.) --> 97%', 100] if i == 0 else [97, 100]} for i in range(6)],
        'exterior': {'ta': 22.4, 'hr': 52, 'viento': 0, 'dir': '334° (NO)', 'rad': 0, 'lluvia': 'NO', 'mm': 0}}
pedidos = []
async def servidor(route):
    rq = route.request
    if rq.method == 'GET': return await route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps({'ok': True, 'configurado': True, 'proveedor': 'OpenAI'}))
    if rq.method == 'OPTIONS': return await route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST, OPTIONS'})
    pedidos.append(json.loads(rq.post_data))
    await route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps({'text': json.dumps(RESP), 'proveedor': 'OpenAI'}))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await ctx.route('https://ia.prueba.workers.dev/**', servidor)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # se lee estando en Planos: los compartimentos son de la Gasolinera
        await pg.evaluate("cerrarSplash();st.cfg.iaUrl='https://ia.prueba.workers.dev';st.finca='pinta';st.cab='pla';st.tab='estres';renderAll()"); await pg.wait_for_timeout(600)
        im = Image.new('RGB', (300, 200), (240, 240, 240)); bio = io.BytesIO(); im.save(bio, 'JPEG')
        await pg.set_input_files('#es_uc', files=[{'name': 'climatec.jpg', 'mimeType': 'image/jpeg', 'buffer': bio.getvalue()}]); await pg.wait_for_timeout(2500)
        assert 'Compartimento' in pedidos[-1]['prompt'] and 'exterior' in pedidos[-1]['prompt']
        assert await pg.evaluate("st.cab") == 'gas', 'pasa a la Gasolinera'
        res = await pg.evaluate("st.es.uc.res.map(x=>[x.comp,x.k,x.vent])"); print('al revés:', res)
        assert [r[1] for r in res] == ['n6', 'n5', 'n4', 'n3', 'n2', 'n1'] and res[0][2] == [99, 100]
        assert 'viento 0 km/h' in await pg.text_content('#main .ucres') and 'sin lluvia' in await pg.text_content('#main .ucres')
        await pg.screenshot(path='pruebas/salida/t108-compartimentos.png', full_page=True)
        # por defecto: la media en todas las naves
        med = await pg.text_content('#main .ucmed'); print('media:', med); assert '28,2 °C' in med and '68 %' in med and 'ventanas 99 %' in med and '6 naves' in med
        assert await pg.locator('#main [data-ucz]:visible').count() == 0, 'con la media no hace falta elegir nave'
        await pg.locator('#main .ucres').screenshot(path='pruebas/salida/t108-media.png')
        await pg.click('[data-esact="ucok"]'); await pg.wait_for_timeout(500)
        c = await pg.evaluate("st.reg.clima"); print('media apuntada:', c['gas:n1'], c['gas:n6'])
        assert all(c[f'gas:n{i}']['ta'] == 28.2 and c[f'gas:n{i}']['hr'] == 68.2 and c[f'gas:n{i}']['vent'] == [99] for i in range(1, 7))
        assert (await pg.evaluate("st.reg.meteo"))['ext']['ta'] == 22.4
        # cada compartimento en su nave
        await pg.set_input_files('#es_uc', files=[{'name': 'climatec.jpg', 'mimeType': 'image/jpeg', 'buffer': bio.getvalue()}]); await pg.wait_for_timeout(2500)
        await pg.click('[data-esact="ucmodo"][data-v="nave"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.cfg.climaComp.modo") == 'nave' and await pg.locator('#main [data-ucz]:visible').count() == 6
        # cambiar el orden
        await pg.click('[data-esact="ucinv"][data-v="0"]'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.es.uc.res.map(x=>x.k)") == ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'] and await pg.evaluate("st.cfg.climaComp.inv") is False and await pg.evaluate("st.dirtyCfg") is True
        await pg.click('[data-esact="ucinv"][data-v="1"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-esact="ucok"]'); await pg.wait_for_timeout(500)
        c = await pg.evaluate("st.reg.clima"); m = await pg.evaluate("st.reg.meteo"); print('nave 6:', c['gas:n6'], '· fuera:', m)
        assert c['gas:n6']['ta'] == 27.9 and c['gas:n6']['vent'] == [99, 100] and c['gas:n1']['ta'] == 29.0 and c['gas:n1']['hr'] == 64
        assert m['ext']['ta'] == 22.4 and m['ext']['viento'] == 0 and m['ext']['lluvia'] is False and m['ext']['hora'] == '11:28'
        t = await pg.text_content('#main'); assert 'Fuera (11:28)' in t and 'radiación 0 W/m²' in t
        await pg.locator('#essvg [data-esz="n6"]').dispatch_event('click'); await pg.wait_for_timeout(300)
        assert 'ventanas 99/100 %' in await pg.text_content('#main .essem')
        # se guarda en el día y el orden en la configuración
        await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1800)
        g = await pg.evaluate("Store.getReg(st.fecha).then(r=>[r.clima['gas:n3'],r.meteo.ext])"); assert g[0]['ta'] == 28.0 and g[1]['rad'] == 0
        await pg.evaluate("saveCfg()"); await pg.wait_for_timeout(1500); cc = await pg.evaluate("Store.getConfig().then(c=>c.climaComp)"); assert cc['inv'] is True and cc['modo'] == 'nave'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

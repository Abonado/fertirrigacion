"""Clima y estrés → «Leer captura de UCROP»: la IA lee la captura y devuelve las lecturas por nave; la app las propone en su nave
(por el número del nombre), se puede cambiar o no apuntar una, y al apuntar se rellenan aire, humedad, máxima y mínima."""
import asyncio, sys, json, io
from playwright.async_api import async_playwright
from PIL import Image
MOCK = open('mock-firebase.js').read()
RESP = {'hora': '14:05', 'lecturas': [{'zona': 'Nave 1', 'nave': 1, 'ta': 27.4, 'hr': 62, 'tmax': 31.2, 'tmin': 14.1},
                                       {'zona': 'NAVE 4 · Sector 2', 'nave': None, 'ta': '29,1', 'hr': '48', 'tmax': None, 'tmin': None},
                                       {'zona': 'Exterior', 'nave': None, 'ta': 22, 'hr': 70}]}
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
        await pg.evaluate("cerrarSplash();st.cfg.iaUrl='https://ia.prueba.workers.dev';st.finca='pinta';st.cab='gas';st.tab='estres';renderAll()"); await pg.wait_for_timeout(600)
        assert await pg.locator('label[for="es_uc"]').count() == 1
        im = Image.new('RGB', (200, 120), (240, 240, 240)); bio = io.BytesIO(); im.save(bio, 'PNG')
        await pg.set_input_files('#es_uc', files=[{'name': 'ucrop.png', 'mimeType': 'image/png', 'buffer': bio.getvalue()}]); await pg.wait_for_timeout(2500)
        assert pedidos and 'UCROP' in pedidos[-1]['prompt'] and len(pedidos[-1]['images']) == 1
        res = await pg.evaluate("st.es.uc.res.map(x=>[x.zona,x.k,x.ta,x.hr])"); print('leído:', res)
        assert res == [['Nave 1', 'n1', 27.4, 62], ['NAVE 4 · Sector 2', 'n4', 29.1, 48], ['Exterior', '', 22, 70]], 'nave por el número o por el nombre; el exterior no se apunta'
        await pg.screenshot(path='pruebas/salida/t105-ucrop.png', full_page=True)
        await pg.select_option('[data-ucz="1"]', 'n5'); await pg.wait_for_timeout(200)
        await pg.click('[data-esact="ucok"]'); await pg.wait_for_timeout(500)
        c = await pg.evaluate("st.reg.clima"); print('apuntado:', c)
        assert c['gas:n1']['ta'] == 27.4 and c['gas:n1']['tmax'] == 31.2 and c['gas:n1']['tmin'] == 14.1 and c['gas:n1']['src'] == 'ucrop'
        assert c['gas:n5']['ta'] == 29.1 and 'gas:n4' not in c and await pg.evaluate("st.es.uc") is None and await pg.evaluate("st.dirtyReg") is True
        assert await pg.locator('#essvg [data-esz="n1"] polygon').get_attribute('fill') != '#cfd8e3', 'la nave 1 ya tiene medida'
        # si la IA no ve datos de clima
        RESP['lecturas'] = []
        await pg.set_input_files('#es_uc', files=[{'name': 'otra.png', 'mimeType': 'image/png', 'buffer': bio.getvalue()}]); await pg.wait_for_timeout(2500)
        assert 'No se ven datos de clima' in await pg.text_content('#main .banner')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

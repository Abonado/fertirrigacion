"""Muestras de drenaje (botón por bandeja y aviso al guardar) y Montaje de tuberías con IA (piezas, pasos y pedido de material)."""
import asyncio, sys, json, io
from playwright.async_api import async_playwright
from PIL import Image
MOCK = open('mock-firebase.js').read()
RESP = {'titulo': 'Toma para dos bidones con grifo', 'tuberia': {'material': 'PE', 'diametro_mm': 32, 'seguro': False, 'como_medir': 'Mira el número impreso en la tubería'},
        'piezas': [{'pieza': 'Collarín de toma 32 x 1/2"', 'medida': '32 mm', 'cantidad': 1, 'ud': 'unidades', 'para': 'sacar el agua'},
                   {'pieza': 'Te 1/2" rosca hembra', 'cantidad': 1, 'ud': 'unidades'},
                   {'pieza': 'Llave de bola 1/2"', 'cantidad': 2, 'ud': 'unidades', 'para': 'un grifo por bidón'},
                   {'pieza': 'Cinta de teflón', 'cantidad': 1, 'ud': 'rollos'}],
        'herramientas': ['Llave inglesa'], 'pasos': ['Cierra el agua y quita presión', 'Coloca el collarín'], 'comprobar': ['Que no gotee'], 'avisos': ['Pon antirretorno si es agua de beber']}
pedidos = []
async def servidor(route):
    rq = route.request
    if rq.method == 'OPTIONS': return await route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST, OPTIONS'})
    pedidos.append(json.loads(rq.post_data))
    await route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps({'text': '```json\n' + json.dumps(RESP) + '\n```'}))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await ctx.route('https://ia.prueba.workers.dev/**', servidor)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # 1. Muestras
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='drenaje';renderAll()"); await pg.wait_for_timeout(600)
        ids = await pg.evaluate("cabById('gas').sectores[0].bandejas.map(b=>b.id)")
        await pg.fill(f'#dr_{ids[0]}', '900'); await pg.fill(f'#dr_{ids[1]}', '850')
        await pg.click(f'label.mue:has(input[data-k="reg.mue.{ids[0]}"])'); await pg.wait_for_timeout(200)
        assert await pg.evaluate(f"st.reg.mue['{ids[0]}']") is True
        sid = await pg.evaluate("cabById('gas').sectores[0].id")
        txt = await pg.text_content(f'#mu_{sid}'); print('contador:', txt); assert '1 de' in txt
        await pg.locator(f'label.mue:has(input[data-k="reg.mue.{ids[0]}"])').screenshot(path='pruebas/salida/t82-muestra.png')
        await pg.locator(f'#main section.card:has(#mu_{sid})').screenshot(path='pruebas/salida/t82-drenaje.png')
        print('faltan:', await pg.evaluate("muFaltan()")); assert len(await pg.evaluate("muFaltan()")) == 1
        await pg.evaluate("saveReg()"); await pg.wait_for_timeout(1500)
        t = await pg.text_content('#toast'); print('aviso:', t); assert 'falta coger la muestra' in t
        g = await pg.evaluate("Store.getReg(hoy()).then(r=>r.mue)"); print('guardado:', g); assert g[ids[0]] is True
        # 2. Montaje con IA
        await pg.evaluate("st.cfg.iaUrl='https://ia.prueba.workers.dev';st.tab='montaje';renderAll()"); await pg.wait_for_timeout(500)
        assert await pg.locator('#tabs [data-tab="montaje"]').count() == 1
        await pg.fill('#tb_txt', 'Sacar agua a dos bidones con un grifo en cada uno'); await pg.select_option('#tb_diam', '32')
        im = Image.new('RGB', (64, 64), (40, 40, 40)); bio = io.BytesIO(); im.save(bio, 'JPEG')
        await pg.set_input_files('#tb_foto', files=[{'name': 'tubo.jpg', 'mimeType': 'image/jpeg', 'buffer': bio.getvalue()}]); await pg.wait_for_timeout(600)
        assert await pg.locator('.tbf img').count() == 1
        await pg.click('[data-act="tb-run"]'); await pg.wait_for_timeout(1500)
        pr = pedidos[-1]; assert '32 mm (lo dice el trabajador)' in pr['prompt'] and len(pr['images']) == 1 and 'dos bidones' in pr['prompt']
        assert await pg.locator('.tbp').count() == 4 and 'sin confirmar' in await pg.text_content('#tb_res')
        await pg.screenshot(path='pruebas/salida/t82-montaje.png', full_page=True)
        await pg.locator('.tbp input').nth(3).uncheck(); await pg.wait_for_timeout(100)
        await pg.click('[data-act="tb-pedir"]'); await pg.wait_for_timeout(1500)
        m = await pg.evaluate("Store.listCol('material',10).then(l=>l[0])"); print('pedido:', m['art'], '|', m['nota'].replace('\n', ' / '))
        assert m['art'].startswith('Montaje:') and m['cant'] == 3 and '2 × Llave de bola' in m['nota'] and 'teflón' not in m['nota'] and 'sin confirmar' in m['nota']
        assert 'Pedido enviado' in await pg.text_content('#tb_res')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

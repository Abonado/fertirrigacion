"""Asistente IA agrícola: conversación con Claude a través del servidor (simulado), con los datos de la finca y una foto."""
import asyncio, sys, json, base64, io
from playwright.async_api import async_playwright
from PIL import Image
MOCK = open('mock-firebase.js').read()
pedidos = []
async def servidor(route):
    rq = route.request
    if rq.method == 'GET': return await route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body='{"ok": true, "configurado": true, "proveedor": "OpenAI"}')
    if rq.method == 'OPTIONS': return await route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST, OPTIONS'})
    b = json.loads(rq.post_data); pedidos.append(b)
    txt = '**Causas más probables**\n- Poco drenaje: las sales se acumulan\n- Receta fuerte para la radiación de estos días\n\nSube un poco el riego y mira la CE de la bandeja mañana.' if len(pedidos) == 1 else 'Con la foto: bordes secos típicos de **falta de calcio** o de salinidad.'
    await route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps({'text': txt, 'modelo': 'claude-sonnet-5-5'}))
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.cfg.iaUrl='https://ia.prueba.workers.dev';st.tab='chatia';renderAll()"); await pg.wait_for_timeout(800)
        assert await pg.locator('[data-ch-sug]').count() == 5
        await pg.click('[data-ch-sug="0"]'); await pg.wait_for_timeout(1500)
        print('contexto enviado:', pedidos[0]['contexto'][:160].replace('\n', ' | '))
        assert pedidos[0]['chat'][-1]['text'].startswith('¿Por qué') and 'Cabezal: Gasolinera' in pedidos[0]['contexto'] and 'Receta' in pedidos[0]['contexto']
        assert await pg.locator('.chm.ia ul li').count() == 2
        # segunda pregunta con foto y sin los datos de la finca
        im = Image.new('RGB', (64, 64), (120, 160, 80)); bio = io.BytesIO(); im.save(bio, 'JPEG')
        await pg.set_input_files('#ch_foto', files=[{'name': 'hoja.jpg', 'mimeType': 'image/jpeg', 'buffer': bio.getvalue()}]); await pg.wait_for_timeout(600)
        await pg.click('[data-ch="ctx"]'); await pg.fill('#ch_txt', '¿Y esto qué es?'); await pg.click('[data-act="ch-enviar"]'); await pg.wait_for_timeout(1500)
        b2 = pedidos[1]; print('2ª petición: mensajes', len(b2['chat']), '· fotos', len(b2['images']), '· contexto', repr(b2['contexto'][:20]))
        assert len(b2['chat']) == 3 and len(b2['images']) == 1 and b2['contexto'] == ''
        assert 'falta de calcio' in await pg.evaluate("document.querySelector('#ch_box').textContent")
        await pg.screenshot(path='pruebas/salida/t79-chat.png', full_page=True)
        # la conversación sigue al volver
        await pg.evaluate("st.ch=null;st.tab='cuentas';renderAll();st.tab='chatia';renderAll()"); await pg.wait_for_timeout(400)
        assert await pg.locator('.chm').count() == 4
        await pg.click('[data-act="ch-nueva"]'); await pg.wait_for_timeout(300); assert await pg.locator('.chm').count() == 0
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

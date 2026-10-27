"""IA incidencias con el selector «Planta / Riego e instalación»: cada tipo manda sus propias instrucciones,
el de riego lleva el drenaje por sector y bandeja, y el diagnóstico se guarda con su tipo."""
import asyncio, sys, json, io
from playwright.async_api import async_playwright
from PIL import Image
MOCK = open('mock-firebase.js').read()
RESP = {'resumen': 'Parece obstrucción de goteros por cal en el sector 1.', 'urgencia': 'media',
        'posibles': [{'problema': 'Goteros obstruidos por cal', 'tipo': 'obstrucción', 'probabilidad': 'alta', 'senales': 'costra blanca y poco drenaje', 'comprobar': 'mide el caudal de 5 goteros', 'actuacion': 'limpieza con ácido'},
                     {'problema': 'Filtro sucio', 'tipo': 'filtrado', 'probabilidad': 'media', 'senales': 'caudal bajo', 'comprobar': 'mira la presión antes y después del filtro', 'actuacion': 'limpiar el filtro'}], 'faltan': ''}
pedidos = []
async def servidor(route):
    rq = route.request
    if rq.method == 'GET': return await route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps({'ok': True, 'configurado': True, 'proveedor': 'OpenAI'}))
    if rq.method == 'OPTIONS': return await route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST, OPTIONS'})
    pedidos.append(json.loads(rq.post_data))
    await route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps({'text': json.dumps(RESP), 'proveedor': 'OpenAI'}))
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
        # datos del día: el sector 1 drena mucho menos que el 2 con los mismos minutos
        await pg.evaluate("""cerrarSplash();st.finca='pinta';st.cab='gas';const c=cabById('gas'),r=st.reg;
          c.sectores.forEach((s,i)=>{r.min[s.id]=120;s.bandejas.forEach(bj=>{r.dren[bj.id]=i===0?1500:9000;r.ceD[bj.id]=4.2;r.phD[bj.id]=6.1})});
          st.cfg.iaUrl='https://ia.prueba.workers.dev';st.tab='diagnostico';renderAll()""")
        await pg.wait_for_timeout(600)
        assert await pg.get_attribute('[data-dgtipo="planta"]', 'aria-pressed') == 'true'
        await pg.click('[data-dgtipo="riego"]'); await pg.wait_for_timeout(300)
        assert await pg.get_attribute('[data-dgtipo="riego"]', 'aria-pressed') == 'true'
        assert 'Qué ves' in await pg.text_content('label[for="dg_sint"]') and 'riego y drenaje por sector' in await pg.text_content('#main')
        await pg.fill('#dg_sint', 'En el sector 1 hay goteros que no echan agua y otros con costra blanca')
        im = Image.new('RGB', (64, 64), (200, 200, 200)); bio = io.BytesIO(); im.save(bio, 'JPEG')
        await pg.set_input_files('#dg_foto', files=[{'name': 'gotero.jpg', 'mimeType': 'image/jpeg', 'buffer': bio.getvalue()}]); await pg.wait_for_timeout(600)
        await pg.click('[data-act="dg-run"]'); await pg.wait_for_timeout(2000)
        pr = pedidos[-1]['prompt']; print(pr[-700:])
        s1 = await pg.evaluate("cabById('gas').sectores[0].nombre")
        assert 'riego por goteo' in pr and 'técnico agrónomo' not in pr and 'costra blanca' in pr and len(pedidos[-1]['images']) == 1
        assert 'Por sector y bandeja' in pr and f'- {s1}: 120 min' in pr and 'drenaje' in pr, 'el prompt de riego tiene que llevar el drenaje por sector'
        assert await pg.locator('section.card:has(h3:text-is("Resultado")) .dgp').count() == 2 and 'Goteros obstruidos' in await pg.text_content('#main')
        await pg.screenshot(path='pruebas/salida/t88-riego.png', full_page=True)
        print('IA:', await pg.evaluate('NUBE.ia.nombre()')); assert await pg.evaluate('NUBE.ia.nombre()') == 'OpenAI'
        d = await pg.evaluate("Store.listCol('diagnosticos',10).then(l=>l[0])"); print('guardado:', d['tipo'], d['sint'][:40])
        assert d['tipo'] == 'riego'
        assert 'Riego e instalación ·' in await pg.text_content('.msgs')
        # vuelve a planta: instrucciones de agrónomo, sin las de riego
        await pg.click('[data-dgtipo="planta"]'); await pg.wait_for_timeout(300)
        assert await pg.locator('section.card:has(h3:text-is("Resultado"))').count() == 0, 'al cambiar de tipo se quita el resultado anterior'
        await pg.evaluate("st.dg.sint='hojas amarillas';st.dg.fotos=[];renderMain()")
        await pg.click('[data-act="dg-run"]'); await pg.wait_for_timeout(2000)
        pr2 = pedidos[-1]['prompt']; assert 'técnico agrónomo' in pr2 and 'riego por goteo' not in pr2
        d2 = await pg.evaluate("Store.listCol('diagnosticos',10).then(l=>l.map(x=>x.tipo))"); print('tipos guardados:', d2); assert sorted(d2) == ['planta', 'riego']
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

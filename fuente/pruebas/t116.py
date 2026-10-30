"""Taller · Diseña hablando: el asistente pregunta con opciones (dos preguntas → se mandan juntas), y cuando lo tiene claro escribe la
especificación del prototipo (lo de la IA más lo que sale del Taller: piezas, batería, cadena de datos) y crea los diseños del proyecto
con su pestaña «Especificación». Nodos inventados fuera; sin IA, aviso; si falla la IA, no se pierde lo escrito. IA simulada."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
IA = r"""window._prs=[];window._resp=[
 {listo:false,mensaje:'Vale. Dos cosas para afinar:',preguntas:[{t:'¿A qué distancia queda la caseta con WiFi?',ops:['Menos de 300 m','300 m a 1 km','Más de 1 km']},{t:'¿Tienes ya pasarela?',ops:['Sí','No']}]},
 {listo:true,mensaje:'Hecho.',nodos:[{nodo:'N2',nombre:'Humedad parcela 3',min:14,lugar:'fuera',unidades:3},{nodo:'P',nombre:'Pasarela caseta',min:10,lugar:'inv'},{nodo:'ZZ9',nombre:'inventado'}],
  spec:{objetivo:'Saber cuándo regar la parcela 3 midiendo la humedad del suelo.',alcance:['3 puntos a 20 cm'],validacion:['Comparar con el tensiómetro una semana'],riesgos:['El capacitivo se engaña con suelo muy salino'],supuestos:['Parcela a 400 m de la caseta']},falta:''}];
window.iaFotoJson=async(pr,b)=>{window._prs.push(pr);const r=window._resp.shift();if(r==='error')throw {code:'red'};return r}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # --- sin IA: aviso
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='taller';renderAll()"); await pg.wait_for_timeout(1500)
        t = (await pg.text_content('.tl-as')).upper(); assert 'DISEÑA HABLANDO' in t
        if not await pg.evaluate("iaModo()"): assert 'ACTÍVALA EN AJUSTES' in t, t
        else: print('modo IA del simulador:', await pg.evaluate("iaModo()"))
        # --- con IA
        await pg.evaluate("localStorage.setItem('abono.ia',JSON.stringify({url:'https://ia.example',pin:'1'}));" + IA + ";renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.locator('[data-tlas="di"]').count() == 4
        await pg.locator('[data-tlas="di"]').first.click(); await pg.wait_for_timeout(400)
        pr = await pg.evaluate("window._prs[0]"); assert 'Agricultor: Un sensor de humedad del suelo' in pr and 'N2:' in pr and 'N9:' in pr and 'JSON' in pr, pr[-600:]
        assert await pg.locator('.tl-msg').count() == 2 and await pg.locator('[data-tlas="op"]').count() == 5
        await pg.locator('[data-tlas="op"][data-t="300 m a 1 km"]').click(); await pg.wait_for_timeout(200)
        assert await pg.evaluate("window._prs.length") == 1, 'con dos preguntas espera a la segunda'
        await pg.screenshot(path='pruebas/salida/t116-preguntas.png', full_page=True)
        await pg.locator('[data-tlas="op"][data-t="No"]').click(); await pg.wait_for_timeout(500)
        pr = await pg.evaluate("window._prs[1]"); assert '¿A qué distancia queda la caseta con WiFi? → 300 m a 1 km. ¿Tienes ya pasarela? → No' in pr, pr[-500:]
        t = (await pg.text_content('.tl-as')).upper(); print('spec:', t[t.find('ESPECIFICACIÓN'):][:400])
        assert 'ESPECIFICACIÓN DEL PROTOTIPO' in t and 'SABER CUÁNDO REGAR' in t and 'CRIEROS' not in t and 'CRITERIOS DE VALIDACIÓN' in t and 'RIESGOS Y DUDAS' in t
        assert 'HELTEC V3 → RADIO LORA 868 MHZ → PASARELA CON WIFI (INCLUIDA)' in t and 'TALLER → MIS APARATOS' in t and 'INVENTADO' not in t
        assert await pg.locator('.tl-spt tr').count() == 3 and '15 MIN' in t and 'DÍAS SIN SOL' in t, 'tabla: 2 aparatos, 14 → 15 min, autonomía'
        assert 'CREAR LOS 2 DISEÑOS' in t
        g = await pg.evaluate("JSON.parse(localStorage.getItem('abono.tlasis')).msgs.length"); assert g == 4, g
        await pg.screenshot(path='pruebas/salida/t116-spec.png', full_page=True)
        # --- cambiar algo con error de la IA: no se pierde lo escrito
        await pg.click('[data-tlas="seguir"]'); await pg.fill('#tl_asin', 'Mejor cada 30 min'); await pg.evaluate("window._resp=['error']"); await pg.click('[data-tlas="env"]'); await pg.wait_for_timeout(400)
        assert 'NO HE PODIDO CONTESTAR' in (await pg.text_content('.tl-as')).upper() and await pg.input_value('#tl_asin') == 'Mejor cada 30 min'
        # vuelve a dar la especificación (la misma respuesta de antes)
        await pg.evaluate("window._resp=[{listo:true,mensaje:'Cambiado.',nodos:[{nodo:'N2',nombre:'Humedad parcela 3',min:30,lugar:'fuera',unidades:3},{nodo:'P',nombre:'Pasarela caseta'}],spec:{objetivo:'Saber cuándo regar.',riesgos:['Salinidad']},falta:''}]")
        await pg.click('[data-tlas="env"]'); await pg.wait_for_timeout(400)
        await pg.click('[data-tlas="crear"]'); await pg.wait_for_timeout(600)
        d = await pg.evaluate("({v:st.tl.v,n:st.tl.d.nombre,u:st.tl.d.unidades,m:st.tl.d.en.min,nodo:st.tl.d.nodo,e:st.tl.d.energia,l:st.tl.d.lugar,lista:TALLER.lista().map(x=>x.nombre+'|'+x.spec.grupo)})"); print(d)
        assert d['v'] == 'spec' and d['n'] == 'Humedad parcela 3' and d['u'] == 3 and d['m'] == 30 and d['nodo'] == 'N2' and d['e'] == 'solar' and d['l'] == 'fuera'
        assert len(d['lista']) == 2 and d['lista'][0].split('|')[1] == d['lista'][1].split('|')[1]
        t = (await pg.text_content('#main')).upper(); assert '3 UNIDADES' in t and 'DEL MISMO PROYECTO' in t and 'LA CONVERSACIÓN' in t and await pg.locator('[data-tl="v"][data-v="spec"][aria-pressed="true"]').count() == 1
        await pg.screenshot(path='pruebas/salida/t116-diseno.png', full_page=True)
        await pg.click('[data-tl="abrir"]'); await pg.wait_for_timeout(300); assert await pg.evaluate("st.tl.d.nodo") == 'P'
        await pg.click('[data-tl="v"][data-v="piezas"]'); await pg.wait_for_timeout(200); assert await pg.locator('.tl-pz').count() == 1
        txt = await pg.evaluate("TALLER.specTexto(st.tl.d.spec,st.tl.d.spec.nodos)"); assert 'OBJETIVO' in txt and 'Humedad parcela 3 | Humedad de sustrato | 3' in txt, txt[:400]
        # la conversación se ha vaciado tras crear
        await pg.click('[data-tl="volver"]'); await pg.wait_for_timeout(300); assert await pg.locator('.tl-msg').count() == 0 and await pg.locator('[data-tlas="di"]').count() == 4
        print('t116 OK'); print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

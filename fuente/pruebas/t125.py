"""AGRO, el asistente de voz: botón redondo; escucha (reconocimiento de voz simulado), manda lo dicho y los datos de ahora a la IA
(simulada) y lo dice en voz alta (síntesis simulada); hace lo que se le pide: apuntar la regla (resta la lectura anterior y guarda el día),
abrir una pantalla y apuntar una nota con aviso; también por escrito."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
VOZ = r"""window._dicho=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,cancel(){},getVoices(){return [{lang:'es-ES',name:'x'}]},speak(u){window._dicho.push(u.text);setTimeout(()=>u.onend&&u.onend(),10)}}});
window.SpeechSynthesisUtterance=function(t){this.text=t};
window._oir='';window.SpeechRecognition=function(){const r=this;this.start=()=>{setTimeout(()=>{r.onresult&&r.onresult({results:[Object.assign([{transcript:window._oir}],{isFinal:true})]});setTimeout(()=>r.onend&&r.onend(),20)},50)};this.stop=()=>{r.onend&&r.onend()}};
"""
IA = "window._prs=[];window._resp=[];window.iaFotoJson=async(pr)=>{window._prs.push(pr);return window._resp.shift()};"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid', is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await ctx.add_init_script(VOZ)
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate(IA); await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='hoy';renderAll()"); await pg.wait_for_timeout(600)
        await pg.evaluate("(()=>{const d=new Date(hoy()+'T12:00:00');d.setDate(d.getDate()-1);st.hist=[{fecha:isoD(d),cm:{},vac:{pot_gas:87}}]})()")
        assert await pg.locator('#agbtn').is_visible()
        # 1) hablar: apuntar la regla
        await pg.evaluate("window._oir='apunta 125 en el potásico';window._resp.push({decir:'Apuntado: ciento veinticinco en el potásico de Gasolinera.',acciones:[{tipo:'lectura',bidon:'pot_gas',cm:125}]})")
        await pg.click('#agbtn'); await pg.wait_for_timeout(1800)
        pr = await pg.evaluate("window._prs.find(x=>typeof x==='string'&&x.includes('Eres AGRO'))"); assert 'Usuario: apunta 125 en el potásico' in pr and 'pot_gas: Depósito potásico' in pr and 'PANTALLAS:' in pr and '"tipo":"lectura"' in pr
        assert await pg.evaluate("st.reg.vac.pot_gas") == 125 and await pg.evaluate("st.reg.cm.pot_gas") == 38
        g = await pg.evaluate("Store.getReg(hoy())"); assert g and g['vac']['pot_gas'] == 125 and g['cm']['pot_gas'] == 38, 'guardado'
        t = (await pg.text_content('#agp')).upper(); print(t[:300]); assert 'APUNTA 125 EN EL POTÁSICO' in t and '✓ REGLA 125,0 CM' in t and '38,0 CM GASTADOS' in t
        assert 'Apuntado' in (await pg.evaluate("window._dicho"))[-1]
        await pg.screenshot(path='pruebas/salida/t125-agro.png')
        # 2) por escrito: abrir una pantalla
        await pg.evaluate("window._resp.push({decir:'Abro rellenar depósito.',acciones:[{tipo:'ir',tab:'rellenar',cab:'fra'}]})")
        await pg.fill('#agtxt', 'abre rellenar depósito de franco'); await pg.press('#agtxt', 'Enter'); await pg.wait_for_timeout(800)
        assert await pg.evaluate("[st.tab,st.cab]") == ['rellenar', 'fra']
        # 3) nota con aviso; y una acción con un bidón que no existe no hace nada
        await pg.evaluate("window._resp.push({decir:'Te lo recuerdo mañana a las ocho.',acciones:[{tipo:'nota',texto:'Pedir nitrato',fecha:'2099-01-02',hora:'8:00'},{tipo:'lectura',bidon:'inventado',cm:3}]})")
        await pg.fill('#agtxt', 'recuérdame pedir nitrato'); await pg.press('#agtxt', 'Enter'); await pg.wait_for_timeout(1200)
        n = await pg.evaluate("(st.notas||[]).find(x=>x.texto==='Pedir nitrato')"); assert n and n['cuando'] == '2099-01-02T08:00', n
        assert 'NO HE PODIDO' in (await pg.evaluate("window._dicho"))[-1].upper()
        # cerrar
        await pg.click('[data-ag="cerrar"]'); await pg.wait_for_timeout(200); assert await pg.locator('#agp').is_hidden()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

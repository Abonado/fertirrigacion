"""v237: frutales en las collas. Una finca puede ser de «Frutales (nectarina, uva, granada)»: en el parte de la colla salen
sus labores (según el cultivo de la parcela), «Parcela», «Fila» y «árboles» en vez de matas; el tomate sigue igual. Informe y Excel."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 420, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # 1) finca de frutales con dos parcelas (nectarina y uva) desde Fincas y cabezales
        await pg.evaluate("""(()=>{const c=st.cfg;c.fincas.push({id:'fru',nombre:'Finca Frutales',cabezales:['nec1','uva1']});
          c.cabezales.push({id:'nec1',nombre:'Parcela Nectarina',ejM3:0,sectores:[]},{id:'uva1',nombre:'Parcela Uva',ejM3:0,sectores:[]});
          cerrarSplash();st.finca='fru';st.tab='estructura';st.edAbierto={nec1:true};renderAll()})()"""); await pg.wait_for_timeout(300)
        ft = '[data-edv="finca.tipo"][data-id="fru"]'
        assert await pg.input_value(ft) == '' and await pg.locator('[data-edv="cab.cultivo"]').count() == 0
        await pg.select_option(ft, 'frutal'); await pg.wait_for_timeout(300)
        assert await pg.evaluate("st.cfg.fincas.find(f=>f.id==='fru').tipo") == 'frutal'
        await pg.select_option('[data-edv="cab.cultivo"][data-id="nec1"]', 'n'); await pg.wait_for_timeout(200)
        await pg.evaluate("cabById('uva1').cultivo='u'")
        assert await pg.evaluate("cabById('nec1').cultivo") == 'n'
        assert await pg.locator('[data-edv="finca.tipo"][data-id="pinta"]').input_value() == '', 'Pinta Santos sigue de tomate'
        # 2) parte de una colla de frutales: poda, Parcela, Fila, árboles
        await pg.evaluate("""(()=>{st.collas=[{id:'c2',nombre:'Colla Frutal',finca:'fru',jefeEmail:miEmail(),ent:'07:00',sal:'15:00',pau:30,miembros:[{id:'a',n:'Ana',activo:true},{id:'b',n:'Luis',activo:true}],activa:true},
          {id:'c1',nombre:'Colla Tomate',finca:'pinta',jefeEmail:miEmail(),ent:'07:00',sal:'15:00',pau:30,miembros:[{id:'a',n:'Ana',activo:true}],activa:true}];
          st.jorDias=999;st.jor={};st.co.colla='c2';st.co.ed=null;st.tab='coparte';renderAll()})()"""); await pg.wait_for_timeout(800)
        await pg.click('[data-act="co-addt"]'); await pg.wait_for_timeout(300)
        t = await pg.evaluate("st.co.ed.trabajos[0]"); assert t['labor'] == 'poda' and t['cab'] == 'nec1', t
        tr = await pg.text_content('.cotr'); assert 'Parcela' in tr and 'Fila' in tr and 'Árboles hechos' in tr and 'Cabezal' not in tr and 'Matas' not in tr, tr
        ops = await pg.locator('#ct_l_0 option').all_text_contents(); print(ops)
        assert 'Aclareo de flor' in ops and 'Poda de invierno' in ops and 'Despampanado / deshojado' not in ops and 'Destallar / deshojar' not in ops, ops
        await pg.select_option('#ct_c_0', 'uva1'); await pg.wait_for_timeout(300)
        ops = await pg.locator('#ct_l_0 option').all_text_contents(); assert 'Despampanado / deshojado' in ops and 'Anillado' in ops and 'Aclareo de flor' not in ops, ops
        await pg.select_option('#ct_l_0', 'aclareoracimo'); await pg.wait_for_timeout(200)
        await pg.fill('#ct_matas_0', '300'); await pg.locator('#ct_matas_0').dispatch_event('input'); await pg.wait_for_timeout(200)
        r = await pg.text_content('#cot_0'); assert 'árboles/h' in r, r
        # 3) la colla de tomate sigue igual
        await pg.evaluate("st.co.colla='c1';st.co.ed=null;st.finca='pinta';renderAll()"); await pg.wait_for_timeout(500)
        await pg.click('[data-act="co-addt"]'); await pg.wait_for_timeout(300)
        tr = await pg.text_content('.cotr'); assert 'Cabezal' in tr and 'Nave' in tr and 'Matas hechas' in tr and 'Parcela' not in tr, tr
        ops = await pg.locator('#ct_l_0 option').all_text_contents(); assert 'Destallar / deshojar' in ops and 'Poda de invierno' not in ops, ops
        # 4) rendimiento y Excel con partes de frutal
        await pg.evaluate("""(()=>{st.finca='fru';st.co.ed=null;st.co.per='7';st.co.fil=null;const f=hoy();st.jor={j1:{id:'j1',fecha:f,colla:'c2',collaNombre:'Colla Frutal',pau:30,gente:{a:{n:'Ana',e:'pre',ent:'07:00',sal:'15:00'},b:{n:'Luis',e:'pre',ent:'07:00',sal:'15:00'}},trabajos:[{id:'t1',labor:'poda',cab:'nec1',matas:150,pas:[]},{id:'t2',labor:'recolectar',cab:'uva1',cajas:40,pas:[],h:2}]}};st.tab='corend';renderAll()})()"""); await pg.wait_for_timeout(500)
        m = await pg.text_content('#main'); assert 'Poda de invierno' in m and 'Árboles' in m, m[:600]
        await pg.evaluate("window.xlsxBlob=sh=>{window.__sh=sh;return new Blob(['x'])};window.saveBlob=(bl,n)=>{window.__n=n}")
        await pg.click('[data-act="co-xlsx"]'); await pg.wait_for_timeout(400)
        sh = await pg.evaluate("window.__sh"); fh = lambda nm, c0: next(r for x in sh if x['name'] == nm for r in x['rows'] if r and r[0] == c0)
        h3 = fh('Por persona', 'Persona'); h4 = fh('Por labor', 'Labor')
        assert 'Poda de invierno h' in h3 and 'Poda de invierno árboles/h' in h3 and 'Destallar / deshojar h' in h3 and 'Anillado h' not in h3, h3
        assert h4[4] == 'Árboles', h4
        # ninguna pantalla falla con una finca de frutales
        for t in await pg.evaluate("TABS.map(t=>t[0])"):
            await pg.evaluate(f"st.tab='{t}';try{{renderAll()}}catch(e){{window.__e=(window.__e||[]).concat('{t}: '+e.message)}}"); await pg.wait_for_timeout(80)
        fallos = await pg.evaluate("window.__e||[]"); assert not fallos, fallos
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

"""Órdenes de tratamiento (v192): el encargado manda producto, dosis, lugar y hora; la cantidad de producto sale calculada;
al aplicador le llega en su idioma (etiquetas traducidas en la app y notas por la IA), la puede escuchar y marca que la ha hecho;
hecha, se pasa al cuaderno con todo rellenado y la orden queda marcada «En el cuaderno»."""
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
        await pg.evaluate("""(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'mustafa@demo.es'])];a.info={...a.info,'mustafa@demo.es':{nombre:'Mustafa',areas:['campo']}};await NUBE.db.doc('acceso/usuarios').set(a);
          window._prs=[];window.iaFotoJson=async(pr)=>{window._prs.push(pr);return {plaga:'توتا أبسولوتا',notas:'رش جيدًا على الجهة السفلية للأوراق'}};
          cerrarSplash();st.tab='otrat';renderAll()})()"""); await pg.wait_for_timeout(1200)
        assert 'otrat' in await pg.evaluate("gruposAct().flatMap(g=>g.tabs).join(',')"), 'pestaña Tratamientos en Equipo'
        await pg.click('[data-act="ot-nueva"]'); await pg.wait_for_timeout(300)
        await pg.select_option('#otf_para', 'mustafa@demo.es'); await pg.wait_for_timeout(200)
        await pg.select_option('#otf_idioma', 'ar'); await pg.wait_for_timeout(200)
        await pg.fill('#otf_plaga', 'Tuta absoluta'); await pg.fill('#otf_prod', 'Spintor 480 SC'); await pg.fill('#otf_reg', 'ES-00001')
        await pg.fill('#otf_dosis', '25'); await pg.select_option('#otf_ud', 'cc/hL'); await pg.wait_for_timeout(200)
        await pg.fill('#otf_sup', '8000'); await pg.fill('#otf_caldo', '800'); await pg.fill('#otf_ps', '3')
        await pg.fill('#otf_notas', 'Mojar bien el envés de las hojas')
        calc = await pg.text_content('#ot_total'); print(calc)
        assert '200 ml' in calc and '1000 L/ha' in calc.replace('.', ''), calc
        assert 'Enviar a Mustafa' in await pg.text_content('[data-act="ot-enviar"]')
        await pg.click('[data-act="ot-enviar"]'); await pg.wait_for_timeout(1500)
        o = await pg.evaluate("st.ot.list[0]"); print(o)
        assert o['idioma'] == 'ar' and o['para'] == 'mustafa@demo.es' and o['tr']['notas'].startswith('رش'), o
        pr = await pg.evaluate("window._prs[0]"); assert 'árabe' in pr and 'Tuta absoluta' in pr and 'Mojar bien' in pr
        assert await pg.evaluate("st.ot.form") is None
        # el encargado la ve en español; con el botón, como la verá Mustafa
        card = pg.locator('#ot_' + o['id'])
        t = await card.text_content(); assert '200 ml en 800 L de agua' in t and 'Sin abrir todavía' in t and 'Árabe' not in t, t
        await card.locator('[data-otlg][data-v="ar"]').click(); await pg.wait_for_timeout(300)
        card = pg.locator('#ot_' + o['id']); t = await card.text_content(); print(t)
        assert '200 مل في 800 لتر من الماء' in t and 'رش جيدًا' in t and 'توتا' in t and 'الحماية الإلزامية' in t, t
        assert await card.locator('.ot-cuerpo').get_attribute('dir') == 'rtl'
        await card.locator('[data-act="ot-hablar"]').click(); await pg.wait_for_timeout(200)
        voz = await pg.evaluate("window._otVoz"); assert voz and 'معالجة' in voz and 'Spintor' in voz, voz
        # se guarda el idioma de la persona para la próxima
        assert await pg.evaluate("otPersonaIdioma('mustafa@demo.es')") == 'ar'
        # al escribir el mismo producto otra vez se rellenan registro y dosis
        await pg.click('[data-act="ot-nueva"]'); await pg.wait_for_timeout(300)
        await pg.fill('#otf_prod', 'Spintor 480 SC'); await pg.locator('#otf_prod').dispatch_event('change'); await pg.wait_for_timeout(300)
        f = await pg.evaluate("st.ot.form"); assert f['reg'] == 'ES-00001' and f['dosis'] == '25' and f['ps'] == '3', f
        # orden para mí mismo en francés: la veo en francés y la marco hecha
        await pg.select_option('#otf_para', 'juanjo.serrano3@gmail.com'); await pg.wait_for_timeout(200)
        await pg.select_option('#otf_idioma', 'fr'); await pg.wait_for_timeout(200)
        await pg.fill('#otf_caldo', '1000'); await pg.fill('#otf_sup', '8000'); await pg.fill('#otf_notas', '')
        await pg.click('[data-act="ot-enviar"]'); await pg.wait_for_timeout(1500)
        o2 = await pg.evaluate("st.ot.list[0]"); assert o2['idioma'] == 'fr' and o2['para'] == 'juanjo.serrano3@gmail.com'
        card2 = pg.locator('#ot_' + o2['id']); t2 = await card2.text_content(); print(t2)
        assert '250 ml dans 1000 L d’eau' in t2 and 'C’est fait' in t2 and 'Ne pas récolter avant le' in t2, t2
        await card2.locator('[data-act="ot-hecha"]').click(); await pg.wait_for_timeout(200)
        await pg.fill('#ot_nota', 'Todo bien'); await pg.locator('#ot_' + o2['id'] + ' [data-act="ot-ok"]').click(); await pg.wait_for_timeout(800)
        o2 = await pg.evaluate(f"st.ot.list.find(x=>x.id==='{o2['id']}')"); assert o2['hecha'] and o2['nota'] == 'Todo bien'
        # pasar al cuaderno: el formulario de tratamientos sale relleno
        await pg.evaluate("st.ot.lang={}"); await pg.evaluate("renderMain()"); await pg.wait_for_timeout(200)
        await pg.click('#ot_' + o2['id'] + ' [data-act="ot-cuad"]'); await pg.wait_for_timeout(800)
        assert await pg.evaluate("st.tab") == 'cuaderno'
        f = await pg.evaluate("st.cq.form"); print(f)
        assert f['_t'] == 'fito' and f['prod'] == 'Spintor 480 SC' and f['reg'] == 'ES-00001' and f['dosis'] == 25 and f['ud'] == 'cc/hL' and abs(f['sup'] - 0.8) < 1e-9 and f['caldo'] == 1250 and f['ps'] == 3 and f['_orden'] == o2['id'], f
        await pg.evaluate("""(async()=>{const c=cqC();c.pers=[{id:'p1',nom:'Juanjo'}];c.parcelas=[{id:'pa1',n:'1',nom:'Gasolinera'}];const f=st.cq.form;f.parcelas=['pa1'];f.apl='p1';await cqGuardar()})()"""); await pg.wait_for_timeout(1200)
        assert await pg.evaluate(f"st.ot.list.find(x=>x.id==='{o2['id']}').cuad") is True
        assert await pg.evaluate("st.cuad.some(x=>x.tipo==='fito'&&x.prod==='Spintor 480 SC')")
        await pg.evaluate("st.tab='otrat';renderAll()"); await pg.wait_for_timeout(400)
        assert 'En el cuaderno' in await pg.text_content('#ot_' + o2['id'])
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 420, ancho
        await pg.locator('#ot_' + o['id']).screenshot(path='pruebas/salida/t136-orden.png')
        await pg.locator('#ot_' + o['id'] + ' [data-otlg][data-v="ar"]').click(); await pg.wait_for_timeout(300)
        await pg.locator('#ot_' + o['id']).screenshot(path='pruebas/salida/t136-orden-ar.png')
        # borrar
        await pg.click('#ot_' + o['id'] + ' [data-act="ot-del"]'); await pg.click('#ot_' + o['id'] + ' [data-act="ot-del-yes"]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate(f"!st.ot.list.some(x=>x.id==='{o['id']}')")
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

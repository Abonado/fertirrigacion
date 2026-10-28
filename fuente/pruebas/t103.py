"""Plazo de seguridad y cuaderno: un tratamiento con plazo en una parcela con naves avisa «no recolectar» en Tu día, en la tarjeta de
la finca, arriba de Mapa de la finca, en las tareas de esas naves y en el trabajo de recolectar de la colla; sin nave avisa solo si es
todo el cabezal; al pasar el plazo desaparece. El cuaderno tiene hora, naves y BBCH, autorrellena un producto ya usado y saca el CSV."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid', accept_downloads=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        # parcela con las naves 2 y 3 de Gasolinera; tratamiento ayer con 5 días de plazo
        await pg.evaluate("""(async()=>{const c=cqC();c.parcelas=[{id:'p1',n:'1',nom:'Gasolinera 2-3',cab:'gas',naves:'2, 3',sup:0.6,cult:'Tomate',prov:'30',muni:'3',pol:'1',par:'2',rec:'3'},{id:'p2',n:'2',nom:'Planos',cab:'pla',sup:1,cult:'Tomate'}];
          c.pers=[{id:'a1',nom:'Pepe Pérez',nif:'1X',ropo:'R1'}];st.savedCfg.cuad=clone(c);await Store.setConfig(clone(st.savedCfg));
          const ay=plAdd(hoy(),-1);await Store.setCol('cuaderno','f1',{tipo:'fito',fecha:ay,hora:'08:30',parcelas:['p1'],sup:0.6,plaga:'Tuta',prod:'Insecticida X',reg:'ES-123',ma:'abamectina',dosis:1,ud:'L/ha',apl:'a1',ps:5,bbch:'7'});
          await Store.setCol('cuaderno','f2',{tipo:'fito',fecha:plAdd(hoy(),-10),parcelas:['p2'],sup:1,plaga:'Oídio',prod:'Azufre',reg:'ES-9',dosis:2,ud:'kg/ha',apl:'a1',ps:3});
          st.cuad=null;st.tareas=[{id:'t1',titulo:'Recolectar nave 2',cab:'gas',nave:2,fecha:hoy(),hecha:false,finca:'pinta'},{id:'t2',titulo:'Recolectar nave 5',cab:'gas',nave:5,fecha:hoy(),hecha:false,finca:'pinta'}];
          renderSplash();spRes&&spRes()})()"""); await pg.wait_for_timeout(1500)
        A = await pg.evaluate("plzActivos()"); print('plazos activos:', A)
        desde = await pg.evaluate("plAdd(hoy(),4)")
        assert len(A) == 1 and A[0]['cab'] == 'gas' and A[0]['naves'] == [2, 3] and A[0]['desde'] == desde, 'el azufre de hace 10 días con 3 de plazo ya no cuenta'
        T = await pg.evaluate("plzTextos()"); print('aviso:', T); assert 'naves 2, 3' in T[0] and 'Insecticida X' in T[0]
        # Tu día
        tu = await pg.evaluate("resumenHTML()"); assert 'Plazo de seguridad: no recolectar' in tu and 'naves 2, 3' in tu
        # tarjeta de la finca
        av = await pg.evaluate("avisosFinca(st.cfg.fincas.find(f=>f.id==='pinta')).map(x=>x[1])"); print('finca:', av); assert any('Plazo de seguridad' in x for x in av)
        # Mapa de la finca y tareas
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='mapa';renderAll()"); await pg.wait_for_timeout(600)
        assert 'no recolectar' in (await pg.text_content('#main .plzban')).lower()
        assert 'No recolectar hasta' in await pg.evaluate("plzPill('gas',2)") and await pg.evaluate("plzPill('gas',5)") == '' and await pg.evaluate("plzPill('gas',null)") == ''
        tt = await pg.evaluate("st.tareas.map(t=>{const d=document.createElement('div');d.innerHTML=tareaHTML(t);return d.textContent})"); print('tareas:', [t[:70] for t in tt])
        assert any('Recolectar nave 2' in t and 'No recolectar hasta' in t for t in tt) and any('Recolectar nave 5' in t and 'No recolectar' not in t for t in tt)
        # trabajo de recolectar de la colla en la nave 3
        h = await pg.evaluate("coTrabHTML({colla:'c1',gente:{},trabajos:[]},{labor:'recolectar',cab:'gas',nave:3},0,false)"); assert 'No recolectar hasta' in h
        h = await pg.evaluate("coTrabHTML({colla:'c1',gente:{},trabajos:[]},{labor:'destallar',cab:'gas',nave:3},0,false)"); assert 'No recolectar' not in h
        await pg.screenshot(path='pruebas/salida/t103-plazo.png')
        # cuaderno: hora, BBCH, naves de la parcela y autorrelleno del producto
        await pg.evaluate("st.tab='cuaderno';st.cq.sec='fito';st.cq.form=cqFormDe('fito');renderAll()"); await pg.wait_for_timeout(600)
        assert await pg.locator('#cq_hora[type="time"]').count() == 1 and await pg.locator('#cq_bbch').count() == 1 and await pg.locator('datalist#cq_prods option').count() == 2
        await pg.fill('#cq_prod', 'insecticida x'); await pg.locator('#cq_prod').dispatch_event('change'); await pg.wait_for_timeout(400)
        f = await pg.evaluate("st.cq.form"); print('autorrelleno:', {k: f[k] for k in ['reg', 'ma', 'dosis', 'ud', 'ps', 'apl']})
        assert f['reg'] == 'ES-123' and f['dosis'] == 1 and f['ps'] == 5 and f['apl'] == 'a1'
        await pg.evaluate("st.cq.form=null;st.cq.sec='parcelas';st.cq.form=cqFormDe('parcelas');renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.locator('#cq_naves').count() == 1
        # CSV legible por máquina
        await pg.evaluate("st.cq.form=null;st.cq.sec='exportar';renderMain()"); await pg.wait_for_timeout(300)
        async with pg.expect_download() as dl: await pg.click('[data-act="cq-csv"]')
        d = await dl.value; raw = open(await d.path(), 'rb').read(); assert raw[:3] == b'\xef\xbb\xbf' and b'\r\n' in raw; txt = raw.decode('utf-8-sig'); print(d.suggested_filename); print(txt[:400])
        lin = txt.strip().split('\r\n'); cab = lin[0].split(';'); print('líneas:', len(lin), repr(lin[-1][:200]))
        assert cab[:4] == ['fecha', 'hora_inicio', 'producto', 'n_registro'] and len(lin) == 3
        fila = dict(zip(cab, lin[2].split(';'))); assert fila['hora_inicio'] == '08:30' and fila['bbch'] == '7' and 'naves 2,3' in fila['invernadero_naves'] and fila['sigpac'] == '30-3-1-2-3' and fila['recolectar_desde'] == desde and fila['superficie_m2'] == '6000'
        # cuando pasa el plazo, desaparece
        await pg.evaluate("st.cuad.find(x=>x.id==='f1').fecha=plAdd(hoy(),-5)"); assert await pg.evaluate("plzActivos().length") == 0
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

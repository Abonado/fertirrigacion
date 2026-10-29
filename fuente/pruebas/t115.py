"""Mis aparatos (tanda de mejoras): datos en vivo de la colección «lecturas» (gráficas, batería con días que le quedan, «sin datos»,
placas que mandan y no están dadas de alta); mandar el mantenimiento a la colla (al marcar la tarea hecha se apunta en el aparato);
avisos programados; etiquetas QR; el aparato sobre su nave en «En vivo»; Clima y estrés rellenado con el sensor; prueba de cobertura;
informe del mes."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
DATOS = r"""(async()=>{const now=Date.now(),dia=864e5,f=t=>new Date(t).toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'});
  const hace=d=>{const x=new Date();x.setDate(x.getDate()-d);return isoD(x)};
  await Store.setCol('aparatos','apA',{ts:new Date().toISOString(),tipo:'N4',nombre:'Clima nave 3',cab:'gas',nave:'3',inst:hace(60),nota:'',estado:'activo',dev:'AAA111',
    mant:[{t:'Limpiar la garita',cada:30,ult:''},{t:'Limpiar la placa solar',cada:30,ult:''}],calib:{cada:180,ult:''},hist:[{f:hace(60),t:'Instalado',por:'Juanjo'}],
    dato:{ts:new Date(now-3*3600e3).toISOString(),txt:'24,1 °C · 70 %',bat:3.9,v:{ta:24.1,hr:70,th:22.9},auto:true}});
  /* 7 días de datos cada 30 min, la batería bajando 20 mV al día; el último hace 3 h */
  const docs={};for(let t=now-7*dia;t<=now-3*3600e3;t+=1800e3){const k=f(t),h=new Date(t).getHours();(docs[k]=docs[k]||[]).push({t,v:{ta:+(18+8*Math.sin((h-8)/24*2*Math.PI)).toFixed(1),hr:70,th:+(17+8*Math.sin((h-8)/24*2*Math.PI)).toFixed(1)},bat:+(4.05-(now-t)/dia*-0.02-0.14).toFixed(3),rssi:-96})}
  for(const [k,p] of Object.entries(docs))await Store.setCol('lecturas','AAA111_'+k,{dev:'AAA111',nodo:'N4',fecha:k,ts:new Date(p[p.length-1].t).toISOString(),p});
  await Store.setCol('lecturas','BBB222_'+f(now),{dev:'BBB222',nodo:'N5',fecha:f(now),ts:new Date(now-600e3).toISOString(),p:[{t:now-600e3,v:{t:16.2},bat:3.95}]});
})()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid', geolocation={'latitude': 37.9, 'longitude': -1.1}, permissions=['geolocation'])
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate(DATOS); await pg.wait_for_timeout(500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.ap=undefined;st.lec=undefined;st.tab='aparatos';renderAll()"); await pg.wait_for_timeout(2000)
        t = (await pg.text_content('#main')).upper(); print(t[:300])
        assert 'SIN MANDAR DATOS' in t and 'SIN DATOS DESDE HACE 3 H' in t and 'PLACA BBB222' in t
        # la placa suelta se da de alta con su número y su tipo
        await pg.click('[data-apalta="BBB222"]'); await pg.wait_for_timeout(300)
        assert await pg.locator('#ap_dev').input_value() == 'BBB222' and await pg.locator('#ap_tipo').input_value() == 'N5'
        await pg.click('[data-apcancel]'); await pg.wait_for_timeout(200)
        # ficha: gráficas y batería
        await pg.click('[data-apver="apA"]'); await pg.wait_for_timeout(500)
        assert await pg.locator('.apg svg').count() == 3, 'aire, hoja y humedad'
        await pg.click('[data-aph="168"]'); await pg.wait_for_timeout(300)
        t = (await pg.text_content('#main')).upper(); assert 'LE QUEDAN UNOS' in t, t[t.find('BATERÍA'):][:200]
        await pg.screenshot(path='pruebas/salida/t115-ficha.png', full_page=True)
        # mandar a la colla y que se apunte al hacerla
        await pg.click('[data-apmandar="0"]'); await pg.wait_for_timeout(800)
        tar = [x for x in await pg.evaluate("Store.listCol('tareas',50)") if x.get('apId') == 'apA']; assert len(tar) == 1 and tar[0]['titulo'].startswith('Limpiar la garita')
        assert 'MANDADA A LA COLLA' in (await pg.text_content('#main')).upper()
        await pg.evaluate("loadTareas()"); await pg.wait_for_timeout(800)
        await pg.evaluate(f"st.td={{id:null,nota:'',adj:[]}};tareaHecha({tar[0]['id']!r})"); await pg.wait_for_timeout(1200)
        ap = [x for x in await pg.evaluate("Store.listCol('aparatos',50)") if x['id'] == 'apA'][0]
        assert ap['mant'][0]['ult'] == await pg.evaluate("hoy()") and ap['hist'][0]['t'].endswith('(tarea hecha)') and ap['dato']['auto'], 'el dato del puente no se pisa'
        # avisos programados (servidor simulado)
        await pg.evaluate("window._push=[];st.cfg.avisosUrl='https://avisos.test';pushApi=async(r,b)=>{window._push.push([r,b]);return {ok:true}};localStorage.removeItem('abono.pushprogap');st.ap=undefined;apCargar()"); await pg.wait_for_timeout(800)
        await pg.evaluate("apProgramar()"); await pg.wait_for_timeout(500)
        pu = await pg.evaluate("window._push"); print('avisos:', [(x[0], x[1].get('id'), x[1].get('titulo'), x[1].get('cuerpo')) for x in pu])
        assert any(x[0] == 'programar' and x[1]['id'] == 'ap-apA' and x[1]['para'] == ['juanjo.serrano3@gmail.com'] and 'Limpiar la placa solar' in x[1]['cuerpo'] for x in pu)
        # etiquetas QR
        await pg.evaluate("window._w='';window.open=()=>({document:{write:h=>{window._w+=h},close(){}}})"); await pg.evaluate("st.apSel=null;renderMain()"); await pg.wait_for_timeout(200)
        await pg.click('[data-apqrall]'); await pg.wait_for_timeout(1500)
        w = await pg.evaluate("window._w"); assert w.count('<svg') >= 1 and 'Clima nave 3' in w and '#ap=apA' not in w
        assert await pg.evaluate("qrSVG(apUrl({id:'apA'})).startsWith('<svg')")
        # el aparato sobre su nave en «En vivo»
        await pg.evaluate("st.tab='vivo';st.vv.todo=false;renderAll()"); await pg.wait_for_timeout(3000)
        n = await pg.locator('#vvsvg .vvap').count(); print('aparatos en el plano:', n); assert n == 1
        await pg.locator('#vvsvg .vvap').first.dispatch_event('click'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("[st.tab,st.apSel]") == ['aparatos', 'apA']
        # Clima y estrés rellenado con el sensor
        await pg.evaluate("st.tab='estres';st.es.z='n3';renderAll()"); await pg.wait_for_timeout(1200)
        assert await pg.locator('[data-essens="n3"]').count() == 1
        await pg.click('[data-essens="n3"]'); await pg.wait_for_timeout(400)
        cl = await pg.evaluate("st.reg.clima['gas:n3']"); print('clima del sensor:', cl); assert cl['fuente'] == 'sensor' and cl['ta'] is not None and cl['tmax'] >= cl['tmin'] and cl['h']
        # prueba de cobertura (recorrido y señales simulados)
        await pg.evaluate("""(async()=>{const now=Date.now();st.cob={ap:'apA',dev:'AAA111',ini:now-60000,fin:null,pts:[[now-50000,37.9,-1.1,5],[now-30000,37.9005,-1.1005,5],[now-10000,37.901,-1.101,5]]};
          const k=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'}),id='AAA111_'+k,l=await Store.listCol('lecturas',200),d=l.find(x=>x.id===id);const {id:_,...doc}=d;
          doc.p=[...doc.p,{t:now-50000,v:{n:1},rssi:-95},{t:now-30000,v:{n:3},rssi:-118}];await Store.setCol('lecturas',id,doc);st.tab='aparatos';st.apSel='apA';renderAll()})()"""); await pg.wait_for_timeout(800)
        await pg.click('[data-cobfin]'); await pg.wait_for_timeout(10000)
        cob = await pg.evaluate("st.ap.find(a=>a.id==='apA').cob"); print('cobertura:', cob['rec'], 'de', cob['n']); assert cob['n'] == 3 and cob['rec'] == 2
        assert await pg.locator('.cobm circle').count() == 2 and 'LLEGAN 2 DE 3' in (await pg.text_content('#main')).upper()
        # informe del mes
        await pg.evaluate("st.apSel=null;renderMain()"); await pg.wait_for_timeout(200); await pg.click('[data-apinf]'); await pg.wait_for_timeout(2500)
        t = (await pg.text_content('#main')).upper(); assert 'INFORME DE' in t and 'CLIMA NAVE 3' in t and 'DÍAS CON DATOS' in t
        await pg.screenshot(path='pruebas/salida/t115-informe.png', full_page=True)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

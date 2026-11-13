"""Arreglos urgentes (v213): el botón AGRO se aparta al bajar por la pantalla y no tapa botones ni casillas (se revisan todas las
pantallas en un móvil); el service worker no espera más de 3 s a la red si hay guardado; y «Sugerencias y fallos»: cualquiera
manda una idea o un fallo, los errores de la app llegan solos, y solo el administrador los lee."""
import asyncio, sys, subprocess, json
from playwright.async_api import async_playwright

# 1) Service worker: con red lenta abre lo guardado a los 3 s y deja guardado lo nuevo; sin red y sin guardado, error; con red buena, lo nuevo
r = subprocess.run(['node', '-e', r"""
const fs=require('fs'),vm=require('vm');const src=fs.readFileSync('netlify/abonado/sw.js','utf8');
const L={};const cache=new Map();const esperas=[];let lenta=0,falla=false;
const caches={open:async()=>({put:async(q,r)=>cache.set(q.url||q,r),addAll:async()=>{}}),match:async q=>cache.get(q.url||q),keys:async()=>[],delete:async()=>true};
const fetch=(q)=>new Promise((ok,ko)=>setTimeout(()=>falla?ko(new Error('red')):ok({ok:true,type:'basic',v:'nuevo',clone(){return{v:'nuevo'}}}),lenta));
class Response{static error(){return{error:true}}}
const ctx={self:{addEventListener:(n,f)=>L[n]=f,skipWaiting(){},clients:{claim(){}}},caches,fetch,Response,URL,Request:class{},location:{origin:'https://x.es'},setTimeout,clearTimeout,Promise,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const pide=async(url)=>{let p,w=[];L.fetch({request:{method:'GET',url,mode:'navigate'},respondWith:x=>p=x,waitUntil:x=>w.push(x)});const t0=Date.now();const r=await p;return{r,ms:Date.now()-t0,w}};
(async()=>{const U='https://x.es/index.html';
  lenta=50;let a=await pide(U);if(a.r.v!=='nuevo'||a.ms>1000)throw 'red buena: '+JSON.stringify(a);
  cache.set(U,{v:'viejo'});lenta=6000;a=await pide(U);if(a.r.v!=='viejo'||a.ms<2900||a.ms>3600)throw 'red lenta: '+a.ms+' '+JSON.stringify(a.r);
  await Promise.all(a.w);if(cache.get(U).v!=='nuevo')throw 'no guardó lo nuevo';
  cache.clear();lenta=20;falla=true;a=await pide(U);if(!a.r.error)throw 'sin red ni guardado: '+JSON.stringify(a.r);
  cache.set(U,{v:'viejo'});a=await pide(U);if(a.r.v!=='viejo')throw 'sin red con guardado';
  console.log('SW OK')})().catch(e=>{console.log('SW MAL',e);process.exit(1)});
"""], capture_output=True, text=True, timeout=60)
print(r.stdout, r.stderr); assert 'SW OK' in r.stdout
reglas = open('firestore.rules').read()
assert 'match /abonado_buzon/{doc}' in reglas and "coleccion != 'abonado_buzon'" in reglas and "allow read, delete: if esAdmin();" in reglas

MOCK = open('mock-firebase.js').read()
TAPA = """(async()=>{   /* «tapado»: AGRO encima de su centro o de más de la mitad (una fila ancha se toca por otro lado) */
const b=document.getElementById('agbtn');if(!b||b.hidden)return {n:-1};const tapados=new Set();const H=document.documentElement.scrollHeight;
  const mira=()=>{if(getComputedStyle(b).pointerEvents==='none'||getComputedStyle(b).opacity==='0')return;const r=b.getBoundingClientRect();
    document.querySelectorAll('#main button,#main input,#main select,#main textarea,#main a').forEach(e=>{const q=e.getBoundingClientRect();const w=Math.min(q.right,r.right)-Math.max(q.left,r.left),h=Math.min(q.bottom,r.bottom)-Math.max(q.top,r.top),cx=(q.left+q.right)/2,cy=(q.top+q.bottom)/2;
    if(q.width&&w>4&&h>4&&((cx>r.left&&cx<r.right&&cy>r.top&&cy<r.bottom)||w*h>q.width*q.height/2))tapados.add((e.dataset.act||e.id||e.textContent||'').trim().slice(0,30))})};
  await new Promise(r=>setTimeout(r,400));mira();
  for(let y=0;y<=H;y+=150){scrollTo(0,y);await new Promise(r=>setTimeout(r,40));mira()}
  scrollTo(0,0);await new Promise(r=>setTimeout(r,400));mira();   /* en reposo arriba: AGRO ya se ha recolocado */
  return {n:tapados.size,cuales:[...tapados].slice(0,5)}})()"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', **p.devices['iPhone 13'], locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort()); await ctx.route('https://archive-api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','campo@demo.es':'campo123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(700)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'campo@demo.es'])];a.info={...a.info,'campo@demo.es':{nombre:'Campo',areas:['campo']}};await NUBE.db.doc('acceso/usuarios').set(a);cerrarSplash()})()")
        await pg.wait_for_timeout(400)
        # 2) AGRO: se aparta al bajar, vuelve al subir y arriba
        await pg.evaluate("st.finca='pinta';st.tab='cuentas';renderAll()"); await pg.wait_for_timeout(500)
        assert not await pg.evaluate("document.getElementById('agbtn').hidden"), 'AGRO debería verse'
        await pg.evaluate("scrollTo(0,400)"); await pg.wait_for_timeout(250)
        assert await pg.evaluate("document.body.classList.contains('agfuera')"), 'al bajar AGRO se aparta'
        assert await pg.evaluate("getComputedStyle(document.getElementById('agbtn')).pointerEvents") == 'none'
        await pg.evaluate("scrollTo(0,300)"); await pg.wait_for_timeout(250)
        assert not await pg.evaluate("document.body.classList.contains('agfuera')"), 'al subir AGRO vuelve'
        await pg.evaluate("scrollTo(0,0)"); await pg.wait_for_timeout(250)
        # en ninguna pantalla tapa un botón o una casilla mientras se recorre de arriba abajo
        tabs = await pg.evaluate("TABS.map(t=>t[0]).filter(t=>VIEWS[t]&&tabPermitida(t))"); malos = []
        for t in tabs:
            await pg.evaluate(f"(()=>{{st.tab='{t}';renderAll();scrollTo(0,0)}})()"); await pg.wait_for_timeout(250)
            d = await pg.evaluate(TAPA)
            if d['n'] > 0: malos.append((t, d))
        print('pantallas', len(tabs), 'con algo tapado por AGRO:', malos)
        assert not malos, malos
        # 3) Sugerencias y fallos: el administrador recibe; la persona de campo manda pero no lee
        await pg.evaluate("st.tab='buzon';renderAll()"); await pg.wait_for_timeout(600)
        assert 'Sugerencias y fallos' in await pg.text_content('#main') and 'Recibido' in await pg.text_content('#main')
        await pg.evaluate("setTimeout(()=>Promise.reject(new Error('fallo de prueba 143')),0)"); await pg.wait_for_timeout(400)
        await pg.evaluate("setTimeout(()=>Promise.reject(new Error('fallo de prueba 143')),0)"); await pg.wait_for_timeout(400)   # repetido: no se manda dos veces
        docs = await pg.evaluate("Object.entries(JSON.parse(localStorage.getItem('mockfb')).docs).filter(([k])=>k.startsWith('abonado_buzon/')).map(([k,v])=>v)")
        errores = [d for d in docs if d['tipo'] == 'error']; print('errores', errores)
        assert len(errores) == 1 and errores[0]['txt'] == 'fallo de prueba 143' and errores[0]['de'] == 'juanjo.serrano3@gmail.com' and errores[0]['v'] == 'abonado-v213' and errores[0]['tab'] == 'buzon'
        errs.clear()   # el error de prueba lo ve también Playwright: es lo esperado
        await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.fill('#nb_em', 'campo@demo.es'); await pg.fill('#nb_pw', 'campo123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash()"); await pg.wait_for_timeout(300)
        assert 'cbuzon' in await pg.evaluate("TABS.map(t=>t[0]).filter(t=>VIEWS[t]&&tabPermitida(t))")
        await pg.evaluate("st.tab='cajustes';renderAll()"); await pg.wait_for_timeout(400)
        await pg.click('[data-tab="cbuzon"]'); await pg.wait_for_timeout(500)
        t = await pg.text_content('#main'); assert 'Sugerencias y fallos' in t and 'Recibido' not in t, t[:300]
        await pg.click('[data-bz="tipo"][data-t="fallo"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-bz="enviar"]'); await pg.wait_for_timeout(300)
        assert 'Escribe' in (await pg.text_content('#toast') or '')
        await pg.fill('#bz_txt', 'Al fichar se queda pensando'); await pg.click('[data-bz="enviar"]'); await pg.wait_for_timeout(800)
        assert 'Gracias' in (await pg.text_content('#toast') or '') and await pg.input_value('#bz_txt') == ''
        docs = await pg.evaluate("Object.entries(JSON.parse(localStorage.getItem('mockfb')).docs).filter(([k])=>k.startsWith('abonado_buzon/')).map(([k,v])=>v)")
        f = [d for d in docs if d['tipo'] == 'fallo']; print(f)
        assert len(f) == 1 and f[0]['de'] == 'campo@demo.es' and f[0]['tab'] == 'cajustes' and f[0]['txt'] == 'Al fichar se queda pensando'
        assert set(f[0]) <= {'tipo', 'txt', 'donde', 'de', 'nombre', 'v', 'tab', 'disp', 'ts', 'mod'}, 'solo los campos que dejan las reglas'
        # el administrador lo ve y lo marca como visto
        await pg.evaluate("NUBE.auth.signOut()"); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.bz=null;st.tab='buzon';renderAll()"); await pg.wait_for_timeout(800)
        t = await pg.text_content('#main'); assert 'Al fichar se queda pensando' in t and 'fallo de prueba 143' in t and 'Sin ver (2)' in t, t[-600:]
        await pg.locator('.bzi', has_text='Al fichar').locator('[data-bz="visto"]').click(); await pg.wait_for_timeout(500)
        assert 'Sin ver (1)' in await pg.text_content('#main')
        await pg.screenshot(path='pruebas/salida/t143-buzon.png')
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 390, ancho
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

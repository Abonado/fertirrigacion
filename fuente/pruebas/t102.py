"""Carpetas de los partes, casos que fallaban: al volver a abrir la app hay que dar permiso otra vez y Chrome solo deja pedirlo en el
mismo clic (si el Excel tarda en prepararse, ya no deja) → la app lo pide al pulsar «Excel»; si el parte está abierto en Excel se guarda
como «(2)»; si la carpeta ya no existe avisa y lo descarga; y en Ajustes se ve si falta permiso y se da con un botón."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
FAKE = """(()=>{const fs={};window.__fs=fs;window.__perm='prompt';window.__bloq=[];window.__pedidos=[];
  const err=n=>{const e=new Error(n);e.name=n;return e};
  const dir=(ruta)=>({kind:'directory',name:ruta.split('/').pop(),
    queryPermission:async()=>window.__perm,
    requestPermission(){const act=navigator.userActivation.isActive;window.__pedidos.push(act);if(window.__perm==='granted')return Promise.resolve('granted');
      if(!act)return Promise.reject(err('SecurityError'));return Promise.resolve(window.__perm='granted')},
    getDirectoryHandle:async(n)=>{if(window.__borrada)throw err('NotFoundError');return dir(ruta+'/'+n)},
    getFileHandle:async(n)=>({createWritable:async()=>{if(window.__bloq.includes(n))throw err('NoModificationAllowedError');let b=null;return{write:async x=>{b=x},close:async()=>{fs[ruta+'/'+n]=b.size}}}})});
  const mem={grande:dir('Partes grandes')};window.idbGet=async x=>mem[x]||null;window.idbSet=async(x,v)=>{if(v==null)delete mem[x];else mem[x]=v;return true};
  // el Excel tarda en prepararse más de lo que Chrome deja pedir permiso (5 s)
  const r0=window.radCargar;window.radCargar=async(...a)=>{await new Promise(r=>setTimeout(r,5600));return r0(...a)}})()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 1100, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid', accept_downloads=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate(FAKE)
        # como al volver a abrir la app: la carpeta está elegida pero sin permiso
        await pg.evaluate("st.carp=null;carpCargar()"); await pg.wait_for_timeout(300)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='pla';st.tab='ajustes';st.ajAb=new Set(AJ_GR.map(g=>g[0]));renderAll()"); await pg.wait_for_timeout(500)
        t = await pg.evaluate("document.querySelector('#main').textContent"); assert 'falta dar permiso' in t and await pg.locator('[data-act="carp-permiso"][data-t="grande"]').count() == 1
        # descarga del Excel: el permiso se pide en el clic, aunque el Excel tarde en prepararse
        await pg.evaluate("st.tab='parte';renderAll()"); await pg.wait_for_timeout(400)
        await pg.click('[data-act="parte-xlsx"][data-tipo="grande"]'); await pg.wait_for_timeout(7500)
        fs = await pg.evaluate("window.__fs"); print('archivos:', fs, '· permiso pedido con el clic activo:', await pg.evaluate("window.__pedidos"))
        assert len(fs) == 1 and list(fs.values())[0] > 1000 and await pg.evaluate("window.__pedidos[0]") is True
        nombre = list(fs)[0].split('/')[-1]; print('toast:', await pg.text_content('#toast'))
        # el parte está abierto en Excel → se guarda como «(2)»
        await pg.evaluate(f"window.__bloq=[{nombre!r}]")
        await pg.click('[data-act="parte-xlsx"][data-tipo="grande"]'); await pg.wait_for_timeout(7000)
        fs = await pg.evaluate("window.__fs"); print('con el Excel abierto:', list(fs)); toast = await pg.text_content('#toast'); print('toast:', toast)
        assert any(k.endswith(nombre.replace('.xlsx', ' (2).xlsx')) for k in fs) and 'estaba abierto' in toast
        # la carpeta ya no existe → aviso y descarga normal
        await pg.evaluate("window.__borrada=true;window.radCargar=async()=>{}")
        async with pg.expect_download() as dl: await pg.click('[data-act="parte-xlsx"][data-tipo="grande"]')
        print('descargado:', (await dl.value).suggested_filename); await pg.wait_for_timeout(300); assert 'ya no existe' in await pg.text_content('#toast')
        # en Ajustes: con permiso
        await pg.evaluate("window.__borrada=false;carpEstado().then(()=>{st.tab='ajustes';renderAll()})"); await pg.wait_for_timeout(400)
        assert 'con permiso' in await pg.evaluate("document.querySelector('#main').textContent") and await pg.locator('[data-act="carp-permiso"]').count() == 0
        # botón «Dar permiso»
        await pg.evaluate("window.__perm='prompt';carpEstado().then(()=>renderMain())"); await pg.wait_for_timeout(300)
        await pg.click('[data-act="carp-permiso"][data-t="grande"]'); await pg.wait_for_timeout(400)
        assert await pg.evaluate("st.carpEst.grande") == 'granted' and 'Permiso dado' in await pg.text_content('#toast')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

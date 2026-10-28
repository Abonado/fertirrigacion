"""Partes en Excel a sus carpetas del ordenador: el grande a una y el pequeño a otra, por mes y cabezal (navegador con carpetas simulado)."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
FAKE = """(()=>{const fs={};window.__fs=fs;const dir=(ruta)=>({kind:'directory',name:ruta.split('/').pop(),
    queryPermission:async()=>window.__perm||'prompt',requestPermission:async()=>{window.__pedido=(window.__pedido||0)+1;return window.__perm='granted'},
    getDirectoryHandle:async(n)=>dir(ruta+'/'+n),getFileHandle:async(n)=>({createWritable:async()=>{let b=null;return{write:async x=>{b=x},close:async()=>{fs[ruta+'/'+n]=b.size}}}})});
  let k=0;window.showDirectoryPicker=async()=>dir(['Partes grandes','Partes pequeños'][k++]);
  const mem={};window.idbGet=async x=>mem[x]||null;window.idbSet=async(x,v)=>{if(v==null)delete mem[x];else mem[x]=v;return true}})()"""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='pla';st.carp=null;st.tab='ajustes';st.ajAb=new Set(AJ_GR.map(g=>g[0]));renderAll()"); await pg.wait_for_timeout(600)
        assert 'Carpetas de los partes' in await pg.evaluate("document.querySelector('#main').textContent")
        await pg.click('[data-act="carp-elegir"][data-t="grande"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="carp-elegir"][data-t="pequeno"]'); await pg.wait_for_timeout(300)
        txt = await pg.evaluate("document.querySelector('#main').textContent"); assert 'Partes grandes' in txt and 'Partes pequeños' in txt
        await pg.evaluate("st.tab='parte';renderAll()"); await pg.wait_for_timeout(500)
        await pg.click('[data-act="parte-xlsx"][data-tipo="grande"]'); await pg.wait_for_timeout(1500)
        await pg.click('[data-act="parte-xlsx"][data-tipo="pequeno"]'); await pg.wait_for_timeout(1500)
        fs = await pg.evaluate("window.__fs"); print('archivos:', fs)
        f = await pg.evaluate("diaRiego(hoy())"); mes = f[:7]; dia = '-'.join(reversed(f.split('-')))
        g = [k for k in fs if k.startswith('Partes grandes/' + mes) and k.endswith(f'/Planos/Control de riegos Planos {dia}.xlsx')]
        q = [k for k in fs if k.startswith('Partes pequeños/' + mes) and k.endswith(f'/Planos/Control de aportes Planos {dia}.xlsx')]
        assert g and q and all(fs[k] > 1000 for k in g + q), 'cada parte en su carpeta, por mes y cabezal'
        assert await pg.evaluate("window.__pedido") == 1, 'el permiso se pide una vez'
        print('toast:', await pg.text_content('#toast'))
        # sin carpeta: descarga normal
        await pg.evaluate("st.tab='ajustes';st.ajAb=new Set(AJ_GR.map(g=>g[0]));renderAll()"); await pg.wait_for_timeout(300); await pg.click('[data-act="carp-quitar"][data-t="grande"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("st.tab='parte';renderAll()"); await pg.wait_for_timeout(300)
        async with pg.expect_download() as dl: await pg.click('[data-act="parte-xlsx"][data-tipo="grande"]')
        print('sin carpeta se descarga:', (await dl.value).suggested_filename)
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

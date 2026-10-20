import asyncio,json
from playwright.async_api import async_playwright
MOCK=open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(service_workers='block',viewport={'width':430,'height':900},device_scale_factor=2,locale='es-ES');pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**',lambda r:r.fulfill(content_type='application/javascript',body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**',lambda r:r.abort())
        await pg.goto('http://localhost:8776/');await pg.evaluate('localStorage.clear()');await pg.reload();await pg.wait_for_timeout(600)
        await pg.fill('#nb_em','juanjo.serrano3@gmail.com');await pg.fill('#nb_pw','admin123');await pg.click('#nb_go');await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='pla';st.tab='solucion';renderAll()");await pg.wait_for_timeout(600)
        print('pestañas:',await pg.locator('#tabs .tab').all_inner_texts())
        # agua en mg/L como en un boletín
        await pg.click('[data-nu-u="mg"]')
        agua={'NO3':31,'H2PO4':0,'SO4':336,'Cl':355,'HCO3':214,'NH4':0,'K':8,'Ca':120,'Mg':61,'Na':230}
        for k,v in agua.items():
            el=pg.locator(f'[data-nu="agua.{k}"]');await el.fill(str(v).replace('.',','));await el.dispatch_event('change')
        for k,v in {'ce':2.3,'ph':7.6}.items():
            el=pg.locator(f'[data-nu="agua.{k}"]');await el.fill(str(v).replace('.',','));await el.dispatch_event('change')
        await pg.wait_for_timeout(300)
        r=await pg.evaluate("JSON.stringify((()=>{const R=nuCalc(nuDraft());return{agua:nuDraft().agua.v,adj:R.adj,need:R.need,prods:R.prods.map(x=>[x.n,+x.dosis.toFixed(2),Object.fromEntries(Object.entries(x.meq).map(([k,v])=>[k,+v.toFixed(2)]))]),fin:Object.fromEntries(Object.entries(R.fin).map(([k,v])=>[k,+v.toFixed(2)])),cat:+R.cat.toFixed(2),an:+R.an.toFixed(2),warn:R.warn}})())")
        print(json.dumps(json.loads(r),ensure_ascii=False,indent=0))
        await pg.locator('#nu_res').screenshot(path='pruebas/salida/nu_res1.png')
        # drenaje con poco potasio y mucho calcio
        for k,v in {'NO3':16,'K':4.5,'Ca':16,'Mg':7,'H2PO4':0.6}.items():
            el=pg.locator(f'[data-nu="dren.{k}"]');await el.fill(str(v).replace('.',','));await el.dispatch_event('change')
        await pg.wait_for_timeout(300)
        r=await pg.evaluate("JSON.stringify((()=>{const R=nuCalc(nuDraft());return{adj:R.adj,prods:R.prods.map(x=>[x.n,+x.dosis.toFixed(2)])}})())");print('con drenaje:',r)
        await pg.click('[data-act="nu-guardar"]');await pg.wait_for_timeout(500)
        print('guardado:',await pg.evaluate("!!(st.savedCfg.nutri&&st.savedCfg.nutri.pla&&st.savedCfg.nutri.pla.agua.v.Ca)"))
        antes=await pg.evaluate("JSON.stringify(bidonesDe('pla').map(b=>b.productos.map(x=>[x.p,x.dosis])))")
        await pg.click('[data-act="nu-aplicar"]');await pg.wait_for_timeout(600)
        print('receta antes:',antes);print('receta después:',await pg.evaluate("JSON.stringify(bidonesDe('pla').map(b=>b.productos.map(x=>[x.p,x.dosis])))"),'tab',await pg.evaluate("st.tab"),'dirty',await pg.evaluate("st.dirtyCfg"))
        await pg.evaluate("st.tab='solucion';renderAll()");await pg.wait_for_timeout(300)
        await pg.screenshot(path='pruebas/salida/nu_full.png',full_page=True)
        print('errs',errs);await b.close()
asyncio.run(main())

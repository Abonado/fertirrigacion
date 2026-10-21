"""Partes recibidos: un trabajador de riego (no encargado) los ve y los descarga, pero no los marca como revisados."""
import asyncio,sys
from playwright.async_api import async_playwright
MOCK=open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(service_workers='block',viewport={'width':430,'height':900},locale='es-ES',accept_downloads=True);pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**',lambda r:r.fulfill(content_type='application/javascript',body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**',lambda r:r.abort())
        await pg.goto('http://localhost:8776/');await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','pepe@demo.es':'pepe1234'},cur:null}))")
        await pg.reload();await pg.wait_for_timeout(600)
        await pg.fill('#nb_em','juanjo.serrano3@gmail.com');await pg.fill('#nb_pw','admin123');await pg.click('#nb_go');await pg.wait_for_timeout(3500)
        await pg.evaluate("""(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'pepe@demo.es'])];a.info={...a.info,'pepe@demo.es':{nombre:'Pepe'}};await NUBE.db.doc('acceso/usuarios').set(a);
          cerrarSplash();st.cab='pla';const r=st.reg;r.m3.pla=200;r.m3.gas=210;for(const bd of st.cfg.bidones)r.cm[bd.id]=8;marcaReg('m3.pla');await saveReg()})()""");await pg.wait_for_timeout(2000)
        n=await pg.evaluate("Store.listCol('partes',300).then(l=>l.length)");print('partes guardados:',n);assert n>0
        await pg.evaluate("NUBE.auth.signOut()");await pg.wait_for_timeout(400);await pg.reload();await pg.wait_for_timeout(800)
        await pg.fill('#nb_em','pepe@demo.es');await pg.fill('#nb_pw','pepe1234');await pg.click('#nb_go');await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='pla';st.tab='partes';st.partes=null;renderAll()");await pg.wait_for_timeout(1500)
        print('pestañas de riego:',await pg.locator('#tabs .tab').all_inner_texts())
        cards=await pg.locator('#main [data-act="pt-pdf"]').count();rev=await pg.locator('#main [data-act="pt-rev"]').count();chips=await pg.locator('#main [data-ptfil]').count()
        print('botones PDF:',cards,'· marcar revisado:',rev,'· filtro sin revisar:',chips);assert cards>0 and rev==0 and chips==0
        async with pg.expect_download() as dl: await pg.locator('#main [data-act="pt-pdf"]').first.click()
        d=await dl.value;print('descargado:',d.suggested_filename)
        async with pg.expect_download() as dl2: await pg.locator('#main [data-act="pt-xlsx"]').first.click()
        d2=await dl2.value;print('descargado:',d2.suggested_filename)
        print('insignia riego (no debe contar partes sin revisar):',await pg.evaluate("insignias().riego||0"))
        print('errs',errs);await b.close();sys.exit(1 if errs else 0)
asyncio.run(main())

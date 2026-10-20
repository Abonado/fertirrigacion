import asyncio,json,base64
from playwright.async_api import async_playwright
MOCK=open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(service_workers='block',viewport={'width':1100,'height':900},accept_downloads=True);pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**',lambda r:r.fulfill(content_type='application/javascript',body=MOCK if 'app-compat' in r.request.url else ''))
        async def om(r):
            if 'shortwave' in r.request.url:
                import datetime;d0=datetime.date.today();ds=[(d0-datetime.timedelta(days=i)).isoformat() for i in range(92,-1,-1)]
                await r.fulfill(content_type='application/json',body=json.dumps({'daily':{'time':ds,'shortwave_radiation_sum':[14.2]*len(ds)}}))
            else: await r.abort()
        await ctx.route('https://api.open-meteo.com/**',om)
        await pg.goto('http://localhost:8776/');await pg.evaluate('localStorage.clear()');await pg.reload();await pg.wait_for_timeout(600)
        await pg.fill('#nb_em','juanjo.serrano3@gmail.com');await pg.fill('#nb_pw','admin123');await pg.click('#nb_go');await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.cab='pla';st.tab='drenaje';renderAll()");await pg.wait_for_timeout(500)
        # datos del día en Planos
        await pg.evaluate("""(async()=>{const r=st.reg,c=cabById('pla');r.m3.pla=203;for(const k of ['m3.pla'])marcaReg(k);
          const v={ceB:1.12,ceR:2.4,incR:0.15,inc:1.85,phS:5.9,m3R:18};for(const[k,x]of Object.entries(v)){r[k]=r[k]||{};r[k].pla=x;marcaReg(k+'.pla')}
          r.obs.pla='Sector 2 con goteros obstruidos en la línea 4';marcaReg('obs.pla');
          c.sectores.forEach((s,i)=>{r.min[s.id]=[120,100][i];r.rie[s.id]=[8,7][i];marcaReg('min.'+s.id);marcaReg('rie.'+s.id);
            s.bandejas.forEach((bj,k)=>{r.dren[bj.id]=[9000,7750,10500,12700,12800,13500][i*3+k];r.ceD[bj.id]=3.1+k*.2;r.phD[bj.id]=6.1+k*.1;for(const g of ['dren','ceD','phD'])marcaReg(g+'.'+bj.id)})});
          for(const b of bidonesDe('pla')){r.cm[b.id]=b.principal==='kno3'?18:b.principal==='ca'?11:b.principal==='fe'?4:6;marcaReg('cm.'+b.id)}
          await saveReg()})()""");await pg.wait_for_timeout(1500)
        await pg.evaluate("st.tab='parte';renderAll()");await pg.wait_for_timeout(500)
        print('botones:',await pg.locator('#main .row .btn').all_inner_texts())
        # productor y superficie
        await pg.evaluate("st.cfg.fincaInfo={pinta:{productor:'Agrícola Ejemplo S.L.'}};st.cfg.parte={pla:{...parteFijos('pla'),sup:10000}}")
        print('cfg parte:',await pg.evaluate("JSON.stringify(st.cfg.parte)"))
        hoja=await pg.evaluate("JSON.stringify(parteData('pla').hoja)");print('hoja:',hoja[:1500])
        async with pg.expect_download() as dl:
            await pg.click('[data-act="parte-pdf"]:not([data-todos])')
        d=await dl.value;await d.save_as('pruebas/salida/parte_pla.pdf');print('pdf:',d.suggested_filename)
        async with pg.expect_download() as dl2:
            await pg.click('[data-act="parte-xlsx"]')
        d2=await dl2.value;await d2.save_as('pruebas/salida/parte_pla.xlsx');print('xlsx:',d2.suggested_filename)
        await pg.evaluate("st.tab='drenaje';renderAll()");await pg.wait_for_timeout(300);await pg.locator('#main section.card').first.screenshot(path='pruebas/salida/dren_salida.png')
        print('errs',errs);await b.close()
asyncio.run(main())

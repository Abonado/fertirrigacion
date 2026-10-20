import asyncio
from playwright.async_api import async_playwright
MOCK=open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(service_workers='block',viewport={'width':430,'height':900},device_scale_factor=2);pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**',lambda r:r.fulfill(content_type='application/javascript',body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**',lambda r:r.abort())
        await pg.goto('http://localhost:8776/');await pg.evaluate('localStorage.clear()');await pg.reload();await pg.wait_for_timeout(600)
        await pg.fill('#nb_em','juanjo.serrano3@gmail.com');await pg.fill('#nb_pw','admin123');await pg.click('#nb_go');await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='fra';st.tab='mapa';renderAll()");await pg.wait_for_timeout(1200)
        await pg.locator('#mapsvg').screenshot(path='pruebas/salida/franco_mapa.png')
        # tocar dentro de la nave 3 para crear incidencia
        r=await pg.evaluate("(()=>{const M=MAPAS.fra;return M.naves.map(nv=>[nv.n,dentro(nv.c,nv.p),pasDe('fra',nv,nv.c)])})()");print('centros dentro:',r)
        print('errs',errs);await b.close()
asyncio.run(main())

"""Mapa de la finca: una sola pestaña en Riego (después del aforo) con cinco vistas —Incidencias, En vivo, Instalación, Clima y estrés y Plagas—;
Equipo ya no tiene Mapa de naves ni Finca en vivo; la pestaña vuelve a la última vista usada; las incidencias urgentes cuentan en Riego."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 1000}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("""(async()=>{const P=MAPAS.gas.naves.find(n=>n.n==2).p,x=P.reduce((t,q)=>t+q[0],0)/P.length,y=P.reduce((t,q)=>t+q[1],0)/P.length;
          await Store.addCol('incidencias',{ts:new Date().toISOString(),fecha:hoy(),finca:'pinta',pasillo:null,fotos:[],cab:'gas',nave:2,x,y,txt:'rotura de tubería',tipo:'riego',prio:'alta',estado:'abierta'});await loadInc();
          cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='cuentas';renderAll()})()"""); await pg.wait_for_timeout(800)
        riego = await pg.locator('#tabs .tab').all_inner_texts(); print('Riego:', riego)
        assert 'MAPA DE LA FINCA' in [t.upper() for t in riego] and not any('INSTALACIÓN' in t.upper() for t in riego)
        await pg.click('#grupos [data-grupo="mas"]'); await pg.wait_for_timeout(300); await pg.click('#main [data-tab="'+await pg.evaluate("GRUPOS_RIEGO.find(g=>g.id==='equipo').tabs.find(tabPermitida)")+'"]'); await pg.wait_for_timeout(300)
        eq = [t.upper() for t in await pg.locator('#tabs .tab').all_inner_texts()]; print('Equipo:', eq)
        assert 'MAPA DE NAVES' not in eq and 'FINCA EN VIVO' not in eq and 'TAREAS' in eq
        assert await pg.evaluate("insignias().riego") >= 1, 'la incidencia urgente cuenta en Riego'
        await pg.click('#grupos [data-grupo="riego"]'); await pg.wait_for_timeout(300)
        await pg.click('#tabs .tab:has-text("Mapa de la finca")'); await pg.wait_for_timeout(600)
        assert await pg.evaluate("st.tab") == 'mapa'
        vis = await pg.locator('.mfsel .mfb').all_inner_texts(); print('vistas:', vis); assert len(vis) == 5 and '1' in vis[0]
        assert 'Incidencias · ' in await pg.text_content('#main h3')
        await pg.click('.mfsel [data-tab="vivo"]'); await pg.wait_for_timeout(800)
        assert await pg.evaluate("st.tab") == 'vivo' and 'En vivo · ' in await pg.text_content('#main h3')
        assert await pg.locator('#tabs .tab[aria-selected="true"]').inner_text() in ('Mapa de la finca', 'MAPA DE LA FINCA')
        await pg.click('.mfsel [data-tab="instal"]'); await pg.wait_for_timeout(600)
        assert await pg.locator('#infsvg').count() == 1
        await pg.screenshot(path='pruebas/salida/t97-mapa-finca.png')
        # vuelve a la última vista usada
        await pg.click('#tabs .tab:has-text("Receta")'); await pg.wait_for_timeout(300)
        await pg.click('#tabs .tab:has-text("Mapa de la finca")'); await pg.wait_for_timeout(500)
        assert await pg.evaluate("st.tab") == 'instal', 'abre la última vista usada'
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

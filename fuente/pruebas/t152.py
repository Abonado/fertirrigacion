"""v214: Campaña (Personal de campo › Trabajo). El gestor pone la plantación de cada zona y la app organiza el año: fase de hoy,
lo de esta semana, lo que viene y el plan completo; los trabajos de campo se mandan a la colla como tareas (una vez); Hoy lo resume
y avisa de lo que falta por mandar. Quien no es gestor lo ve pero no cambia las fechas."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 400, 'height': 860}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        # fecha fija: 13 de noviembre de 2026
        await pg.evaluate("""window.hoy=()=>'2026-11-13';cerrarSplash();st.finca='pinta';st.collas=[{id:'c1',nombre:'Colla Pepe',finca:'pinta',jefeEmail:'juanjo.serrano3@gmail.com',miembros:[]}];st.jorDias=999;st.cinc=[];st.ctar=[];entrarArea('campo')""")
        await pg.wait_for_timeout(500)
        assert 'Pon la fecha de plantación' in await pg.text_content('#main')
        await pg.evaluate("st.tab='ccamp';renderAll()"); await pg.wait_for_timeout(400)
        assert await pg.evaluate("[...document.querySelectorAll('#tabs .tab')].map(b=>b.dataset.tab).sort().join()") == 'ccamp,cincid,cotrat,ctareas'
        z = await pg.evaluate("cabsFinca()[0].id")
        await pg.fill(f'[data-cp="plant"][data-z="{z}"]', '2026-08-10'); await pg.dispatch_event(f'[data-cp="plant"][data-z="{z}"]', 'change'); await pg.wait_for_timeout(800)
        assert await pg.evaluate(f"st.savedCfg.campanas[2026]['{z}'].plant") == '2026-08-10'
        C = await pg.evaluate(f"cpDe(2026,'{z}')"); assert C['fin'] == '2027-04-05' and C['hueco'] == 'descanso', C
        assert await pg.evaluate(f"cpFase(cpDe(2026,'{z}'))") == 'prod'
        t = await pg.text_content(f'.cpz'); assert 'Día 95 desde la plantación' in t and 'Cosecha' in t and 'Receta de invierno' in t and 'Lo hace riego' in t, t[:400]
        # despunte: siete-ocho semanas antes de quitar matas
        assert await pg.evaluate(f"cpItems(cpDe(2026,'{z}')).find(i=>i.id==='despunte').ini") == '2027-01-30'
        # aviso en Hoy
        assert await pg.evaluate("hoyAvisosC().some(a=>a[2]==='ccamp')")
        # mandar las de esta semana: 3 trabajos de campo, una sola vez
        await pg.click('[data-act="cp-todas"]'); await pg.wait_for_timeout(1000)
        T = await pg.evaluate("st.ctar.map(t=>[t.titulo,t.cp,t.cab])")
        assert len(T) == 3 and all(x[1].startswith(f'2026|{z}|') for x in T) and all(x[2] == z for x in T), T
        assert await pg.locator('[data-act="cp-todas"]').count() == 0 and 'Mandada a Colla Pepe' in await pg.text_content('.cpz')
        assert not await pg.evaluate("hoyAvisosC().some(a=>a[2]==='ccamp')")
        # quedan en Tareas de la colla
        L = await pg.evaluate("Store.listCol('ctareas',0).then(l=>l.length)"); assert L == 3, L
        # plan completo y cultivo corto en primavera
        await pg.click(f'[data-act="cp-todo"][data-z="{z}"]'); await pg.wait_for_timeout(300)
        assert 'Descanso sanitario' in await pg.text_content('.cpz')
        await pg.select_option(f'[data-cp="hueco"][data-z="{z}"]', 'corto'); await pg.wait_for_timeout(800)
        t = await pg.text_content('.cpz'); assert 'Plantar el cultivo corto' in t and 'abono orgánico' not in t
        # Hoy lo resume
        await pg.evaluate("st.tab='choy';renderAll()"); await pg.wait_for_timeout(400)
        assert 'Producción · día 95' in await pg.text_content('#main')
        # quien no es gestor: lo ve, sin poder cambiar fechas
        await pg.evaluate("NUBE.user.admin=false;NUBE.user.encargado=false;st.tab='ccamp';renderAll()"); await pg.wait_for_timeout(400)
        assert await pg.locator('[data-cp="plant"]').count() == 0 and 'Plantación' in await pg.text_content('.cpz')
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

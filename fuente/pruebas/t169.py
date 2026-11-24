"""AGRO razona con las CUENTAS: el contexto lleva la dosis deseada y real de cada producto, los m³ y cm del día que está abierto (aunque sea de ayer)
y los días anteriores; el prompt le obliga a dar causas posibles (no una sola) y a no confundir el nivel del bidón con la cuenta; las preguntas de
«por qué» piden el modelo bueno (pro) y las demás no."""
import asyncio, sys, json
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 390, 'height': 844}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='hoy';renderAll()"); await pg.wait_for_timeout(500)
        # un día anterior con datos: m3 y cm gastados en los bidones del cabezal
        info = await pg.evaluate("""(()=>{const f=new Date(Date.now()-864e5).toISOString().slice(0,10);st.fecha=f;st.reg.m3={};st.reg.cm={};st.reg.perd={};
          const bs=bidonesDe('gas');st.reg.m3.gas=200;bs.forEach((b,i)=>{st.reg.cm[b.id]=20+i});return{f,n:bs.length,nom:bs.map(b=>b.nombre)}})()""")
        assert info['n'] > 0, info
        ctxt = await pg.evaluate("agContexto()")
        assert 'CUENTAS DEL DÍA ABIERTO EN LA APP: ' + info['f'] in ctxt and 'ANTERIOR a hoy' in ctxt, ctxt[:400]
        assert '200,00 m³ regados' in ctxt and 'deseada' in ctxt and 'real' in ctxt and 'gastados 20,0 cm' in ctxt, ctxt
        assert any(n in ctxt for n in info['nom'])
        assert 'NO explica por sí solo' in ctxt
        # sin datos apuntados no se rompe y lo dice
        await pg.evaluate("st.reg.m3={};st.reg.cm={}")
        c2 = await pg.evaluate("agContexto()"); assert 'sin datos apuntados ese día' in c2
        # el prompt pide razonar con causas, preguntar lo que falte y no afirmar una sola causa
        pr = await pg.evaluate("agPrompt('por qué me sale el abono bajo')")
        for k in ['PREGUNTAS DE «POR QUÉ»', '2 o 3 causas', 'Nunca presentes una causa como segura', 'dosis REAL BAJA', 'no mezcles el nivel']:
            assert k in pr, k
        # las preguntas de por qué piden el modelo bueno; las demás, el rápido
        await pg.evaluate("window._o=[];window.iaFotoJson=async(p,b,o)=>{window._o.push(o);return{decir:'ok',ver:'',acciones:[]}};AG.busy=false")
        for q in ['por qué me sale el abono bajo', 'qué pasa con el calcio', 'esto no cuadra', 'cuánto queda en el potásico']:
            await pg.evaluate("AG.busy=false"); await pg.evaluate("q=>agPide(q)", q); await pg.wait_for_timeout(150)
        o = await pg.evaluate("window._o")
        assert [bool(x.get('pro')) for x in o] == [True, True, True, False], o
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

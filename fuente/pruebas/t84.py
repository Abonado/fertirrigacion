"""Copia de seguridad (solo administrador) y repetición de las cuentas a partir de ella:
se apuntan dos días (con depósitos compartidos entre Planos y Gasolinera), se descarga la copia y casos.py rehace todas las cuentas
con la app y por su cuenta, y tienen que coincidir."""
import asyncio, sys, json, subprocess
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
DIA = """(async(f,k)=>{await loadFecha(f);const r=st.reg;
  for(const c of ['pla','gas']){r.m3[c]=[161,204][c==='gas'?1:0]+k;marcaReg('m3.'+c);const cb=cabById(c);
    for(const[k2,x]of Object.entries({ceB:1.5,phB:7.8,inc:1.9+k/10,phS:5.6}))if(true){r[k2]=r[k2]||{};r[k2][c]=x;marcaReg(k2+'.'+c)}
    cb.sectores.forEach((s,i)=>{r.min[s.id]=110+10*i+k;r.rie[s.id]=12+i;marcaReg('min.'+s.id);marcaReg('rie.'+s.id);
      s.bandejas.forEach((bj,j)=>{r.dren[bj.id]=7000+500*j+100*k;r.ceD[bj.id]=4.1+j*.2;r.phD[bj.id]=6+j*.1;for(const g of ['dren','ceD','phD'])marcaReg(g+'.'+bj.id)})})}
  for(const b of st.cfg.bidones.filter(b=>b.cabezales.some(c=>c==='pla'||c==='gas'))){r.cm[b.id]=b.principal==='fe'?46.1:b.principal==='hno3'?9.7+k:b.principal==='ca'?14.4:20.8+k;marcaReg('cm.'+b.id)}
  await saveReg()})"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 430, 'height': 900}, locale='es-ES', timezone_id='Europe/Madrid', accept_downloads=True)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto('http://localhost:8776/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='pla'")
        d1, d2 = await pg.evaluate("[diaRiego(diaRiego(hoy())),diaRiego(hoy())]")
        for k, f in enumerate([d1, d2]):
            await pg.evaluate(f"({DIA})('{f}',{k})"); await pg.wait_for_timeout(1200)
        await pg.evaluate("st.tab='ajustes';renderAll()"); await pg.wait_for_timeout(800)
        async with pg.expect_download() as dl: await pg.click('[data-act="copia-bajar"]')
        d = await dl.value; ruta = 'pruebas/salida/copia-prueba.json'; await d.save_as(ruta); print('copia:', d.suggested_filename)
        c = json.load(open(ruta)); print('días en la copia:', len(c['registros']), '· depósitos:', len(c['config']['bidones']))
        assert c['config']['bidones'] and {r['fecha'] for r in c['registros']} >= {d1, d2} and all(r.get('receta') for r in c['registros'] if r['fecha'] == d2)
        print('errs', errs); await b.close()
    # la copia se repite con casos.py: la app y el cálculo independiente tienen que dar lo mismo
    r = subprocess.run([sys.executable, 'pruebas/casos.py', ruta, '--sin-esperado'], capture_output=True, text=True, timeout=300)
    print(r.stdout[-1200:], r.stderr[-1200:])
    assert r.returncode == 0, 'casos.py ha encontrado diferencias'
    sys.exit(1 if errs else 0)
asyncio.run(main())

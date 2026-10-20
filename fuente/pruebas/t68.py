import asyncio,json
from playwright.async_api import async_playwright
MOCK=open('mock-firebase.js').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(service_workers='block',viewport={'width':390,'height':844},device_scale_factor=2,locale='es-ES',timezone_id='Europe/Madrid');pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**',lambda r:r.fulfill(content_type='application/javascript',body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**',lambda r:r.abort())
        prog=[]
        async def av(r):
            prog.append((r.request.url.split('/')[-1],json.loads(r.request.post_data or '{}')));await r.fulfill(content_type='application/json',body='{"ok":true}',headers={'access-control-allow-origin':'*'})
        await ctx.route('https://avisos.test/**',av)
        await pg.goto('http://localhost:8776/');await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','manolo@demo.es':'manolo1'},cur:null}))")
        await pg.reload();await pg.wait_for_timeout(600)
        await pg.fill('#nb_em','juanjo.serrano3@gmail.com');await pg.fill('#nb_pw','admin123');await pg.click('#nb_go');await pg.wait_for_timeout(3500)
        await pg.evaluate("(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'manolo@demo.es'])];a.info={...a.info,'manolo@demo.es':{nombre:'Manolo',areas:['campo']}};await NUBE.db.doc('acceso/usuarios').set(a);st.cfg.avisosUrl='https://avisos.test';st.push.estado='on';cerrarSplash()})()")
        await pg.evaluate("st.finca='pinta';st.tab='notas';renderAll()");await pg.wait_for_timeout(600)
        print('grupos riego:',await pg.locator('#grupos .grp span').all_inner_texts())
        # nota semanal para mañana
        await pg.click('[data-act="nt-nueva"]');await pg.fill('#nt_texto','Revisar filtros del cabezal');await pg.fill('#nt_det','Limpiar las mallas si están sucias')
        await pg.click('[data-act="nt-rapido"][data-d="1"]');await pg.select_option('#nt_rep','sem');await pg.wait_for_timeout(200)
        print('frase:',await pg.locator('#main .card .note').last.inner_text())
        await pg.click('[data-act="nt-guardar"]');await pg.wait_for_timeout(700)
        # nota que ya toca (hace 2 min) y nota sin aviso
        await pg.evaluate("""(async()=>{const d=new Date(Date.now()-120000);st.nt.form={id:null,texto:'Calibrar pHmetro',det:'',fecha:isoD(d),hora:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),rep:'mes',n:3};await ntGuardar();
          st.nt.form={id:null,texto:'Pedir ácido nítrico',det:'',fecha:'',hora:'08:00',rep:'',n:3};await ntGuardar()})()""");await pg.wait_for_timeout(800)
        print('toast:',await pg.evaluate("(document.querySelector('.toast')||{}).textContent||''"))
        print('insignia notas:',await pg.locator('#grupos [data-grupo="notas"] .bdg').all_inner_texts())
        print('programar:',json.dumps([(r,{k:v for k,v in x.items() if k in('id','titulo','borrar')},len(x.get('serie',[])),x.get('para')) for r,x in prog],ensure_ascii=False))
        await pg.screenshot(path='pruebas/salida/notas1.png',full_page=True)
        # marcar hecha la mensual que toca
        idm=await pg.evaluate("st.notas.find(n=>n.texto==='Calibrar pHmetro').id");antes=await pg.evaluate(f"st.notas.find(n=>n.id==='{idm}').cuando")
        await pg.click(f'[data-act="nt-hecha"][data-id="{idm}"]');await pg.wait_for_timeout(600)
        print('mensual antes/después:',antes,await pg.evaluate(f"st.notas.find(n=>n.id==='{idm}').cuando"),'toca:',await pg.evaluate("ntTocan().length"))
        print('serie semanal:',await pg.evaluate("(()=>{const n=st.notas.find(n=>n.rep==='sem');return ntSerie(n,Date.now(),4)})()"))
        print('mes 31:',await pg.evaluate("ntSerie({cuando:'2026-01-31T08:00',rep:'mes',dm:31},0,5)"))
        await pg.screenshot(path='pruebas/salida/notas2.png',full_page=True)
        # otra cuenta (solo campo): no ve las notas del administrador
        ids=await pg.evaluate("st.notas.map(n=>n.id)")
        await pg.evaluate("NUBE.auth.signOut()");await pg.wait_for_timeout(500);await pg.evaluate("localStorage.removeItem('abono.config')");await pg.reload();await pg.wait_for_timeout(800)
        await pg.fill('#nb_em','manolo@demo.es');await pg.fill('#nb_pw','manolo1');await pg.click('#nb_go');await pg.wait_for_timeout(3500)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.tab='cnotas';st.notas=null;renderAll()");await pg.wait_for_timeout(800)
        print('manolo grupos:',await pg.locator('#grupos .grp span').all_inner_texts(),'notas:',await pg.evaluate("st.notas&&st.notas.length"))
        print('manolo lee nota ajena:',await pg.evaluate(f"NUBE.db.doc('notas/{ids[0]}').get().then(()=>'LEÍDA',e=>e.code)"))
        print('manolo lista todas:',await pg.evaluate("NUBE.db.collection('notas').get().then(q=>'LISTADAS '+q.docs.length,e=>e.code)"))
        await pg.click('[data-act="nt-nueva"]');await pg.fill('#nt_texto','Contar cajas');await pg.click('[data-act="nt-guardar"]');await pg.wait_for_timeout(600)
        print('manolo notas tras crear:',await pg.evaluate("st.notas.map(n=>n.texto+' '+n.email)"))
        await pg.screenshot(path='pruebas/salida/notas3.png')
        print('errs',errs);await b.close()
asyncio.run(main())

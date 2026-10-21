"""Material: un trabajador envía un pedido a una persona concreta; solo esa persona lo recibe y lo gestiona."""
import asyncio,sys
from playwright.async_api import async_playwright
MOCK=open('mock-firebase.js').read()
async def entrar(pg,em,pw):
    await pg.evaluate("NUBE.auth.signOut()");await pg.wait_for_timeout(400);await pg.reload();await pg.wait_for_timeout(800)
    await pg.fill('#nb_em',em);await pg.fill('#nb_pw',pw);await pg.click('#nb_go');await pg.wait_for_timeout(3500)
    await pg.evaluate("cerrarSplash();st.finca='pinta';st.mat=null;st.mFil=null;st.tab='material';renderAll()");await pg.wait_for_timeout(1500)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(service_workers='block',viewport={'width':430,'height':900},locale='es-ES');pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**',lambda r:r.fulfill(content_type='application/javascript',body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**',lambda r:r.abort())
        await pg.goto('http://localhost:8776/');await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123','pepe@demo.es':'pepe1234','ana@demo.es':'ana12345','luis@demo.es':'luis1234'},cur:null}))")
        await pg.reload();await pg.wait_for_timeout(600)
        await pg.fill('#nb_em','juanjo.serrano3@gmail.com');await pg.fill('#nb_pw','admin123');await pg.click('#nb_go');await pg.wait_for_timeout(3500)
        await pg.evaluate("""(async()=>{const a=NUBE.acc;a.emails=[...new Set([...a.emails,'pepe@demo.es','ana@demo.es','luis@demo.es'])];
          a.info={...a.info,'pepe@demo.es':{nombre:'Pepe'},'ana@demo.es':{nombre:'Ana',encargado:true},'luis@demo.es':{nombre:'Luis'}};await NUBE.db.doc('acceso/usuarios').set(a)})()""");await pg.wait_for_timeout(800)
        # Pepe pide material y lo envía a Luis (otro trabajador)
        await entrar(pg,'pepe@demo.es','pepe1234')
        await pg.click('[data-act="m-nuevo"]');await pg.wait_for_timeout(300)
        ops=await pg.locator('#mf_para option').all_inner_texts();print('Enviar a:',ops);assert ops[0].startswith('Administración') and any('Luis' in o for o in ops)
        await pg.fill('#mf_art','Goteros');await pg.fill('#mf_cant','200');await pg.select_option('#mf_para','luis@demo.es');await pg.wait_for_timeout(200)
        await pg.screenshot(path='pruebas/salida/t74-form.png',full_page=True)
        await pg.click('[data-act="m-crear"]');await pg.wait_for_timeout(1200)
        m=await pg.evaluate("Store.listCol('material',50).then(l=>l[0])");print('guardado para:',m.get('para'),m.get('paraNombre'));assert m.get('para')=='luis@demo.es'
        assert await pg.locator('#main .pill:has-text("Para Luis")').count()>0
        # Luis lo ve en «Para mí» y lo gestiona
        await entrar(pg,'luis@demo.es','luis1234')
        print('filtro inicial de Luis:',await pg.evaluate('st.mFil'));assert await pg.evaluate('st.mFil')=='ami'
        assert await pg.locator('#main .pill:has-text("Para ti")').count()>0
        print('aviso en «Tu día» / insignia:',await pg.evaluate("insignias().almacen||0"))
        await pg.screenshot(path='pruebas/salida/t74-luis.png',full_page=True)
        await pg.click('[data-act="m-edit"]');await pg.wait_for_timeout(300);await pg.fill('#mr_txt','Los traigo mañana del almacén');await pg.click('[data-act="m-est"][data-e="encargado"]');await pg.wait_for_timeout(800)
        m=await pg.evaluate("Store.listCol('material',50).then(l=>l[0])");print('estado:',m['estado'],'·',m.get('resp'));assert m['estado']=='encargado'
        assert await pg.locator('#main [data-act="m-del"]').count()==0
        print('errs',errs);await b.close();sys.exit(1 if errs else 0)
asyncio.run(main())

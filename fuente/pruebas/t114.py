"""Taller (tanda de mejoras): batería y placa solar por meses; cajón de piezas y lista de compra de varios aparatos (resta lo que tienes,
«Comprado» lo mete en el cajón y la guía dice «tienes N»); revisión del montaje con una foto (IA simulada); Instalar y probar con una
placa simulada por el cable USB: lee la autoprueba, marca lo que va bien y lo que no (con pista) y pone el número de la placa en su aparato."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
PLACA = r"""
window._escrito='';
const lineas=(t)=>new ReadableStream({start(c){const e=new TextEncoder();let i=0;const L=t.split('\n');const f=()=>{if(i<L.length){c.enqueue(e.encode(L[i++]+'\n'));setTimeout(f,40)}};setTimeout(f,100)}});
Object.defineProperty(navigator,'serial',{configurable:true,value:{requestPort:async()=>({open:async()=>{},close:async()=>{},setSignals:async()=>{},
  get readable(){return window._rs=window._rs||lineas(window._salida||'')},
  get writable(){return new WritableStream({write(ch){window._escrito+=new TextDecoder().decode(ch)}})}})}});
"""
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
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';st.tab='taller';renderAll()"); await pg.wait_for_timeout(1500)
        # --- batería y placa solar
        await pg.evaluate("TALLER.crearNodo('N4');st.tl.v='energia';renderMain()"); await pg.wait_for_timeout(300)
        t = await pg.text_content('#main'); print('batería:', t[t.upper().find('GASTA'):][:90]); assert 'AGUANTA TODO EL AÑO' in t.upper() and await pg.locator('.tl-mes > div').count() == 12
        e1 = await pg.evaluate("TALLER.energia(st.tl.d).dia"); await pg.select_option('#tle_min', '1'); await pg.wait_for_timeout(200)
        e2 = await pg.evaluate("TALLER.energia(st.tl.d).dia"); assert e2 > e1 * 5, (e1, e2)
        await pg.select_option('#tle_w', '1'); await pg.wait_for_timeout(200); await pg.screenshot(path='pruebas/salida/t114-bateria.png', full_page=True)
        await pg.evaluate("TALLER.crearNodo('N8');st.tl.v='energia';renderMain()"); await pg.wait_for_timeout(200); assert 'VA ENCHUFADO' in (await pg.text_content('#main')).upper()
        # --- revisión con foto (IA simulada)
        await pg.evaluate("""TALLER.crearNodo('N4');st.tl.v='esquema';window._pr='';window.iaFotoJson=async(pr,b)=>{window._pr=pr;return {conexiones:[{n:1,estado:'bien',nota:'rojo a Ve'},{n:3,estado:'mal',nota:'el azul va al 40, no al 41'}],otros:['La antena no se ve puesta'],resumen:'Hay un cable mal: el azul del SHT40.'}};renderMain()""")
        await pg.wait_for_timeout(300); assert 'REVISAR EL MONTAJE CON UNA FOTO' in (await pg.text_content('#main')).upper()
        await pg.set_input_files('[data-tlfoto]', files=[{'name': 'm.png', 'mimeType': 'image/png', 'buffer': bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010806000000') + b'\x00' * 20}]); await pg.wait_for_timeout(1200)
        pr = await pg.evaluate("window._pr"); assert 'SHT40 «SDA» → Heltec V3 «GPIO 41»' in pr and 'JSON' in pr
        t = await pg.text_content('.tl-rev'); print('foto:', t[:160]); assert '✗ MAL' in t.upper() and 'ANTENA' in t.upper() and '· NO SE VE' in t.upper()
        # --- instalar y probar (placa simulada)
        await pg.evaluate("Object.defineProperty(navigator,'serial',{value:null,configurable:true});st.tl.v='placa';renderMain()"); await pg.wait_for_timeout(200)
        assert 'NO PUEDE USAR EL CABLE USB' in (await pg.text_content('#main')).upper(), 'sin Web Serial avisa'
        await pg.evaluate(PLACA + "window._salida='arranque\\n#AF nodo=N4\\n#AF id=1A2B3C\\n#AF version=1\\n#AF sht40=ok\\n#AF mlx=no\\n#AF bat=3.95\\n#AF radio=ok\\nN4;id=1A2B3C;ta=24.1;hr=71;th=nan;bat=3.95\\n#AF dato=N4;id=1A2B3C;ta=24.1\\n#AF fin';renderMain()")
        await pg.wait_for_timeout(200); await pg.click('[data-tlx="comprobar"]'); await pg.wait_for_function("window.TALLER&&document.querySelector('[data-tlx=vincular]')", timeout=15000)
        t = await pg.text_content('#tl_placa'); print('comprobación:', t[:200])
        assert '✓ PLACA CON EL CÓDIGO DE N4' in t.upper() and '✗ MLX90614' in t.upper() and 'VERSIÓN DE 3,3 V' in t.upper() and '✓ RADIO' in t.upper() and '✓ DATO ENVIADO' in t.upper()
        assert '1A2B3C' in await pg.text_content('#main')
        await pg.screenshot(path='pruebas/salida/t114-comprobar.png', full_page=True)
        # vincular: no hay aparato → alta con la placa ya puesta
        await pg.click('[data-tlx="vincular"]'); await pg.wait_for_timeout(1500)
        assert await pg.evaluate("st.tab") == 'aparatos' and await pg.evaluate("st.apF&&st.apF.dev") == '1A2B3C' and await pg.locator('#ap_dev').input_value() == '1A2B3C'
        await pg.click('[data-apsave]'); await pg.wait_for_timeout(700); assert await pg.evaluate("st.ap[0].dev") == '1A2B3C'
        # pasarela: mandar la configuración por el cable
        await pg.evaluate("st.tab='taller';TALLER.crearNodo('P');st.tl.v='placa';window._rs=null;window._salida='#AF nodo=P\\n#AF id=99AA00\\n#AF wifi_cfg=ok\\n#AF wifi=ok\\n#AF url=ok\\n#AF radio=ok\\n#AF fin';st.cfg.sens={url:'https://puente.ejemplo.dev',token:'abc'};renderAll()")
        await pg.wait_for_timeout(300); assert await pg.locator('#tl_url').input_value() == 'https://puente.ejemplo.dev/p'
        await pg.fill('#tl_wifi', 'Almacen'); await pg.fill('#tl_clave', 'secreta1'); await pg.click('[data-tlx="cfg"]'); await pg.wait_for_timeout(4500)
        esc = await pg.evaluate("window._escrito"); print('mandado:', esc.strip()); assert esc.startswith('CFG wifi=Almacen|clave=secreta1|url=https://puente.ejemplo.dev/p|token=abc')
        assert '✓ CONECTADA A LA WIFI' in (await pg.text_content('#tl_placa')).upper()
        # --- cajón y compra
        await pg.evaluate("st.tab='cajon';renderAll()"); await pg.wait_for_timeout(2500)
        await pg.fill('#cj_q', 'clima y hoja'); await pg.wait_for_timeout(300)
        await pg.click('[data-cju="Nodo casero de clima y hoja"][data-d="1"]'); await pg.wait_for_timeout(200); await pg.click('[data-cju="Nodo casero de clima y hoja"][data-d="1"]'); await pg.wait_for_timeout(300)
        await pg.fill('#cj_q', 'nivel de dep'); await pg.wait_for_timeout(300); await pg.click('[data-cju="Nivel de depósitos (ultrasonidos)"][data-d="1"]'); await pg.wait_for_timeout(400)
        P = await pg.evaluate("cjPlan()"); hel = [m for m in P['mat'] if m['n'].startswith('Heltec')][0]; print('Heltec hacen falta:', hel['c'], hel['de'])
        assert hel['c'] == 3 and hel['falta'] == 3 and len(hel['de']) == 2
        await pg.click(f'[data-cjcomp="{hel["n"]}"]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate(f"cjTengo({hel['n']!r})") == 3 and len(await pg.evaluate("Store.listCol('cajon',50)")) == 1
        assert [m for m in await pg.evaluate("cjPlan().mat") if m['n'].startswith('Heltec')][0]['falta'] == 0
        await pg.evaluate("window._cp='';navigator.share=undefined;Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window._cp=t;return Promise.resolve()}},configurable:true})")
        await pg.click('[data-cjshare]'); await pg.wait_for_timeout(200); cp = await pg.evaluate("window._cp"); assert 'Tienda online' in cp and 'Heltec' not in cp.split('Herramientas:')[0] and 'SHT40' in cp
        await pg.screenshot(path='pruebas/salida/t114-cajon.png', full_page=True)
        # la guía del catálogo dice cuántas tienes
        await pg.evaluate("st.tab='catalogo';st.cat={q:'',c:null,f:''};st.cat.det=catSlug({n:'Nodo casero de clima y hoja'});renderAll()"); await pg.wait_for_timeout(1500)
        assert 'TIENES 3' in (await pg.text_content('.mj .mj-tab')).upper()
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

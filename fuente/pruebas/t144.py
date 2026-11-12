"""Gasto por día del almacén (v204): lo que ha salido cada día al llenar los bidones de una zona, este mes. Si un llenado no se
guardó se añade a mano en su día, y si la cantidad no es la buena se corrige; lo que queda en el almacén se recalcula."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
src = open('pruebas/t141.py').read(); exec(src[src.index('async def abrir'):src.index('async def main')])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg, errs, ctx = await abrir(b, 1280, 900)
        # un llenado de ayer en un bidón de Gasolinera: 40 kg de su primer abono
        B = await pg.evaluate("""(async()=>{const b=st.cfg.bidones.find(x=>x.cabezales.includes('gas')&&x.productos.some(y=>y.dosis>0)),p=b.productos.find(y=>y.dosis>0).p,
          d=n=>{const x=new Date();x.setDate(x.getDate()-n);return isoD(x)},a=almAct();let i=0;for(const m of st.alm){if(!m.id){m.id='m'+(i++);await Store.setCol('almacen',m.id,m)}}
          const m={ts:d(1)+'T08:00:00Z',fecha:d(1),tipo:'salida',alm:a,p,qty:-40,origen:b.id,llenado:'L1',por:'Juanjo',porEmail:'juanjo.serrano3@gmail.com'};const id=await Store.addCol('almacen',m);st.alm.unshift({...m,id});
          st.gdCab='gas';renderMain();return {b:b.id,nombre:b.nombre,p,id,d1:d(1),d3:d(3),s0:stockDe(p,a)}})()"""); await pg.wait_for_timeout(500); print(B)
        P, d1, d3 = B['p'], B['d1'], B['d3']
        hd = await pg.evaluate("[...document.querySelectorAll('.gdt thead th')].map(x=>x.textContent)"); print(hd)
        assert await pg.locator(f'.gdt tr[data-gd="{d1}"]').count() == 1
        f1 = await pg.text_content(f'.gdt tr[data-gd="{d1}"]'); print(f1); assert '40,0' in f1 and B['nombre'] in f1
        cols = await pg.evaluate(f"[...document.querySelectorAll('.gdt thead th')].findIndex(x=>x.textContent.startsWith(pn('{P}')))")
        # corregir: eran 45, no 40
        await pg.click(f'[data-act="gd-edit"][data-d="{d1}"]'); await pg.wait_for_timeout(200)
        assert await pg.input_value(f'tr[data-gd="{d1}"] [data-gde="{P}"]') == '40'
        await pg.fill(f'tr[data-gd="{d1}"] [data-gde="{P}"]', '45'); await pg.click(f'[data-act="gd-save"][data-d="{d1}"]'); await pg.wait_for_timeout(600)
        m = await pg.evaluate(f"st.alm.find(m=>m.id==='{B['id']}')"); assert m['qty'] == -45 and m['editado']['antes'] == -40, m
        assert abs(await pg.evaluate(f"stockDe('{P}',almAct())") - (B['s0'] - 5)) < 1e-9, 'lo que queda baja 5 más'
        assert 'corregido' in await pg.text_content(f'.gdt tr[data-gd="{d1}"]')
        # añadir el llenado que no se guardó hace 3 días: 30
        await pg.click(f'[data-act="gd-edit"][data-d="{d3}"]'); await pg.wait_for_timeout(200)
        await pg.fill(f'tr[data-gd="{d3}"] [data-gde="{P}"]', '30'); await pg.click(f'[data-act="gd-save"][data-d="{d3}"]'); await pg.wait_for_timeout(600)
        nm = await pg.evaluate(f"st.alm.filter(m=>m.manual&&m.fecha==='{d3}').map(m=>[m.p,m.qty,m.cab,m.tipo])"); assert nm == [[P, -30, 'gas', 'salida']], nm
        g = await pg.evaluate(f"Store.listCol('almacen',500).then(l=>l.filter(m=>m.manual&&m.fecha==='{d3}').length)"); assert g == 1
        tot = await pg.evaluate(f"document.querySelectorAll('.gdt tfoot td')[{cols}].textContent"); assert tot.startswith('75,0'), tot
        assert 'Llenado añadido a mano' in await pg.text_content('#main')
        # dejarlo en 0 quita el añadido a mano
        await pg.click(f'[data-act="gd-edit"][data-d="{d3}"]'); await pg.wait_for_timeout(200)
        await pg.fill(f'tr[data-gd="{d3}"] [data-gde="{P}"]', ''); await pg.click(f'[data-act="gd-save"][data-d="{d3}"]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate(f"st.alm.filter(m=>m.manual&&m.fecha==='{d3}').length") == 0
        # la fila de los abonos se queda arriba al bajar por los días
        assert await pg.evaluate("getComputedStyle(document.querySelector('.gdt thead th')).position") == 'sticky'
        y0 = await pg.evaluate("document.querySelector('.gdt thead th:nth-child(2)').getBoundingClientRect().top-document.querySelector('.gdw').getBoundingClientRect().top")
        await pg.evaluate("document.querySelector('.gdw').scrollTop=400"); await pg.wait_for_timeout(100)
        y1 = await pg.evaluate("document.querySelector('.gdt thead th:nth-child(2)').getBoundingClientRect().top-document.querySelector('.gdw').getBoundingClientRect().top")
        assert await pg.evaluate("document.querySelector('.gdw').scrollTop") > 0 and abs(y1 - y0) < 2, (y0, y1)
        # cambiar de zona
        await pg.click('[data-gdcab="pla"]'); await pg.wait_for_timeout(300)
        assert 'Planos' in await pg.text_content('.gdia .sub') and '45,0' not in await pg.text_content('.gdia tbody')
        await pg.click('[data-gdcab="gas"]'); await pg.wait_for_timeout(300)
        # imprimir: el gasto por día también sale en la hoja, sin botones
        await pg.emulate_media(media='print'); await pg.wait_for_timeout(200)
        vis = await pg.evaluate("[...document.querySelectorAll('#main section')].filter(e=>e.offsetParent!==null).map(e=>(e.querySelector('h3,h2')||{}).textContent)"); assert vis[0] == 'Stock' and len(vis) == 2, vis
        assert not await pg.is_visible('[data-act="gd-edit"]')
        # hoja 2: solo los días con gasto y debajo la suma de cada abono (gasto del cabezal)
        z = await pg.evaluate("[...document.querySelectorAll('.gdz[data-gdz=gas] tr')].map(r=>[...r.children].map(x=>x.textContent.trim()))"); print(z)
        assert len(z) == 3 and z[1][1] == '45,0' and z[2][0] == 'Gasto del cabezal' and z[2][1] == '45,0', z
        assert z[0][1].startswith(await pg.evaluate(f"pn('{P}')"))
        assert await pg.evaluate("document.querySelector('.gdp').getBoundingClientRect().top>0")
        await pg.pdf(path='pruebas/salida/t144-hoja.pdf', format='A4')
        await pg.emulate_media(media='screen')
        # trabajador: no corrige
        await pg.evaluate("NUBE.user.admin=false;NUBE.user.encargado=false;renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.locator('[data-act="gd-edit"]').count() == 0
        e1 = list(errs); await ctx.close()
        pg, errs, ctx = await abrir(b, 390, 860)
        ancho = await pg.evaluate("document.documentElement.scrollWidth"); assert ancho <= 390, ancho
        await pg.locator('.gdia').screenshot(path='pruebas/salida/t144-movil.png')
        print('errs', e1 + errs); await b.close(); sys.exit(1 if e1 or errs else 0)
asyncio.run(main())

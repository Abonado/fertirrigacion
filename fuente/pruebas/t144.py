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
        # «+ Producto»: uno nuevo que pide el técnico, líquido, y se anota en el día
        await pg.click('[data-act="gd-mas"]'); await pg.wait_for_timeout(200)
        await pg.select_option('#gd_mp', '__nuevo'); await pg.wait_for_timeout(100)
        assert await pg.is_visible('#gd_mn')
        await pg.fill('#gd_mn', 'Bioestimulante del técnico'); await pg.check('#gd_mliq'); await pg.click('[data-act="gd-mas-ok"]'); await pg.wait_for_timeout(1500)
        NP = await pg.evaluate("Object.keys(st.cfg.productos).find(k=>st.cfg.productos[k].n==='Bioestimulante del técnico')"); assert NP
        assert await pg.evaluate(f"st.cfg.productos['{NP}'].liq") is True
        assert await pg.evaluate(f"Store.getConfig().then(c=>!!c.productos['{NP}'])"), 'el producto nuevo queda guardado'
        assert 'Bioestimulante del técnico' in await pg.text_content('.gdt thead')
        await pg.click(f'[data-act="gd-edit"][data-d="{d1}"]'); await pg.wait_for_timeout(200)
        await pg.fill(f'tr[data-gd="{d1}"] [data-gde="{NP}"]', '3'); await pg.click(f'[data-act="gd-save"][data-d="{d1}"]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate(f"st.alm.filter(m=>m.p==='{NP}'&&m.manual&&m.fecha==='{d1}').map(m=>m.qty)") == [-3]
        # uno que ya existe pero no estaba en la tabla
        await pg.click('[data-act="gd-mas"]'); await pg.wait_for_timeout(200)
        opts = await pg.evaluate("[...document.querySelectorAll('#gd_mp option')].map(o=>o.value)"); assert 'kcl' in opts and NP not in opts and P not in opts
        await pg.select_option('#gd_mp', 'kcl'); await pg.click('[data-act="gd-mas-ok"]'); await pg.wait_for_timeout(300)
        assert await pg.locator(f'.gdt thead th:has-text("{await pg.evaluate("pn('kcl')")}")').count() == 1
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
        # debajo, el gasto por cabezal de las dos zonas
        gc = await pg.evaluate("[...document.querySelectorAll('.gdc tr')].map(r=>[...r.children].map(x=>x.textContent.trim()))"); print(gc)
        pnP = await pg.evaluate(f"pn('{P}')")
        assert gc[0][:4] == ['Producto', 'Gasolinera', 'Planos', 'Total'] and any(r[0].startswith(pnP) and r[1] == '45,0' for r in gc[1:]), gc
        await pg.evaluate("piePrepara()")
        await pg.pdf(path='pruebas/salida/t144-hoja.pdf', prefer_css_page_size=True)
        import subprocess, shutil
        if shutil.which('pdfinfo'):
            info = subprocess.run(['pdfinfo', '-f', '1', '-l', '3', 'pruebas/salida/t144-hoja.pdf'], capture_output=True, text=True).stdout
            tam = [l for l in info.splitlines() if 'size:' in l]; print(tam)
            w1, h1 = [float(x) for x in tam[0].split('size:')[1].split('pts')[0].split(' x ')]
            w2, h2 = [float(x) for x in tam[1].split('size:')[1].split('pts')[0].split(' x ')]
            assert w1 > h1 and w2 > h2 and len(tam) == 3, 'las dos hojas del almacén en horizontal'
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

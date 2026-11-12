"""Corregir lo gastado en el almacén (v203): «Corregir gasto» deja cambiar lo que ha gastado cada zona este mes (y lo que queda
sube o baja a la vez, con un movimiento «corrección» que se puede deshacer), y cada entrada, salida o ajuste se puede editar.
Solo encargados y administrador; un trabajador solo edita lo suyo."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
src = open('pruebas/t141.py').read(); exec(src[src.index('async def abrir'):src.index('async def main')])
def num(t): return float(t.replace('kg', '').replace('.', '').replace(',', '.').strip())
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg, errs, ctx = await abrir(b, 1280, 900)
        await pg.evaluate("(async()=>{let i=0;for(const m of st.alm){if(!m.id){m.id='m'+(i++);await Store.setCol('almacen',m.id,m)}}renderMain()})()"); await pg.wait_for_timeout(500)
        # 1) desde el stock: «Corregir» abre la corrección del gasto de este mes
        await pg.click('.stt th [data-act="gc-edit"]'); await pg.wait_for_timeout(300)
        assert await pg.locator('[data-gce]').count() > 2 and await pg.is_visible('[data-act="gc-save"]')
        assert await pg.input_value('[data-gce="gas|kno3"]') == '20' and await pg.input_value('[data-gce="pla|kno3"]') == '10'
        await pg.fill('[data-gce="gas|kno3"]', '25'); await pg.fill('[data-gce="pla|mkp"]', '2,5')
        await pg.click('[data-act="gc-save"]'); await pg.wait_for_timeout(800)
        cs = await pg.evaluate("st.alm.filter(m=>m.tipo==='correccion').map(m=>[m.cab,m.p,m.base,m.nuevo,m.qty,m.mes===hoy().slice(0,7)]).sort()"); print(cs)
        assert cs == [['gas', 'kno3', 20, 25, -5, True], ['pla', 'mkp', 0, 2.5, -2.5, True]], cs
        fk = await pg.evaluate("[...document.querySelectorAll('.gct tr[data-gp=\"kno3\"] td')].map(x=>x.textContent.trim())"); print(fk)
        assert fk[1].startswith('25,0 kg') and 'corregido' in fk[1] and fk[3].startswith('35,0 kg'), fk
        assert await pg.text_content('[data-stk="kno3"] .stq') == '407,5 kg', 'lo que queda baja a la vez'
        assert '35,0 kg' in await pg.text_content('[data-stk="kno3"] td.g')
        mv = await pg.text_content('#main'); assert 'corrección' in mv and 'de 20,0 a 25,0 kg' in mv
        # se guarda en la nube
        g = await pg.evaluate("Store.listCol('almacen',500).then(l=>l.filter(m=>m.tipo==='correccion').length)"); assert g == 2, g
        # 2) volver a dejarlo como estaba borra la corrección
        await pg.click('[data-act="gc-edit"]'); await pg.wait_for_timeout(300)
        assert await pg.input_value('[data-gce="gas|kno3"]') == '25'
        await pg.fill('[data-gce="gas|kno3"]', '20'); await pg.click('[data-act="gc-save"]'); await pg.wait_for_timeout(800)
        assert await pg.evaluate("st.alm.filter(m=>m.tipo==='correccion').length") == 1
        assert await pg.text_content('[data-stk="kno3"] .stq') == '412,5 kg'
        # 3) editar una entrada y una salida
        ent = await pg.evaluate("st.alm.find(m=>m.p==='kno3'&&m.tipo==='entrada').id")
        await pg.click(f'[data-act="mv-edit"][data-id="{ent}"]'); await pg.wait_for_timeout(200)
        assert await pg.input_value(f'#mvq_{ent}') == '712,5'
        await pg.fill(f'#mvq_{ent}', '700'); await pg.click(f'[data-act="mv-ok"][data-id="{ent}"]'); await pg.wait_for_timeout(600)
        m = await pg.evaluate(f"st.alm.find(m=>m.id==='{ent}')"); assert m['qty'] == 700 and m['editado']['antes'] == 712.5, m
        assert await pg.text_content('[data-stk="kno3"] .stq') == '400,0 kg'
        sal = await pg.evaluate("st.alm.find(m=>m.p==='mkp'&&m.tipo==='salida').id")
        await pg.click(f'[data-act="mv-edit"][data-id="{sal}"]'); await pg.wait_for_timeout(200)
        assert await pg.input_value(f'#mvq_{sal}') == '300'
        await pg.fill(f'#mvq_{sal}', '250'); await pg.click(f'[data-act="mv-ok"][data-id="{sal}"]'); await pg.wait_for_timeout(600)
        assert await pg.evaluate(f"st.alm.find(m=>m.id==='{sal}').qty") == -250
        assert 'Corregido por' in await pg.text_content('#main') and 'antes 300,0 kg' in await pg.text_content('#main')
        d = await pg.evaluate(f"Store.listCol('almacen',500).then(l=>l.find(m=>m.id==='{sal}').qty)"); assert d == -250, d
        # 4) una salida automática corregida a mano no se pisa al rehacer las cuentas
        src = await pg.evaluate("String(autoAlmacen)"); assert 'old.editado' in src and '!m.editado' in src
        # 5) un trabajador no corrige el gasto ni edita lo de otros
        await pg.evaluate("NUBE.user.admin=false;NUBE.user.encargado=false;st.gcEdit=false;renderMain()"); await pg.wait_for_timeout(300)
        assert await pg.locator('[data-act="gc-edit"]').count() == 0 and await pg.locator('[data-act="mv-edit"]').count() == 0
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

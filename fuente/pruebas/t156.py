"""v218: el stock del almacén no descuenta dos veces el mismo llenado. Con depósitos «se llena cada día», el descuento automático
(deducido de las cuentas) sobra si ese llenado ya se apuntó a mano. Antes cada móvil lo decidía con lo que tenía cargado, y si otro
acababa de apuntar el llenado se descontaba dos veces (y al rato, al volver a guardar, se quitaba: una cifra y luego otra).
Ahora se mira con los datos al día de todos los móviles, y los dobles que ya hubiera los limpia el móvil de un gestor al cargar."""
import asyncio, sys
from playwright.async_api import async_playwright
MOCK = open('mock-firebase.js').read()
PORT = sys.argv[1] if len(sys.argv) > 1 else '8776'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', viewport={'width': 400, 'height': 860}, locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto(f'http://localhost:{PORT}/'); await pg.evaluate('localStorage.clear()')
        docs = {
          'abonado_llenados/L1': {'ts': '2026-11-11T08:00:00Z', 'fecha': '2026-11-11', 'hora': '08:00', 'bidon': 'pot_gas', 'tipo': 'llenado', 'cmFinal': 10, 'cmAdd': 30, 'cantidades': {'nk': 50}},
          'abonado_almacen/s1': {'ts': '2026-11-11T08:00:00Z', 'fecha': '2026-11-11', 'tipo': 'salida', 'alm': 'pito', 'p': 'nk', 'qty': -50, 'origen': 'pot_gas', 'llenado': 'L1'},
          # el automático de las cuentas del 10 (va al 11) se creó en otro móvil sin saber del llenado del 11: doble
          'abonado_almacen/auto_pot_gas_2026-11-10_nk': {'ts': '2026-11-11T06:00:00Z', 'fecha': '2026-11-11', 'tipo': 'salida', 'alm': 'pito', 'p': 'nk', 'qty': -50, 'origen': 'pot_gas', 'auto': True, 'autoDe': '2026-11-10', 'autoCm': 30},
          'abonado_almacen/e1': {'ts': '2026-11-01T10:00:00Z', 'fecha': '2026-11-01', 'tipo': 'entrada', 'alm': 'pito', 'p': 'nk', 'qty': 500},
        }
        await pg.evaluate("d=>localStorage.setItem('mockfb',JSON.stringify({docs:d,users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))", docs)
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(5000)
        await pg.evaluate("cerrarSplash();st.finca='pinta';st.cab='gas';bid('pot_gas').modo='diario';st.tab='almacen';renderAll();loadOps();loadHist()"); await pg.wait_for_timeout(2000)
        await pg.evaluate("almAutoLimpia()"); await pg.wait_for_timeout(800)
        # 1) limpieza: queda solo el descuento del llenado apuntado
        s = await pg.evaluate("stockDe('nk','pito')"); assert abs(s - 450) < 0.01, s
        assert await pg.evaluate("JSON.parse(localStorage.getItem('mockfb')).docs['abonado_almacen/auto_pot_gas_2026-11-10_nk'].borrado") is True
        # 2) otro móvil crea un automático (va al 14) que este móvil no tiene cargado; al apuntar aquí el llenado del 14, se quita
        await pg.evaluate("Store.setCol('almacen','auto_pot_gas_2026-11-13_nk',{ts:'2026-11-14T06:00:00Z',fecha:'2026-11-14',tipo:'salida',alm:'pito',p:'nk',qty:-40,origen:'pot_gas',auto:true,autoDe:'2026-11-13',autoCm:20})")
        assert await pg.evaluate("st.alm.some(m=>m.id==='auto_pot_gas_2026-11-13_nk')") is False
        await pg.evaluate("st.tab='rellenar';renderAll()"); await pg.wait_for_timeout(300)
        await pg.evaluate("lfOpen('llenado');st.lf.bidon='pot_gas';st.lf.fecha='2026-11-14';st.lf.add=20;st.lf.final=10;st.lf.hora='09:00';st.lf.desc=true;st.lf.igual=true;st.lf.dupOk=true")
        await pg.evaluate("lfSave()"); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("JSON.parse(localStorage.getItem('mockfb')).docs['abonado_almacen/auto_pot_gas_2026-11-13_nk'].borrado") is True
        assert await pg.evaluate("st.alm.some(m=>m.id==='auto_pot_gas_2026-11-13_nk')") is False
        # 3) al guardar las cuentas del 17 en un móvil que no sabe del llenado del 18 (lo apuntó otro), no se crea el automático
        await pg.evaluate("Store.addCol('llenados',{ts:'2026-11-18T08:00:00Z',fecha:'2026-11-18',hora:'08:00',bidon:'pot_gas',tipo:'llenado',cmFinal:10,cmAdd:25,cantidades:{nk:40}})")
        await pg.evaluate("conDia('2026-11-17',{cm:{pot_gas:25},niv:{}},()=>autoAlmacen(bid('pot_gas'),'2026-11-17'))"); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("st.alm.some(m=>m.auto&&m.autoDe==='2026-11-17')") is False
        # …y si nadie lo ha apuntado, sí (cuentas del 19)
        await pg.evaluate("conDia('2026-11-19',{cm:{pot_gas:25},niv:{}},()=>autoAlmacen(bid('pot_gas'),'2026-11-19'))"); await pg.wait_for_timeout(1200)
        assert await pg.evaluate("st.alm.some(m=>m.auto&&m.autoDe==='2026-11-19')") is True
        print('errs', errs); await b.close(); sys.exit(1 if errs else 0)
asyncio.run(main())

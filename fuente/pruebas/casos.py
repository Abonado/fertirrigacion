"""Casos reales: rehace las cuentas de abono de días reales y comprueba que no cambian.

Uso (desde la carpeta fuente):
  python3 pruebas/casos.py                     → usa las copias de pruebas/casos/*.json (copias de seguridad de la app)
  python3 pruebas/casos.py copia.json          → una copia concreta
  --sin-esperado    no compara ni guarda el «esperado» (solo app contra cálculo independiente)
  --nuevo-esperado  vuelve a guardar el esperado (solo cuando un cambio de cálculo está confirmado)

Para cada día, cabezal y depósito se comprueban tres cosas:
  1. La app (las mismas funciones que pintan Cuentas, el Parte diario y los partes oficiales) y un cálculo hecho aquí
     por separado, con las fórmulas escritas otra vez, dan lo mismo: cm y litros de cada cabezal (también en depósitos
     compartidos), dosis real de cada producto, kg o L aplicados, unidades, CE de salida y % de drenaje de cada bandeja.
  2. Que nada ha cambiado respecto al «esperado» guardado (los números que se han dado por buenos), incluidas todas
     las casillas del parte grande y del pequeño.
  3. Se escribe un Excel (pruebas/casos/informe-*.xlsx) con todas las cuentas para compararlas con el Excel de la finca.
Los datos reales se quedan en pruebas/casos/, que no se sube a GitHub."""
import asyncio, sys, json, glob, os, math, threading, http.server, functools, socket
from playwright.async_api import async_playwright
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CASOS = 'pruebas/casos'
MOCK = open('mock-firebase.js').read()
args = [a for a in sys.argv[1:] if not a.startswith('--')]; SIN_ESP = '--sin-esperado' in sys.argv; NUEVO = '--nuevo-esperado' in sys.argv
copias = args or sorted(f for f in glob.glob(CASOS + '/*.json') if not os.path.basename(f).startswith('esperado-'))
if not copias: print('Sin copias de casos reales en', CASOS, '(nada que comprobar)'); print('errs []'); sys.exit(0)

REPITE = r"""(copia)=>{const cfg0=clone(copia.config),out=[],U={};for(const k in PRODUCTOS)U[k]=PRODUCTOS[k].un||0;st.llen=copia.llenados||[];
  const regs=copia.registros.slice().sort((a,b)=>a.fecha<b.fecha?-1:1);
  for(const r of regs){st.cfg=clone(cfg0);st.savedCfg=clone(cfg0);st.fecha=r.fecha;st.reg=normReg(r,r.fecha);if(r.receta)st.reg.receta=r.receta;st.reg.guardado=r.guardado||null;st.dirtyReg=false;
    for(const c of cfg0.cabezales){if(!r.m3||r.m3[c.id]==null)continue;const d=parteData(c.id);
      out.push({fecha:r.fecha,parte:diaRiego(r.fecha),cab:c.id,cabN:c.nombre,m3:d.m3,
        deps:d.deps.map(x=>({nombre:x.nombre,cmTotal:x.cmTotal??null,cm:x.cm??null,L:x.L??null,filas:x.filas.map(f=>({n:f.n,des:f.des,real:f.real??null,cant:f.cant??null}))})),
        u:{real:d.u.real??null,des:d.u.des??null},salida:{ent:d.salida.ent??null,tot:d.salida.tot??null},
        band:d.sect.flatMap(s=>s.band.map(b=>({s:s.nombre,b:b.nombre,pct:b.pct??null,vol:b.vol??null}))),
        hoja:Object.fromEntries(Object.entries(d.hoja||{}).filter(([k])=>k!=='_cover').map(([k,v])=>[k,v&&v.v!==undefined?v.v:v])),
        hojaP:Object.fromEntries(Object.entries(d.hojaP||{}).filter(([k])=>k!=='_cover').map(([k,v])=>[k,v&&v.v!==undefined?v.v:v]))})}}
  return{out,U,nombres:Object.fromEntries(Object.entries(PRODUCTOS).map(([k,v])=>[k,v.n]))}}"""

# ---------- cálculo independiente (las fórmulas escritas otra vez, sin usar el código de la app) ----------
def con_receta(cfg, r):
    rc = r.get('receta') or {}; bs = []
    for b in cfg['bidones']:
        x = rc.get(b['id'])
        if x: b = {**b, 'kgPrincipal': x.get('kg'), 'capacidad': x.get('cap') or b.get('capacidad'), 'lpcm': x.get('lpcm') or b.get('lpcm'), 'productos': x.get('prods') or b['productos']}
        bs.append(b)
    return bs
def principal(b): return next((x for x in b['productos'] if x['p'] == b['principal']), None)
def factor(b):
    pp = principal(b); return b['kgPrincipal'] / pp['dosis'] if pp and (pp.get('dosis') or 0) > 0 and b.get('kgPrincipal') else 0
def conc(b, x): return (x.get('dosis') or 0) * factor(b)
def cm_cab(b, cab, r):
    cm = (r.get('cm') or {}).get(b['id'])
    if cm is None: return None
    if len(b['cabezales']) < 2: return cm
    pp = principal(b)
    if not pp or not pp.get('dosis') or not b.get('kgPrincipal') or not b.get('lpcm'): return None
    m3 = r.get('m3') or {}
    if any(m3.get(c) is None for c in b['cabezales']): return None
    esp = lambda c: pp['dosis'] * (1000 / b['kgPrincipal']) * m3[c] / 100 / b['lpcm']
    return esp(cab) + (cm - sum(esp(c) for c in b['cabezales'])) / len(b['cabezales'])
def calcular(copia, U):
    cfg = copia['config']; out = {}
    for r in copia['registros']:
        bs = con_receta(cfg, r)
        for c in cfg['cabezales']:
            m = (r.get('m3') or {}).get(c['id'])
            if m is None: continue
            deps = []; ureal = 0; udes = 0; uok = True; uany = False
            for b in [b for b in bs if c['id'] in b['cabezales']]:
                cm = cm_cab(b, c['id'], r); L = cm * b['lpcm'] if cm is not None else None; filas = []
                for x in b['productos']:
                    if not x.get('dosis'): continue
                    real = L * conc(b, x) / 10 / m if L is not None and m else None
                    filas.append({'des': x['dosis'], 'real': real, 'cant': L * conc(b, x) / 1000 if L is not None else None})
                    un = U.get(x['p'], 0)
                    if un:
                        uany = True; udes += x['dosis'] * un
                        if real is None: uok = False
                        else: ureal += real * un
                deps.append({'cmTotal': (r.get('cm') or {}).get(b['id']), 'cm': cm, 'L': L, 'filas': filas})
            g = lambda k: (r.get(k) or {}).get(c['id'])
            ceB, inc = g('ceB'), g('inc')
            band = []
            for s in c['sectores']:
                mn = (r.get('min') or {}).get(s['id'])
                for bj in s['bandejas']:
                    ml = (r.get('dren') or {}).get(bj['id'])
                    band.append({'pct': ml * 100 / (mn * bj['caudal']) if mn and ml is not None and bj.get('caudal') else None,
                                 'vol': mn * bj['caudal'] / 1000 if mn is not None and bj.get('caudal') else None})
            out[(r['fecha'], c['id'])] = {'deps': deps, 'u': {'real': ureal if uok and uany else None, 'des': udes if uany else None},
                                         'salida': {'ent': ceB, 'tot': round(ceB + inc, 3) if ceB is not None and inc is not None else None}, 'band': band}
    return out

def igual(a, b):
    if a is None or b is None: return a is None and b is None
    if isinstance(a, (int, float)) and isinstance(b, (int, float)): return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9)
    return a == b
def redondea(o):
    if isinstance(o, float): return float(f'{o:.10g}')
    if isinstance(o, dict): return {k: redondea(v) for k, v in o.items()}
    if isinstance(o, list): return [redondea(v) for v in o]
    return o

def servidor():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory='netlify/abonado'))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv, port

async def repetir(copia, port):
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(service_workers='block', locale='es-ES', timezone_id='Europe/Madrid')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await ctx.route('https://www.gstatic.com/**', lambda r: r.fulfill(content_type='application/javascript', body=MOCK if 'app-compat' in r.request.url else ''))
        await ctx.route('https://api.open-meteo.com/**', lambda r: r.abort()); await ctx.route('https://archive-api.open-meteo.com/**', lambda r: r.abort())
        await pg.goto(f'http://127.0.0.1:{port}/'); await pg.evaluate('localStorage.clear()')
        await pg.evaluate("localStorage.setItem('mockfb',JSON.stringify({docs:{},users:{'juanjo.serrano3@gmail.com':'admin123'},cur:null}))")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.fill('#nb_em', 'juanjo.serrano3@gmail.com'); await pg.fill('#nb_pw', 'admin123'); await pg.click('#nb_go'); await pg.wait_for_timeout(3000)
        await pg.evaluate('cerrarSplash()')
        r = await pg.evaluate(REPITE, copia); await b.close(); return r, errs

def informe(nombre, res, nombres):
    try: from openpyxl import Workbook; from openpyxl.styles import Font, PatternFill
    except ImportError: return None
    wb = Workbook(); ws = wb.active; ws.title = 'Cuentas'
    ws.append(['Día del riego', 'Apuntado el', 'Cabezal', 'm³', 'Depósito', 'cm del depósito', 'cm de este cabezal', 'Litros de este cabezal', 'Producto', 'Deseada', 'Real', 'Desviación %', 'Aplicado (kg o L)'])
    for c in ws[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='1B2F4A')
    for o in res:
        for d in o['deps']:
            for f in d['filas']:
                dev = (f['real'] - f['des']) / f['des'] * 100 if f['real'] is not None and f['des'] else None
                ws.append([o['parte'], o['fecha'], o['cabN'], o['m3'], d['nombre'], d['cmTotal'], d['cm'], d['L'], f['n'], f['des'], f['real'], dev, f['cant']])
    for col, w in zip('ABCDEFGHIJKLM', (13, 12, 14, 8, 26, 12, 14, 14, 26, 9, 10, 12, 14)): ws.column_dimensions[col].width = w
    for row in ws.iter_rows(min_row=2):
        for c in row[5:8] + row[10:13]:
            if isinstance(c.value, float): c.number_format = '0.000'
    ws.freeze_panes = 'A2'; ws.auto_filter.ref = ws.dimensions
    sal = os.path.join(CASOS if os.path.dirname(nombre) == CASOS else 'pruebas/salida', 'informe-' + os.path.splitext(os.path.basename(nombre))[0] + '.xlsx')
    os.makedirs(os.path.dirname(sal), exist_ok=True); wb.save(sal); return sal

srv, port = servidor(); mal = []; total = 0
for ruta in copias:
    copia = json.load(open(ruta)); app, errs = asyncio.run(repetir(copia, port)); res = app['out']
    if errs: mal.append(f'{ruta}: errores en la app: {errs[:3]}')
    ind = calcular(copia, app['U']); n = 0
    def fallo(o, que, a, b): mal.append(f"{o['parte']} (apuntado {o['fecha']}) · {o['cabN']} · {que}: la app da {a} y el cálculo independiente {b}")
    for o in res:
        x = ind.get((o['fecha'], o['cab']))
        if not x: mal.append(f"{o['fecha']} · {o['cabN']}: falta en el cálculo independiente"); continue
        for d, e in zip(o['deps'], x['deps']):
            for k in ('cmTotal', 'cm', 'L'):
                n += 1
                if not igual(d[k], e[k]): fallo(o, f"{d['nombre']} · {k}", d[k], e[k])
            for f, g in zip(d['filas'], e['filas']):
                for k in ('des', 'real', 'cant'):
                    n += 1
                    if not igual(f[k], g[k]): fallo(o, f"{d['nombre']} · {f['n']} · {k}", f[k], g[k])
        if len(o['deps']) != len(x['deps']): fallo(o, 'número de depósitos', len(o['deps']), len(x['deps']))
        for k in ('real', 'des'):
            n += 1
            if not igual(o['u'][k], x['u'][k]): fallo(o, f'unidades {k}', o['u'][k], x['u'][k])
        for k in ('ent', 'tot'):
            n += 1
            if not igual(o['salida'][k], x['salida'][k]): fallo(o, f'CE salida {k}', o['salida'][k], x['salida'][k])
        for b1, b2 in zip(o['band'], x['band']):
            for k in ('pct', 'vol'):
                n += 1
                if not igual(b1[k], b2[k]): fallo(o, f"{b1['s']} · {b1['b']} · {k}", b1[k], b2[k])
    total += n
    print(f'{ruta}: {len(copia["registros"])} días · {len(res)} cuentas de cabezal · {n} números comprobados contra el cálculo independiente')
    if not SIN_ESP:
        esp = os.path.join(os.path.dirname(ruta), 'esperado-' + os.path.basename(ruta)); actual = redondea(res)
        if NUEVO or not os.path.exists(esp):
            json.dump(actual, open(esp, 'w'), ensure_ascii=False, indent=0); print('  esperado guardado en', esp)
        else:
            viejo = json.load(open(esp)); ant = {(o['fecha'], o['cab']): o for o in viejo}
            for o in actual:
                v = ant.get((o['fecha'], o['cab']))
                if v is None: continue
                for parte in ('hoja', 'hojaP'):
                    for k in sorted(set(v[parte]) | set(o[parte])):
                        if v[parte].get(k) != o[parte].get(k): mal.append(f"{o['parte']} · {o['cabN']} · parte {'grande' if parte == 'hoja' else 'pequeño'} casilla {k}: antes «{v[parte].get(k)}», ahora «{o[parte].get(k)}»")
                o2 = {k: o[k] for k in o if k not in ('hoja', 'hojaP')}; v2 = {k: v[k] for k in v if k not in ('hoja', 'hojaP')}
                if o2 != v2: mal.append(f"{o['parte']} · {o['cabN']}: las cuentas han cambiado respecto a lo dado por bueno")
            print(f'  comparado con {esp}')
    inf = informe(ruta, res, app['nombres'])
    if inf: print('  informe:', inf)
srv.shutdown()
if mal:
    print(f'✗ {len(mal)} diferencias:'); [print('  -', m) for m in mal[:60]]; sys.exit(1)
print(f'✓ Cuentas correctas: {total} números comprobados'); print('errs []')

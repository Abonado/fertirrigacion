"""Prepara la plantilla del parte pequeño («Control de aportes», Anexo XI) para la app.
La hoja original no cabe en un A4 vertical: se deja en una página A4 apaisada (ajustar a 1 página),
tanto en el PDF de fondo como en el Excel que se rellena. Salida: parte-tpl-p.js"""
import subprocess, base64, json, zipfile, os, pdfplumber
os.chdir(os.path.dirname(os.path.abspath(__file__)))
z = zipfile.ZipFile('parte.xlsx'); out = zipfile.ZipFile('fit.xlsx', 'w', zipfile.ZIP_DEFLATED)
for n in z.namelist():
    d = z.read(n)
    if n == 'xl/worksheets/sheet1.xml':
        s = d.decode()
        s = s.replace('<dimension ', '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ', 1)
        a = '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
        assert a in s
        s = s.replace(a, '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/>')
        d = s.encode()
    out.writestr(z.getinfo(n), d)
out.close()
if os.path.exists('fit.pdf'): os.remove('fit.pdf')
subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', 'fit.xlsx'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
pdf = pdfplumber.open('fit.pdf'); assert len(pdf.pages) == 1, 'la plantilla debe caber en una página'
p = pdf.pages[0]; W, H = p.width, p.height
def grupos(vals, tol=0.6):
    vals = sorted(vals); o = []
    for v in vals:
        if o and v - o[-1][-1] <= tol: o[-1].append(v)
        else: o.append([v])
    return [round(sum(g) / len(g), 2) for g in o]
vx = grupos([e['x0'] for e in p.edges if e['orientation'] == 'v'])
hy = grupos([e['top'] for e in p.edges if e['orientation'] == 'h'])
# Columnas A..U: todas del mismo ancho; se miden el borde izquierdo y el derecho
x0, x1 = vx[0], vx[-1]; cw = (x1 - x0) / 21
cx = [round(x0 + i * cw, 2) for i in range(22)]
for v in vx: assert min(abs(v - c) for c in cx) < 0.8, v
# Filas: 2, 4, 6 y luego una línea por fila de la 7 a la 39, y el pie
assert len(hy) == 37, len(hy)
ry = {2: hy[0], 4: hy[1], 6: hy[2]}
for k, r in enumerate(range(7, 40)): ry[r] = hy[3 + k]
ry[41] = hy[36]; ry[40] = round((ry[39] + ry[41]) / 2, 2); ry[1] = round(ry[2] - (ry[4] - ry[2]) / 2, 2); ry[3] = round((ry[2] + ry[4]) / 2, 2); ry[5] = round((ry[4] + ry[6]) / 2, 2)
w = {}
for x in p.extract_words(): w.setdefault(x['text'], []).append(x)
def bb(t, i=0):
    x = w[t][i]; return [round(x['x0'], 2), round(x['top'], 2), round(x['x1'], 2), round(x['bottom'], 2)]
hdr = {'cab': bb('PLANOS', 0), 'prod': bb('PRODUCTOR:'), 'fecha': bb('FECHA:')}
assert hdr['cab'][1] < 70
z = zipfile.ZipFile('fit.xlsx'); files = []; sheet = None
for n in z.namelist():
    d = z.read(n)
    if n == 'xl/worksheets/sheet1.xml': sheet = d.decode('utf-8'); continue
    files.append([n, base64.b64encode(d).decode()])
tpl = {'W': W, 'H': H, 'cx': cx, 'ry': {str(k): v for k, v in sorted(ry.items())}, 'hdr': hdr,
       'pdf': base64.b64encode(open('fit.pdf', 'rb').read()).decode(), 'xlsx': {'files': files, 'sheet': sheet}}
open('parte-tpl-p.js', 'w').write('window.PARTE_TPL_P=' + json.dumps(tpl, separators=(',', ':')) + ';\n')
print('cx', cx); print('ry', tpl['ry']); print('hdr', hdr); print('tamaño', os.path.getsize('parte-tpl-p.js'))

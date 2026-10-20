"""Prepara la plantilla del parte diario (control de riegos) para la app.
- pdf: la hoja original convertida a PDF (vectorial, igual que impresa)
- rejilla de columnas y filas en puntos, medida sobre las líneas del propio PDF
- piezas del .xlsx original, para rellenarlo tal cual
Salida: parte-tpl.js"""
import subprocess, base64, json, zipfile, os, pdfplumber
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SRC = 'parte.xlsx'
subprocess.run(['soffice','--headless','--convert-to','pdf',SRC],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=180)
pdf = pdfplumber.open('parte.pdf'); assert len(pdf.pages) == 1, 'la plantilla debe caber en una página'
p = pdf.pages[0]; W, H = p.width, p.height
def grupos(vals, tol=0.6):
    vals = sorted(vals); out = []
    for v in vals:
        if out and v - out[-1][-1] <= tol: out[-1].append(v)
        else: out.append([v])
    return [round(sum(g)/len(g), 2) for g in out]
vx = grupos([e['x0'] for e in p.edges if e['orientation']=='v'])
hy = grupos([e['top'] for e in p.edges if e['orientation']=='h'])
print('verticales', vx); print('horizontales', hy)
# Columnas A..P y borde derecho: 17 líneas (todas las columnas tienen alguna raya)
assert len(vx) == 17, len(vx)
cx = vx
# Filas: la fila 10 empieza donde está «1-1»; de la 10 a la 43 hay una línea por fila
w = {x['text']: x for x in p.extract_words()}
t10 = [y for y in hy if abs(y - (w['1-1']['top'] - 3.3)) < 3][0]
i10 = hy.index(t10)
ry = {}
for k, r in enumerate(range(10, 45)): ry[r] = hy[i10 + k]
# filas de arriba, por las líneas que hay
ry[1] = hy[0]; ry[3] = hy[1]; ry[5] = hy[2]; ry[6] = hy[3]; ry[7] = hy[4]; ry[8] = hy[5]; ry[9] = hy[6]
assert abs(ry[9] - (w['Muestra']['top'] + 3)) < 6
def bb(t):
    x = w[t]; return [round(x['x0'],2), round(x['top'],2), round(x['x1'],2), round(x['bottom'],2)]
hdr = {'cab': bb('PLANOS'), 'proc': bb('PROCEDIMIENTO'), 'prod': bb('PRODUCTOR:'), 'fecha': bb('FECHA:')}
z = zipfile.ZipFile(SRC); files = []; sheet = None
for n in z.namelist():
    d = z.read(n)
    if n == 'xl/worksheets/sheet1.xml': sheet = d.decode('utf-8'); continue
    files.append([n, base64.b64encode(d).decode()])
tpl = {'W': W, 'H': H, 'cx': cx, 'ry': {str(k): v for k, v in sorted(ry.items())}, 'hdr': hdr,
       'pdf': base64.b64encode(open('parte.pdf','rb').read()).decode(), 'xlsx': {'files': files, 'sheet': sheet}}
open('parte-tpl.js','w').write('window.PARTE_TPL='+json.dumps(tpl, separators=(',',':'))+';\n')
print('ry', tpl['ry']); print('hdr', hdr); print('tamaño', os.path.getsize('parte-tpl.js'))

"""Quita las columnas N y O de la hoja «Control de aportes» y ensancha la nueva N (trazabilidad),
como la hoja que usa la empresa desde octubre de 2026. Lee parte-orig.xlsx y escribe parte.xlsx."""
import re, zipfile, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
FUERA = (14, 15)          # N y O
ANCHO_N = 19              # la nueva N (antes P), para que se lea «TRAZBILIDAD» entera
def num(c):
    n = 0
    for ch in c: n = n * 26 + ord(ch) - 64
    return n
def let(n):
    s = ''
    while n: n, r = divmod(n - 1, 26); s = chr(65 + r) + s
    return s
def nueva(n): return n - 2 if n > 15 else n
def celda(m):
    c, r = m.group(1), m.group(2); n = num(c)
    if n in FUERA: return ''
    return m.group(0).replace(f'r="{c}{r}"', f'r="{let(nueva(n))}{r}"', 1)
def rango(a):
    ca, ra, cb, rb = re.match(r'([A-Z]+)(\d+):([A-Z]+)(\d+)', a).groups()
    c1, c2 = num(ca), num(cb)
    n1 = 14 if c1 in FUERA else nueva(c1); n2 = 13 if c2 in FUERA else nueva(c2)
    if n2 < n1 or (n1 == n2 and ra == rb): return None
    return f'{let(n1)}{ra}:{let(n2)}{rb}'
z = zipfile.ZipFile('parte-orig.xlsx'); out = zipfile.ZipFile('parte.xlsx', 'w', zipfile.ZIP_DEFLATED)
for n in z.namelist():
    d = z.read(n)
    if n == 'xl/worksheets/sheet1.xml':
        s = d.decode()
        s = re.sub(r'<c r="([A-Z]+)(\d+)"[^>]*?(?:/>|>.*?</c>)', celda, s)
        s = s.replace('spans="1:21"', 'spans="1:19"').replace('A1:U40', 'A1:S40')
        refs = re.findall(r'<mergeCell ref="([^"]+)"/>', s); nuevos = [x for x in (rango(r) for r in refs) if x]
        s = re.sub(r'<mergeCells count="\d+">.*?</mergeCells>', f'<mergeCells count="{len(nuevos)}">' + ''.join(f'<mergeCell ref="{x}"/>' for x in nuevos) + '</mergeCells>', s)
        s = s.replace('<sheetFormatPr baseColWidth="10" defaultRowHeight="15"/>', f'<sheetFormatPr baseColWidth="10" defaultRowHeight="15"/><cols><col min="14" max="14" width="{ANCHO_N}" customWidth="1"/></cols>', 1)
        assert '<cols>' in s
        d = s.encode()
    out.writestr(z.getinfo(n), d)
out.close(); print('parte.xlsx: columnas N y O fuera')

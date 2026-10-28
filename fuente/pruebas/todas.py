"""Construye la app y pasa todas las pruebas. Uso (desde la carpeta fuente):  python3 pruebas/todas.py
Devuelve código 0 solo si todo va bien; publicar.sh no sube nada si falla."""
import subprocess, sys, os, threading, http.server, functools, time, pathlib
os.chdir(pathlib.Path(__file__).resolve().parent.parent)
os.makedirs('pruebas/salida', exist_ok=True)
r = subprocess.run([sys.executable, 'build.py'], capture_output=True, text=True)
if r.returncode: print(r.stdout, r.stderr); print('FALLO al construir'); sys.exit(1)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8776), functools.partial(Q, directory='netlify/abonado'))
threading.Thread(target=srv.serve_forever, daemon=True).start(); time.sleep(0.5)
PRUEBAS = ['humo', 't61', 't66', 't68', 't69', 't70', 't71', 't73', 't74', 't75', 't76', 't77', 't78', 't79', 't80', 't81', 't82', 't83', 't84', 't85', 't86', 't87', 't88', 't91', 't92', 't93', 't94', 't95', 't96', 't97', 't98', 't99', 't100', 't101', 'casos']
mal = []
for t in PRUEBAS:
    t0 = time.time()
    try: r = subprocess.run([sys.executable, f'pruebas/{t}.py'], capture_output=True, text=True, timeout=300)
    except subprocess.TimeoutExpired: mal.append(t); print(f'✗ {t}: tardó demasiado'); continue
    ult = (r.stdout.strip().splitlines() or [''])[-1]
    ok = r.returncode == 0 and ult.startswith('errs []')
    print(f"{'✓' if ok else '✗'} {t} ({time.time()-t0:.0f} s)")
    if not ok: mal.append(t); print(r.stdout[-1500:], r.stderr[-1500:])
srv.shutdown()
print('TODO BIEN' if not mal else 'FALLAN: ' + ', '.join(mal))
sys.exit(1 if mal else 0)

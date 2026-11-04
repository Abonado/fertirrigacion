"""Lector del clima y del riego: con un navegador de mentira lee dos páginas a la vez (el clima de la Gasolinera y el riego del uCrop de
Franco), cada una a su ruta del puente con su cabezal; la configuración de la versión 1.0 (una sola página) se pasa sola; si no toca, no lee;
si se cierra una pestaña la vuelve a abrir fijada."""
import subprocess, sys
r = subprocess.run(['node', 'pruebas/datos/prueba-lector.mjs', 'lector-clima'], capture_output=True, text=True, timeout=60)
print(r.stdout.strip(), r.stderr.strip()[-800:])
errs = [] if r.returncode == 0 and 'LECTOR OK' in r.stdout else [r.stdout.strip() or r.stderr.strip()[-300:]]
print('errs', errs); sys.exit(1 if errs else 0)

"""La respuesta de la IA se lee aunque venga envuelta en ```json, con saltos de línea dentro de los textos o cortada por larga
(el diagnóstico con 3 fotos llegaba al tope y salía «La respuesta no salió bien»)."""
import subprocess, sys
r = subprocess.run(['node', 'pruebas/datos/prueba-json.mjs', 'abonado-pinta-santos.html'], capture_output=True, text=True, timeout=60)
print(r.stdout.strip(), r.stderr.strip()[-800:])
errs = [] if r.returncode == 0 and 'JSON OK' in r.stdout else [r.stdout.strip() or r.stderr.strip()[-300:]]
print('errs', errs); sys.exit(1 if errs else 0)

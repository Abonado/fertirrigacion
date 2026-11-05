"""Puente /riego: guarda qué programa está regando y, cuando el lector ve empezar un riego, avisa al móvil (servidor de avisos,
ruta interno) a quien diga la app en Ajuste del riego; si no hay nada puesto, al administrador; apagado no avisa. «SE04ENCAÑE» → «Sector 4 · ENCAÑE»."""
import subprocess, sys
r = subprocess.run(['node', 'pruebas/datos/prueba-puente-riego.mjs', '../servidor/puente-worker.js'], capture_output=True, text=True, timeout=60)
print(r.stdout.strip(), r.stderr.strip()[-800:])
errs = [] if r.returncode == 0 and 'PUENTE OK' in r.stdout else [r.stdout.strip() or r.stderr.strip()[-300:]]
print('errs', errs); sys.exit(1 if errs else 0)

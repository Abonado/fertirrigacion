#!/usr/bin/env bash
# Construye la app, pasa TODAS las pruebas y, solo si van bien, la publica (GitHub Pages).
# Uso, desde esta carpeta:   ./publicar.sh "Qué ha cambiado"
set -euo pipefail
cd "$(dirname "$0")"
[ -n "${1:-}" ] || { echo 'Falta el mensaje: ./publicar.sh "Qué ha cambiado"'; exit 1; }
python3 pruebas/todas.py || { echo '✗ Las pruebas fallan: NO se publica nada.'; exit 1; }
REPO="$(cd .. && pwd)"
cp -r netlify/abonado/. "$REPO"/
cd "$REPO"
git add -A
git commit -q -m "$1"
git push -q origin HEAD
echo "✓ Publicado: $(git log --oneline -1)"

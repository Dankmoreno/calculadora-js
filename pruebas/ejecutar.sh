#!/usr/bin/env bash
# Ejecuta las dos suites en Chrome headless y devuelve un código de salida
# distinto de cero si algún caso falla. Se usa en la CI y sirve en local.
#
#   bash pruebas/ejecutar.sh
#
# Necesita Chrome (o Chromium) y python3 para servir los archivos: el navegador
# bloquea el acceso entre archivos file://, que las pruebas de interfaz usan.

set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
PUERTO="${PUERTO:-8123}"

CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  for candidato in google-chrome google-chrome-stable chromium chromium-browser; do
    if command -v "$candidato" >/dev/null 2>&1; then
      CHROME="$candidato"
      break
    fi
  done
fi

if [ -z "$CHROME" ]; then
  echo "No se encontró Chrome ni Chromium. Define CHROME=/ruta/al/navegador." >&2
  exit 1
fi

python3 -m http.server "$PUERTO" --directory "$RAIZ" >/dev/null 2>&1 &
SERVIDOR=$!
trap 'kill "$SERVIDOR" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  if curl -sf "http://127.0.0.1:$PUERTO/index.html" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

FALLOS_TOTALES=0

for pagina in expresion nucleo interfaz; do
  echo ""
  echo "──────── $pagina ────────"

  SALIDA="$("$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --virtual-time-budget=20000 \
    --dump-dom "http://127.0.0.1:$PUERTO/pruebas/$pagina.html" 2>/dev/null)"

  echo "$SALIDA" | sed 's/<[^>]*>//g' | grep -E '^(PASA|FALLA|===)' || true

  MARCA="$(echo "$SALIDA" | grep -o '@@RESULTADO@@ fallos=[0-9]* total=[0-9]*' | head -1 || true)"
  if [ -z "$MARCA" ]; then
    echo "ERROR: $pagina no publicó resultados (¿excepción de JavaScript?)"
    FALLOS_TOTALES=$((FALLOS_TOTALES + 1))
    continue
  fi

  FALLOS="$(echo "$MARCA" | sed 's/.*fallos=\([0-9]*\).*/\1/')"
  FALLOS_TOTALES=$((FALLOS_TOTALES + FALLOS))
done

echo ""
if [ "$FALLOS_TOTALES" -ne 0 ]; then
  echo "✗ Fallaron $FALLOS_TOTALES casos."
  exit 1
fi

echo "✓ Todas las pruebas pasan."

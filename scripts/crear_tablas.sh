#!/usr/bin/env bash
# =========================================================
#  Ejecuta todos los archivos de database/schema en orden.
#  Uso: bash scripts/crear_tablas.sh
# =========================================================
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"

for archivo in "$DIR"/database/schema/*.sql; do
    echo ">> Ejecutando $(basename "$archivo")"
    psql -h localhost -U tazmania -d tazmania_db -v ON_ERROR_STOP=1 -f "$archivo"
done

psql -h localhost -U tazmania -d tazmania_db -c '\dt'

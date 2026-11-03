#!/usr/bin/env bash
# =========================================================
#  Copia de seguridad de la base de datos.
#  Uso: sudo bash scripts/backup.sh
#  Restaurar: sudo -u postgres psql tazmania_db < archivo.sql
# =========================================================
set -euo pipefail
DESTINO=/root/backups
mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/tazmania_db_$(date +%F_%H%M).sql"
sudo -u postgres pg_dump tazmania_db > "$ARCHIVO"
echo ">> Backup guardado en $ARCHIVO"

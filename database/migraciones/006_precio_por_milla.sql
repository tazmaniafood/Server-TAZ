-- =========================================================
--  MIGRACIÓN 006: el delivery pasa de tramos a precio por milla
--  Solo si ya se había corrido la 004 con la tabla tarifas_delivery.
--  Uso:
--    psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/006_precio_por_milla.sql
--  Después: cargar database/datos/delivery_config.sql y volver a
--  ejecutar database/roles/usuario_app.sql (permisos).
-- =========================================================
BEGIN;
DROP TABLE IF EXISTS tarifas_delivery;
\ir ../schema/04_delivery_config.sql
COMMIT;

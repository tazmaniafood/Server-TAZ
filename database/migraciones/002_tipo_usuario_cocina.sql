-- =========================================================
--  MIGRACIÓN 002: agrega el tipo de usuario 'cocina'
--  Uso:
--    psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/002_tipo_usuario_cocina.sql
-- =========================================================
BEGIN;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_tipo_usuario_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_tipo_usuario_check
    CHECK (tipo_usuario IN ('admin', 'cocina', 'repartidor', 'cliente'));

COMMIT;

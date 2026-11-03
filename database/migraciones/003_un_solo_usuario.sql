-- =========================================================
--  MIGRACIÓN 003: se unifica a un solo usuario (admin)
--  Borra los usuarios cocina y repartidor si existen.
--  Uso:
--    psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/003_un_solo_usuario.sql
-- =========================================================
DELETE FROM usuarios WHERE usuario IN ('cocina', 'repartidor');

-- =========================================================
--  MIGRACIÓN 001: numero_pedido pasa de aleatorio a secuencial
--  Solo para bases que ya tenían la tabla pedidos creada con
--  la versión anterior (número aleatorio).
--  Uso:
--    psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/001_pedidos_numero_secuencial.sql
-- =========================================================
BEGIN;

ALTER TABLE pedidos ALTER COLUMN numero_pedido DROP DEFAULT;
ALTER TABLE pedidos ALTER COLUMN numero_pedido ADD GENERATED ALWAYS AS IDENTITY;

-- Si ya había pedidos, continúa después del número más alto; si no, empieza en 1
SELECT setval(
    pg_get_serial_sequence('pedidos', 'numero_pedido'),
    COALESCE((SELECT MAX(numero_pedido) FROM pedidos), 0) + 1,
    false
);

COMMIT;

-- =========================================================
--  TRAMOS DE DELIVERY (EJEMPLO: cambiar por los precios reales)
--  Borra los tramos actuales y carga estos.
--  Uso:
--    psql -h localhost -U tazmania -d tazmania_db -f database/datos/tarifas_delivery.sql
-- =========================================================
BEGIN;

DELETE FROM tarifas_delivery;

INSERT INTO tarifas_delivery (millas_desde, millas_hasta, costo) VALUES
    (0, 2, 3.00),   -- 0 a 2 millas  -> $3
    (2, 5, 5.00),   -- 2 a 5 millas  -> $5
    (5, 8, 8.00);   -- 5 a 8 millas  -> $8
                    -- más de 8      -> fuera de zona

COMMIT;

SELECT millas_desde, millas_hasta, costo FROM tarifas_delivery ORDER BY millas_desde;

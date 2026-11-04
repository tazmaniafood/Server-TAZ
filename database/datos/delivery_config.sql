-- =========================================================
--  PRECIO DEL DELIVERY (EJEMPLO: cambiar por los valores reales)
--    costo = millas x precio_por_milla
--    más de millas_maximas -> fuera de alcance
--  Uso (volver a ejecutarlo para cambiar los valores):
--    psql -h localhost -U tazmania -d tazmania_db -f database/datos/delivery_config.sql
-- =========================================================
INSERT INTO delivery_config (id, precio_por_milla, millas_maximas)
VALUES (true, 1.50, 8)            -- $1.50 por milla, hasta 8 millas
ON CONFLICT (id) DO UPDATE
    SET precio_por_milla = EXCLUDED.precio_por_milla,
        millas_maximas   = EXCLUDED.millas_maximas,
        actualizado_en   = now();

SELECT precio_por_milla, millas_maximas FROM delivery_config;

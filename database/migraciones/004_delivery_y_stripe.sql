-- =========================================================
--  MIGRACIÓN 004: delivery (Google Maps) y pagos con Stripe
--  - pedidos: direccion, lat, lng, distancia_millas, subtotal,
--    costo_delivery, stripe_payment_intent_id
--  - tabla nueva tarifas_delivery
--  Los pedidos que ya existían quedan con delivery 0 y sin dirección.
--  Uso:
--    psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/004_delivery_y_stripe.sql
--  Después volver a ejecutar database/roles/usuario_app.sql (permisos).
-- =========================================================
BEGIN;

ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS direccion                TEXT,
    ADD COLUMN IF NOT EXISTS lat                      NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS lng                      NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS distancia_millas         NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS subtotal                 NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS costo_delivery           NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255) UNIQUE;

-- Pedidos viejos: todo el monto era comida, sin delivery
UPDATE pedidos SET
    direccion        = COALESCE(direccion, ''),
    lat              = COALESCE(lat, 0),
    lng              = COALESCE(lng, 0),
    distancia_millas = COALESCE(distancia_millas, 0),
    subtotal         = COALESCE(subtotal, monto_total),
    costo_delivery   = COALESCE(costo_delivery, 0);

ALTER TABLE pedidos
    ALTER COLUMN direccion        SET NOT NULL,
    ALTER COLUMN lat              SET NOT NULL,
    ALTER COLUMN lng              SET NOT NULL,
    ALTER COLUMN distancia_millas SET NOT NULL,
    ALTER COLUMN subtotal         SET NOT NULL,
    ALTER COLUMN costo_delivery   SET NOT NULL;

ALTER TABLE pedidos
    ADD CONSTRAINT pedidos_lat_check              CHECK (lat BETWEEN -90 AND 90),
    ADD CONSTRAINT pedidos_lng_check              CHECK (lng BETWEEN -180 AND 180),
    ADD CONSTRAINT pedidos_distancia_millas_check CHECK (distancia_millas >= 0),
    ADD CONSTRAINT pedidos_subtotal_check         CHECK (subtotal >= 0),
    ADD CONSTRAINT pedidos_costo_delivery_check   CHECK (costo_delivery >= 0),
    ADD CONSTRAINT pedidos_check                  CHECK (monto_total = subtotal + costo_delivery);

\ir ../schema/04_tarifas_delivery.sql

COMMIT;

-- =========================================================
--  TABLA: pedidos
--  numero_pedido: secuencial 1, 2, 3... (único, lo pone PostgreSQL)
--  subtotal + costo_delivery = monto_total (lo calcula el backend)
--  costo_delivery / distancia_millas: los calcula el backend con
--  Google Routes API (restaurante -> lat/lng del cliente)
--  stripe_payment_intent_id: solo si medio_pago = 'tarjeta'
-- =========================================================
CREATE TABLE IF NOT EXISTS pedidos (
    numero_pedido             BIGINT         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden                     TEXT           NOT NULL,
    nombre                    VARCHAR(100)   NOT NULL,
    celular                   VARCHAR(20)    NOT NULL,
    direccion                 TEXT           NOT NULL,
    lat                       NUMERIC(9,6)   NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng                       NUMERIC(9,6)   NOT NULL CHECK (lng BETWEEN -180 AND 180),
    distancia_millas          NUMERIC(6,2)   NOT NULL CHECK (distancia_millas >= 0),
    subtotal                  NUMERIC(12,2)  NOT NULL CHECK (subtotal >= 0),
    costo_delivery            NUMERIC(10,2)  NOT NULL CHECK (costo_delivery >= 0),
    monto_total               NUMERIC(12,2)  NOT NULL CHECK (monto_total >= 0),
    medio_pago                VARCHAR(20)    NOT NULL
                              CHECK (medio_pago IN ('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata')),
    pago_confirmado           BOOLEAN        NOT NULL DEFAULT false,
    stripe_payment_intent_id  VARCHAR(255)   UNIQUE,
    creado_en                 TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CHECK (monto_total = subtotal + costo_delivery)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_celular   ON pedidos (celular);
CREATE INDEX IF NOT EXISTS idx_pedidos_creado_en ON pedidos (creado_en DESC);

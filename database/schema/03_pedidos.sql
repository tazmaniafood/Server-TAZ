-- =========================================================
--  TABLA: pedidos
--  numero_pedido: aleatorio de 8 dígitos (10000000 - 99999999)
-- =========================================================
CREATE TABLE IF NOT EXISTS pedidos (
    numero_pedido    BIGINT         PRIMARY KEY
                     DEFAULT generar_id_unico('pedidos', 'numero_pedido', 10000000, 99999999),
    orden            TEXT           NOT NULL,
    nombre           VARCHAR(100)   NOT NULL,
    celular          VARCHAR(20)    NOT NULL,
    monto_total      NUMERIC(12,2)  NOT NULL CHECK (monto_total >= 0),
    medio_pago       VARCHAR(20)    NOT NULL
                     CHECK (medio_pago IN ('efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata')),
    pago_confirmado  BOOLEAN        NOT NULL DEFAULT false,
    creado_en        TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_celular   ON pedidos (celular);
CREATE INDEX IF NOT EXISTS idx_pedidos_creado_en ON pedidos (creado_en DESC);

-- =========================================================
--  TABLA: tarifas_delivery (tramos de precio por millas)
--  Un tramo aplica si  millas_desde <= distancia < millas_hasta.
--  Si la distancia supera todos los tramos -> fuera de zona.
--  Los precios se cargan con database/datos/tarifas_delivery.sql
-- =========================================================
CREATE TABLE IF NOT EXISTS tarifas_delivery (
    id_tarifa     INT            GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    millas_desde  NUMERIC(6,2)   NOT NULL CHECK (millas_desde >= 0),
    millas_hasta  NUMERIC(6,2)   NOT NULL,
    costo         NUMERIC(10,2)  NOT NULL CHECK (costo >= 0),
    activo        BOOLEAN        NOT NULL DEFAULT true,
    CHECK (millas_hasta > millas_desde)
);

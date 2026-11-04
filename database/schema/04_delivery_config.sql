-- =========================================================
--  TABLA: delivery_config (una sola fila)
--  costo_delivery = millas manejando x precio_por_milla
--  Si las millas pasan de millas_maximas -> fuera de alcance.
--  Los valores se cargan con database/datos/delivery_config.sql
-- =========================================================
CREATE TABLE IF NOT EXISTS delivery_config (
    id                BOOLEAN        PRIMARY KEY DEFAULT true CHECK (id),  -- solo puede haber una fila
    precio_por_milla  NUMERIC(8,2)   NOT NULL CHECK (precio_por_milla >= 0),
    millas_maximas    NUMERIC(6,2)   NOT NULL CHECK (millas_maximas > 0),
    actualizado_en    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

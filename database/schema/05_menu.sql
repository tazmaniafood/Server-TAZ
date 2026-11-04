-- =========================================================
--  TABLA: menu
--  Un registro por cada elemento que se edita en el admin
--  (mismos ids que Frontend-admin/JS/menu-base.js):
--    platos, bordes, bebidas:  "pizza-hawaiana", "bebida-sprite"...
--    toppings y salsas:        "topping-queso-extra"       -> { n }
--                              "topping-queso-extra@pizza" -> { p, g } por plato
--  base:    datos originales (se cargan con database/datos/menu_inicial.sql)
--  cambios: lo que el admin modificó (PUT /api/menu)
--  Lo que se muestra en la tienda = base || cambios
--  Campos: n nombre, d descripción, p precio (número o lista por tamaño),
--          g porción, ing ingredientes [{n, g}]
-- =========================================================
CREATE TABLE IF NOT EXISTS menu (
    id                   VARCHAR(100)  PRIMARY KEY,
    seccion              VARCHAR(30)   NOT NULL,
    orden                INT           NOT NULL DEFAULT 0,
    base                 JSONB         NOT NULL CHECK (jsonb_typeof(base) = 'object'),
    cambios              JSONB         NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(cambios) = 'object'),
    actualizado_cliente  BIGINT        NOT NULL DEFAULT 0,  -- hora del navegador que guardó (ms)
    actualizado_en       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_seccion ON menu (seccion, orden);

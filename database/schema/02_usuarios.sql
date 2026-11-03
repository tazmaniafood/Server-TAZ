-- =========================================================
--  TABLA: usuarios
--  id_usuario: aleatorio de 6 dígitos (100000 - 999999)
--  contrasena_hash: guardar SIEMPRE encriptada (bcrypt)
-- =========================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario       BIGINT       PRIMARY KEY
                     DEFAULT generar_id_unico('usuarios', 'id_usuario', 100000, 999999),
    usuario          VARCHAR(50)  NOT NULL UNIQUE,
    contrasena_hash  TEXT         NOT NULL,
    tipo_usuario     VARCHAR(20)  NOT NULL DEFAULT 'cliente'
                     CHECK (tipo_usuario IN ('admin', 'cliente', 'repartidor')),
    creado_en        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

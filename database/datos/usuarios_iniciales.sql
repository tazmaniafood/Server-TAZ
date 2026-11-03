-- =========================================================
--  USUARIOS INICIALES: admin, cocina y repartidor
--  Las contraseñas NO se escriben aquí: se pasan al ejecutar,
--  y se guardan encriptadas con bcrypt (pgcrypto).
--
--  Uso (con un espacio al inicio para que no quede en el historial):
--     psql -h localhost -U tazmania -d tazmania_db \
--       -v clave_admin='CLAVE1' -v clave_cocina='CLAVE2' -v clave_repartidor='CLAVE3' \
--       -f database/datos/usuarios_iniciales.sql
--
--  Si se vuelve a ejecutar con otras claves, se actualizan
--  (sirve para cambiar contraseñas).
-- =========================================================
INSERT INTO usuarios (usuario, contrasena_hash, tipo_usuario)
VALUES
    ('admin',      crypt(:'clave_admin',      gen_salt('bf', 12)), 'admin'),
    ('cocina',     crypt(:'clave_cocina',     gen_salt('bf', 12)), 'cocina'),
    ('repartidor', crypt(:'clave_repartidor', gen_salt('bf', 12)), 'repartidor')
ON CONFLICT (usuario) DO UPDATE
    SET contrasena_hash = EXCLUDED.contrasena_hash,
        tipo_usuario    = EXCLUDED.tipo_usuario;

SELECT id_usuario, usuario, tipo_usuario, left(contrasena_hash, 7) || '...' AS hash
FROM usuarios
ORDER BY usuario;

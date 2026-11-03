-- =========================================================
--  USUARIO INICIAL: admin
--  La contraseña NO se escribe aquí: se pasa al ejecutar,
--  y se guarda encriptada con bcrypt (pgcrypto).
--
--  Uso (con un espacio al inicio para que no quede en el historial):
--     psql -h localhost -U tazmania -d tazmania_db \
--       -v clave_admin='CLAVE' -f database/datos/usuarios_iniciales.sql
--
--  Si se vuelve a ejecutar con otra clave, se actualiza
--  (sirve para cambiar la contraseña).
-- =========================================================
INSERT INTO usuarios (usuario, contrasena_hash, tipo_usuario)
VALUES ('admin', crypt(:'clave_admin', gen_salt('bf', 12)), 'admin')
ON CONFLICT (usuario) DO UPDATE
    SET contrasena_hash = EXCLUDED.contrasena_hash,
        tipo_usuario    = EXCLUDED.tipo_usuario;

SELECT id_usuario, usuario, tipo_usuario, left(contrasena_hash, 7) || '...' AS hash
FROM usuarios
ORDER BY usuario;

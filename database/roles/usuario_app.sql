-- =========================================================
--  USUARIO DE LA APP: taz_app (permisos mínimos)
--  Es el usuario con el que se conecta el backend.
--  NO es dueño de nada: no puede crear/borrar tablas ni borrar datos.
--
--  Puede:
--    usuarios -> solo LEER (para el login)
--    pedidos  -> LEER, CREAR y cambiar SOLO pago_confirmado
--    delivery_config  -> solo LEER (precio por milla y alcance)
--    menu     -> LEER y cambiar SOLO cambios (lo que edita el admin)
--
--  Uso (como postgres; espacio al inicio para no guardar en el historial):
--     sudo -u postgres psql -d tazmania_db -v clave_app='CLAVE' -f database/roles/usuario_app.sql
--  Volver a ejecutarlo con otra clave sirve para cambiarla.
-- =========================================================
\set ON_ERROR_STOP on

-- Crear el usuario si no existe
SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'taz_app') AS crear \gset
\if :crear
    CREATE ROLE taz_app LOGIN;
\endif
ALTER ROLE taz_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
    PASSWORD :'clave_app' CONNECTION LIMIT 30;

-- Solo tazmania y taz_app pueden conectarse a la base
REVOKE ALL ON DATABASE tazmania_db FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE tazmania_db TO tazmania;
GRANT CONNECT ON DATABASE tazmania_db TO taz_app;

-- Nadie más que el dueño puede crear cosas en el esquema
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO taz_app;

-- Quitar cualquier permiso previo y dar solo lo necesario
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM taz_app;

GRANT SELECT ON usuarios TO taz_app;

GRANT SELECT, INSERT ON pedidos TO taz_app;
GRANT UPDATE (pago_confirmado) ON pedidos TO taz_app;

GRANT SELECT ON delivery_config TO taz_app;

GRANT SELECT ON menu TO taz_app;
GRANT UPDATE (cambios, actualizado_cliente, actualizado_en) ON menu TO taz_app;

\echo '>> Permisos de taz_app:'
SELECT table_name AS tabla, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS permisos
FROM information_schema.role_table_grants
WHERE grantee = 'taz_app'
GROUP BY table_name
ORDER BY table_name;

\echo '>> Columnas que taz_app puede modificar:'
SELECT table_name AS tabla, column_name AS columna
FROM information_schema.column_privileges
WHERE grantee = 'taz_app' AND privilege_type = 'UPDATE';

-- =========================================================
--  Crear usuario y base de datos (ejecutar como postgres):
--    sudo -u postgres psql -v clave='TuClaveSegura' -f database/crear_db.sql
-- =========================================================
CREATE USER tazmania WITH PASSWORD :'clave';
CREATE DATABASE tazmania_db OWNER tazmania;
GRANT ALL PRIVILEGES ON DATABASE tazmania_db TO tazmania;

-- =========================================================
--  MIGRACIÓN 005: tabla menu (precios y datos del menú del admin)
--  Uso:
--    psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/005_menu.sql
--  Después: cargar database/datos/menu_inicial.sql y volver a
--  ejecutar database/roles/usuario_app.sql (permisos).
-- =========================================================
\ir ../schema/05_menu.sql

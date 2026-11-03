-- =========================================================
--  FUNCIÓN: generar_id_unico
--  Genera un número aleatorio entre [minimo, maximo] que
--  todavía no exista en la tabla/columna indicada.
-- =========================================================
CREATE OR REPLACE FUNCTION generar_id_unico(tabla text, columna text, minimo bigint, maximo bigint)
RETURNS bigint AS $$
DECLARE
    nuevo  bigint;
    existe boolean;
BEGIN
    LOOP
        nuevo := minimo + floor(random() * (maximo - minimo + 1))::bigint;
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE %I = $1)', tabla, columna)
            INTO existe USING nuevo;
        EXIT WHEN NOT existe;
    END LOOP;
    RETURN nuevo;
END;
$$ LANGUAGE plpgsql;

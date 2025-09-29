-- =====================================================
-- EJECUTAR PASO A PASO EN LA BASE DE DATOS
-- =====================================================
-- Ejecuta estos comandos uno por uno en tu consola SQL

-- PASO 1: Función para calcular stock de un combo
CREATE OR REPLACE FUNCTION calcular_stock_combo(combo_id integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    stock_disponible integer := 0;
    componente_record RECORD;
    stock_componente integer;
    combos_posibles integer;
BEGIN
    -- Verificar que el artículo sea un combo
    IF NOT EXISTS (
        SELECT 1 FROM articulos
        WHERE id = combo_id AND es_combo = true
    ) THEN
        RETURN 0;
    END IF;

    -- Verificar que el combo tenga componentes
    IF NOT EXISTS (
        SELECT 1 FROM articulos_combo_detalle
        WHERE fk_articulo_combo = combo_id
    ) THEN
        RETURN 0;
    END IF;

    -- Inicializar con un valor alto para encontrar el mínimo
    stock_disponible := 999999;

    -- Iterar sobre cada componente del combo
    FOR componente_record IN
        SELECT
            acd.fk_articulo_componente,
            acd.cantidad,
            a.stock
        FROM articulos_combo_detalle acd
        JOIN articulos a ON acd.fk_articulo_componente = a.id
        WHERE acd.fk_articulo_combo = combo_id
    LOOP
        -- Calcular cuántos combos se pueden hacer con este componente
        combos_posibles := FLOOR(componente_record.stock / componente_record.cantidad);

        -- El stock del combo está limitado por el componente con menos disponibilidad
        IF combos_posibles < stock_disponible THEN
            stock_disponible := combos_posibles;
        END IF;
    END LOOP;

    -- Asegurar que no sea negativo
    IF stock_disponible < 0 OR stock_disponible = 999999 THEN
        stock_disponible := 0;
    END IF;

    RETURN stock_disponible;
END;
$$;

-- PASO 2: Función para actualizar stock de todos los combos
CREATE OR REPLACE FUNCTION actualizar_stock_todos_combos()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    combo_record RECORD;
    nuevo_stock integer;
BEGIN
    -- Iterar sobre todos los combos
    FOR combo_record IN
        SELECT id FROM articulos WHERE es_combo = true
    LOOP
        -- Calcular el nuevo stock para este combo
        nuevo_stock := calcular_stock_combo(combo_record.id);

        -- Actualizar el stock del combo
        UPDATE articulos
        SET stock = nuevo_stock
        WHERE id = combo_record.id;

        -- Log opcional para debug
        RAISE NOTICE 'Combo ID %: Stock actualizado a %', combo_record.id, nuevo_stock;
    END LOOP;
END;
$$;

-- PASO 3: Función trigger para cambios en stock de componentes
CREATE OR REPLACE FUNCTION trigger_actualizar_stock_combos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    combo_id integer;
    nuevo_stock integer;
BEGIN
    -- Solo ejecutar si cambió el stock
    IF TG_OP = 'UPDATE' AND OLD.stock = NEW.stock THEN
        RETURN NEW;
    END IF;

    -- Encontrar todos los combos que usan este artículo como componente
    FOR combo_id IN
        SELECT DISTINCT fk_articulo_combo
        FROM articulos_combo_detalle
        WHERE fk_articulo_componente = COALESCE(NEW.id, OLD.id)
    LOOP
        -- Calcular y actualizar el stock del combo
        nuevo_stock := calcular_stock_combo(combo_id);

        UPDATE articulos
        SET stock = nuevo_stock
        WHERE id = combo_id;

        -- Log opcional para debug
        RAISE NOTICE 'Combo ID % actualizado por cambio en componente ID %: nuevo stock %',
                     combo_id, COALESCE(NEW.id, OLD.id), nuevo_stock;
    END LOOP;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- PASO 4: Función trigger para cambios en componentes de combo
CREATE OR REPLACE FUNCTION trigger_componentes_combo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    combo_id integer;
    nuevo_stock integer;
BEGIN
    -- Obtener el ID del combo afectado
    combo_id := COALESCE(NEW.fk_articulo_combo, OLD.fk_articulo_combo);

    -- Calcular y actualizar el stock del combo
    nuevo_stock := calcular_stock_combo(combo_id);

    UPDATE articulos
    SET stock = nuevo_stock
    WHERE id = combo_id;

    -- Log opcional para debug
    RAISE NOTICE 'Combo ID % actualizado por cambio en componentes: nuevo stock %',
                 combo_id, nuevo_stock;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- PASO 5: Crear triggers
DROP TRIGGER IF EXISTS trigger_stock_combos ON articulos;
CREATE TRIGGER trigger_stock_combos
    AFTER UPDATE OF stock OR INSERT OR DELETE
    ON articulos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_actualizar_stock_combos();

DROP TRIGGER IF EXISTS trigger_componentes_stock ON articulos_combo_detalle;
CREATE TRIGGER trigger_componentes_stock
    AFTER INSERT OR UPDATE OR DELETE
    ON articulos_combo_detalle
    FOR EACH ROW
    EXECUTE FUNCTION trigger_componentes_combo();

-- PASO 6: Verificar que todo se creó correctamente
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('calcular_stock_combo', 'actualizar_stock_todos_combos', 'trigger_actualizar_stock_combos', 'trigger_componentes_combo')
AND routine_schema = 'public';

-- PASO 7: Verificar triggers
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_stock_combos', 'trigger_componentes_stock');

-- PASO 8: Ejecutar actualización inicial de todos los combos
SELECT actualizar_stock_todos_combos();
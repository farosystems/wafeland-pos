-- =====================================================
-- FUNCIÓN PARA CALCULAR STOCK AUTOMÁTICO DE COMBOS
-- =====================================================
-- Esta función calcula automáticamente el stock disponible de un combo
-- basándose en el stock de sus componentes
-- =====================================================

-- Función para calcular stock disponible de un combo específico
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

-- Función para actualizar el stock de todos los combos
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

-- Trigger para actualizar automáticamente el stock de combos cuando cambie el stock de componentes
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

-- Crear el trigger en la tabla articulos
DROP TRIGGER IF EXISTS trigger_stock_combos ON articulos;
CREATE TRIGGER trigger_stock_combos
    AFTER UPDATE OF stock OR INSERT OR DELETE
    ON articulos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_actualizar_stock_combos();

-- Trigger para cuando se agregan/eliminan/modifican componentes de combo
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

-- Crear el trigger en la tabla articulos_combo_detalle
DROP TRIGGER IF EXISTS trigger_componentes_stock ON articulos_combo_detalle;
CREATE TRIGGER trigger_componentes_stock
    AFTER INSERT OR UPDATE OR DELETE
    ON articulos_combo_detalle
    FOR EACH ROW
    EXECUTE FUNCTION trigger_componentes_combo();

-- =====================================================
-- CONSULTAS ÚTILES PARA VERIFICAR EL FUNCIONAMIENTO
-- =====================================================

-- Ver stock calculado vs stock actual de todos los combos
/*
SELECT
    a.id,
    a.descripcion,
    a.stock as stock_actual,
    calcular_stock_combo(a.id) as stock_calculado,
    CASE
        WHEN a.stock = calcular_stock_combo(a.id) THEN 'OK'
        ELSE 'DESINCRONIZADO'
    END as estado
FROM articulos a
WHERE a.es_combo = true
ORDER BY a.descripcion;
*/

-- Ver detalle de un combo específico con stock de componentes
/*
SELECT
    combo.descripcion as combo,
    comp.descripcion as componente,
    acd.cantidad as cantidad_necesaria,
    comp.stock as stock_disponible,
    FLOOR(comp.stock / acd.cantidad) as combos_posibles
FROM articulos combo
JOIN articulos_combo_detalle acd ON combo.id = acd.fk_articulo_combo
JOIN articulos comp ON acd.fk_articulo_componente = comp.id
WHERE combo.id = ? -- Reemplazar ? con ID del combo
ORDER BY combos_posibles ASC;
*/

-- Ejecutar actualización manual de todos los combos
/*
SELECT actualizar_stock_todos_combos();
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
--
-- 1. La función calcular_stock_combo() calcula cuántos combos se pueden formar
--    basándose en el stock disponible de cada componente
-- 2. El stock del combo es el MÍNIMO entre todos los componentes
--    Ejemplo: Si necesita 2 cafés y 1 tostada, y hay 10 cafés y 3 tostadas,
--             se pueden hacer: min(10/2, 3/1) = min(5, 3) = 3 combos
-- 3. Los triggers actualizan automáticamente el stock cuando:
--    - Cambia el stock de un artículo componente
--    - Se agregan/eliminan componentes de un combo
-- 4. Para actualizar manualmente: SELECT actualizar_stock_todos_combos();
-- 5. Para combos sin componentes, el stock se mantiene en 0
-- 6. El cálculo considera FLOOR() para evitar fracciones
--
-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
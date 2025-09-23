-- =====================================================
-- TRIGGER PARA ACTUALIZAR STOCK DE LECHE AUTOMÁTICAMENTE
-- =====================================================
-- Este trigger actualiza la equivalencia cuando se cambia el stock
-- del artículo leche y sincroniza control_ml_leche
-- =====================================================

-- 1. Función para sincronizar stock de leche
-- =====================================================
CREATE OR REPLACE FUNCTION sincronizar_stock_leche()
RETURNS TRIGGER AS $$
DECLARE
    v_control_id bigint;
BEGIN
    -- Solo procesar si es un artículo con equivalencia = 1000 (Leche)
    IF NEW.equivalencia = 1000 AND LOWER(NEW.descripcion) LIKE '%leche%' THEN

        -- Actualizar equivalencia automáticamente: stock × 1000
        NEW.equivalencia := NEW.stock * 1000;

        -- Obtener o crear registro en control_ml_leche
        SELECT id INTO v_control_id
        FROM control_ml_leche
        WHERE fk_id_articulo_leche = NEW.id;

        IF v_control_id IS NULL THEN
            -- Crear nuevo registro de control
            INSERT INTO control_ml_leche (fk_id_articulo_leche, ml_acumulados_consumidos)
            VALUES (NEW.id, 0);
        ELSE
            -- Actualizar fecha de última modificación
            UPDATE control_ml_leche
            SET fecha_actualizacion = now()
            WHERE id = v_control_id;
        END IF;

        -- Log del cambio
        RAISE NOTICE 'Stock de leche actualizado: % litros = % ml', NEW.stock, NEW.equivalencia;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear el trigger
-- =====================================================
DROP TRIGGER IF EXISTS trigger_sincronizar_stock_leche ON articulos;

CREATE TRIGGER trigger_sincronizar_stock_leche
    BEFORE UPDATE OF stock ON articulos
    FOR EACH ROW
    WHEN (NEW.equivalencia = 1000 AND LOWER(NEW.descripcion) LIKE '%leche%')
    EXECUTE FUNCTION sincronizar_stock_leche();

-- 3. Función para inicializar artículo leche
-- =====================================================
CREATE OR REPLACE FUNCTION inicializar_articulo_leche(
    p_stock_inicial integer DEFAULT 10
) RETURNS boolean AS $$
DECLARE
    v_articulo_id bigint;
    v_agrupador_id bigint;
BEGIN
    -- Obtener un agrupador válido
    SELECT id INTO v_agrupador_id FROM agrupadores WHERE activo = true LIMIT 1;

    IF v_agrupador_id IS NULL THEN
        RAISE EXCEPTION 'No hay agrupadores activos disponibles';
    END IF;

    -- Crear o actualizar artículo leche
    INSERT INTO articulos (descripcion, precio_unitario, fk_id_agrupador, activo, stock, equivalencia)
    VALUES ('Leche', 1000, v_agrupador_id, true, p_stock_inicial, p_stock_inicial * 1000)
    ON CONFLICT (descripcion) DO UPDATE SET
        stock = p_stock_inicial,
        equivalencia = p_stock_inicial * 1000,
        activo = true
    RETURNING id INTO v_articulo_id;

    -- Si no se insertó, buscar el existente
    IF v_articulo_id IS NULL THEN
        SELECT id INTO v_articulo_id
        FROM articulos
        WHERE LOWER(descripcion) LIKE '%leche%' AND equivalencia = p_stock_inicial * 1000
        LIMIT 1;
    END IF;

    -- Crear registro de control si no existe
    INSERT INTO control_ml_leche (fk_id_articulo_leche, ml_acumulados_consumidos)
    VALUES (v_articulo_id, 0)
    ON CONFLICT (fk_id_articulo_leche) DO NOTHING;

    RAISE NOTICE 'Artículo leche inicializado: ID %, Stock % litros = % ml',
                 v_articulo_id, p_stock_inicial, p_stock_inicial * 1000;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 4. Inicializar el sistema
-- =====================================================
SELECT inicializar_articulo_leche(10); -- 10 litros iniciales

-- 5. Verificación
-- =====================================================
SELECT 'VERIFICACION DEL SISTEMA:' as info;

SELECT 'Artículo Leche:' as tipo, id, descripcion, stock, equivalencia
FROM articulos
WHERE equivalencia >= 1000 AND LOWER(descripcion) LIKE '%leche%';

SELECT 'Control ML:' as tipo, * FROM control_ml_leche;

-- 6. Prueba del trigger
-- =====================================================
SELECT 'PROBANDO TRIGGER:' as info;

-- Cambiar stock de leche para probar el trigger
UPDATE articulos
SET stock = 15
WHERE LOWER(descripcion) LIKE '%leche%' AND equivalencia >= 1000;

-- Verificar que se actualizó automáticamente
SELECT 'Después del trigger:' as tipo, id, descripcion, stock, equivalencia
FROM articulos
WHERE LOWER(descripcion) LIKE '%leche%' AND equivalencia >= 1000;
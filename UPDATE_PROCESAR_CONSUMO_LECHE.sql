-- =====================================================
-- ACTUALIZAR FUNCIÓN PROCESAR CONSUMO DE LECHE
-- =====================================================
-- Función específica para artículo Leche ID = 27
-- =====================================================

-- 1. Reemplazar la función existente
-- =====================================================
CREATE OR REPLACE FUNCTION procesar_consumo_leche(
  p_orden_id bigint,
  p_articulo_id bigint,
  p_cantidad integer,
  p_equivalencia_ml numeric
) RETURNS boolean AS $$
DECLARE
  v_total_ml_consumido numeric;
  v_control_id bigint;
  v_ml_acumulados_actual numeric;
  v_ml_acumulados_nuevo numeric;
  v_litros_a_descontar integer;
  v_ml_restantes numeric;
  v_stock_actual integer;
BEGIN
  -- Calcular total de ml consumidos en esta venta
  v_total_ml_consumido := p_cantidad * p_equivalencia_ml;

  -- Si no consume leche, salir
  IF v_total_ml_consumido <= 0 THEN
    RETURN true;
  END IF;

  -- 1. REGISTRAR EL CONSUMO EN LA TABLA consumo_leche
  INSERT INTO consumo_leche (fk_id_orden, fk_id_articulo, cantidad_vendida, equivalencia_ml)
  VALUES (p_orden_id, p_articulo_id, p_cantidad, p_equivalencia_ml);

  RAISE NOTICE 'Registrado consumo: Orden %, Artículo %, Cantidad %, ML total %',
               p_orden_id, p_articulo_id, p_cantidad, v_total_ml_consumido;

  -- 2. OBTENER O CREAR CONTROL DE ML PARA ARTÍCULO LECHE (ID = 27)
  SELECT id, ml_acumulados_consumidos
  INTO v_control_id, v_ml_acumulados_actual
  FROM control_ml_leche
  WHERE fk_id_articulo_leche = 27;

  IF v_control_id IS NULL THEN
    -- Crear nuevo registro de control para el artículo leche
    INSERT INTO control_ml_leche (fk_id_articulo_leche, ml_acumulados_consumidos)
    VALUES (27, v_total_ml_consumido)
    RETURNING id INTO v_control_id;

    v_ml_acumulados_nuevo := v_total_ml_consumido;
    RAISE NOTICE 'Creado control ML para artículo leche ID 27. ML acumulados: %', v_ml_acumulados_nuevo;
  ELSE
    -- Sumar al acumulado existente
    v_ml_acumulados_nuevo := v_ml_acumulados_actual + v_total_ml_consumido;
    RAISE NOTICE 'ML acumulados antes: %, agregando: %, total: %',
                 v_ml_acumulados_actual, v_total_ml_consumido, v_ml_acumulados_nuevo;
  END IF;

  -- 3. VERIFICAR SI HAY QUE DESCONTAR LITROS COMPLETOS
  v_litros_a_descontar := FLOOR(v_ml_acumulados_nuevo / 1000);
  v_ml_restantes := v_ml_acumulados_nuevo - (v_litros_a_descontar * 1000);

  RAISE NOTICE 'Litros a descontar: %, ML restantes: %', v_litros_a_descontar, v_ml_restantes;

  -- 4. SI HAY LITROS COMPLETOS, DESCONTAR DEL STOCK
  IF v_litros_a_descontar > 0 THEN
    -- Verificar stock actual del artículo leche
    SELECT stock INTO v_stock_actual
    FROM articulos
    WHERE id = 27;

    IF v_stock_actual IS NULL THEN
      RAISE EXCEPTION 'No se encontró el artículo Leche con ID 27';
    END IF;

    IF v_stock_actual < v_litros_a_descontar THEN
      RAISE EXCEPTION 'Stock insuficiente de leche. Stock actual: %, necesario: %',
                      v_stock_actual, v_litros_a_descontar;
    END IF;

    -- Descontar litros del stock
    UPDATE articulos
    SET stock = stock - v_litros_a_descontar
    WHERE id = 27;

    RAISE NOTICE 'Descontados % litros del stock. Stock anterior: %, nuevo: %',
                 v_litros_a_descontar, v_stock_actual, (v_stock_actual - v_litros_a_descontar);

    -- Crear movimiento de stock
    INSERT INTO movimientos_stock (fk_id_orden, fk_id_articulos, origen, tipo, cantidad, stock_actual)
    VALUES (
      p_orden_id,
      27, -- Artículo leche
      'CONSUMO_LECHE',
      'salida',
      v_litros_a_descontar,
      (v_stock_actual - v_litros_a_descontar)
    );

    RAISE NOTICE 'Creado movimiento de stock: % litros salida', v_litros_a_descontar;
  END IF;

  -- 5. ACTUALIZAR ML ACUMULADOS EN CONTROL
  UPDATE control_ml_leche
  SET ml_acumulados_consumidos = v_ml_restantes,
      fecha_actualizacion = now()
  WHERE fk_id_articulo_leche = 27;

  RAISE NOTICE 'Actualizado control ML. ML restantes: %', v_ml_restantes;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR en procesar_consumo_leche: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 2. Verificar que el artículo leche existe
-- =====================================================
SELECT 'VERIFICACION ARTICULO LECHE:' as info;

SELECT id, descripcion, stock, equivalencia
FROM articulos
WHERE id = 27;

-- Si no existe el artículo 27, crear uno para pruebas
INSERT INTO articulos (id, descripcion, precio_unitario, fk_id_agrupador, activo, stock, equivalencia)
SELECT 27, 'Leche', 1000, 1, true, 10, 10000
WHERE NOT EXISTS (SELECT 1 FROM articulos WHERE id = 27);

-- 3. Verificar/crear control inicial
-- =====================================================
INSERT INTO control_ml_leche (fk_id_articulo_leche, ml_acumulados_consumidos)
VALUES (27, 0)
ON CONFLICT (fk_id_articulo_leche) DO NOTHING;

-- 4. Verificación final
-- =====================================================
SELECT 'ESTADO INICIAL:' as info;

SELECT 'Artículo Leche:' as tipo, id, descripcion, stock FROM articulos WHERE id = 27;
SELECT 'Control ML:' as tipo, * FROM control_ml_leche WHERE fk_id_articulo_leche = 27;

-- 5. Prueba rápida (opcional - descomenta para probar)
-- =====================================================
-- SELECT 'PRUEBA DE FUNCION:' as info;
-- SELECT procesar_consumo_leche(999, 1, 3, 37.7) as resultado;
-- SELECT * FROM control_ml_leche WHERE fk_id_articulo_leche = 27;
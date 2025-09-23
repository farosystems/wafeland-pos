-- =====================================================
-- SISTEMA DE CONSUMO DE LECHE SIMPLIFICADO
-- =====================================================
-- Este script crea las tablas para controlar el consumo de leche
-- basado en la equivalencia de los productos vendidos
-- =====================================================

-- 1. Tabla para registrar consumo acumulado de leche
-- =====================================================
CREATE TABLE public.consumo_leche (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_orden bigint NOT NULL,
  fk_id_articulo bigint NOT NULL, -- Artículo vendido que consume leche
  cantidad_vendida integer NOT NULL,
  equivalencia_ml numeric NOT NULL, -- ml de leche por unidad del artículo
  total_ml_consumido numeric GENERATED ALWAYS AS (cantidad_vendida * equivalencia_ml) STORED,
  fecha_consumo timestamp with time zone DEFAULT now(),
  CONSTRAINT consumo_leche_pkey PRIMARY KEY (id),
  CONSTRAINT consumo_leche_fk_id_orden_fkey FOREIGN KEY (fk_id_orden) REFERENCES public.ordenes_venta(id),
  CONSTRAINT consumo_leche_fk_id_articulo_fkey FOREIGN KEY (fk_id_articulo) REFERENCES public.articulos(id)
);

-- 2. Tabla para control de ML acumulados de leche
-- =====================================================
CREATE TABLE public.control_ml_leche (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_articulo_leche bigint NOT NULL, -- ID del artículo "Leche"
  ml_acumulados_consumidos numeric DEFAULT 0, -- ML consumidos que aún no restan stock
  fecha_actualizacion timestamp with time zone DEFAULT now(),
  CONSTRAINT control_ml_leche_pkey PRIMARY KEY (id),
  CONSTRAINT control_ml_leche_fk_id_articulo_leche_fkey FOREIGN KEY (fk_id_articulo_leche) REFERENCES public.articulos(id),
  CONSTRAINT control_ml_leche_ml_acumulados_check CHECK (ml_acumulados_consumidos >= 0)
);

-- 3. Función para consumir leche cuando se realiza una venta
-- =====================================================
CREATE OR REPLACE FUNCTION procesar_consumo_leche(
  p_orden_id bigint,
  p_articulo_id bigint,
  p_cantidad integer,
  p_equivalencia_ml numeric
) RETURNS boolean AS $$
DECLARE
  v_total_ml_consumido numeric;
  v_articulo_leche_id bigint;
  v_control_id bigint;
  v_ml_acumulados numeric;
  v_litros_a_descontar integer;
  v_ml_restantes numeric;
BEGIN
  -- Calcular total de ml consumidos
  v_total_ml_consumido := p_cantidad * p_equivalencia_ml;

  -- Si no consume leche, salir
  IF v_total_ml_consumido <= 0 THEN
    RETURN true;
  END IF;

  -- Registrar el consumo
  INSERT INTO consumo_leche (fk_id_orden, fk_id_articulo, cantidad_vendida, equivalencia_ml)
  VALUES (p_orden_id, p_articulo_id, p_cantidad, p_equivalencia_ml);

  -- Buscar el artículo "Leche" (debe tener equivalencia = 1000)
  SELECT id INTO v_articulo_leche_id
  FROM articulos
  WHERE equivalencia = 1000 AND LOWER(descripcion) LIKE '%leche%'
  LIMIT 1;

  IF v_articulo_leche_id IS NULL THEN
    RAISE NOTICE 'No se encontró artículo Leche con equivalencia 1000. El consumo se registró pero no se descontó stock.';
    RETURN true;
  END IF;

  -- Obtener o crear el control de ML
  SELECT id, ml_acumulados_consumidos
  INTO v_control_id, v_ml_acumulados
  FROM control_ml_leche
  WHERE fk_id_articulo_leche = v_articulo_leche_id;

  IF v_control_id IS NULL THEN
    INSERT INTO control_ml_leche (fk_id_articulo_leche, ml_acumulados_consumidos)
    VALUES (v_articulo_leche_id, v_total_ml_consumido);
    v_ml_acumulados := v_total_ml_consumido;
    v_control_id := currval('control_ml_leche_id_seq');
  ELSE
    v_ml_acumulados := v_ml_acumulados + v_total_ml_consumido;
  END IF;

  -- Calcular cuántos litros completos se pueden descontar
  v_litros_a_descontar := FLOOR(v_ml_acumulados / 1000);
  v_ml_restantes := v_ml_acumulados - (v_litros_a_descontar * 1000);

  -- Si hay litros completos para descontar
  IF v_litros_a_descontar > 0 THEN
    -- Verificar que hay suficiente stock de leche
    IF (SELECT stock FROM articulos WHERE id = v_articulo_leche_id) < v_litros_a_descontar THEN
      RAISE EXCEPTION 'Stock insuficiente de leche. Se necesitan % litros pero solo hay % disponibles.',
        v_litros_a_descontar, (SELECT stock FROM articulos WHERE id = v_articulo_leche_id);
    END IF;

    -- Descontar del stock de leche
    UPDATE articulos
    SET stock = stock - v_litros_a_descontar
    WHERE id = v_articulo_leche_id;

    -- Crear movimiento de stock
    INSERT INTO movimientos_stock (fk_id_orden, fk_id_articulos, origen, tipo, cantidad, stock_actual)
    VALUES (
      p_orden_id,
      v_articulo_leche_id,
      'CONSUMO_LECHE',
      'salida',
      v_litros_a_descontar,
      (SELECT stock FROM articulos WHERE id = v_articulo_leche_id)
    );
  END IF;

  -- Actualizar ML acumulados
  UPDATE control_ml_leche
  SET ml_acumulados_consumidos = v_ml_restantes,
      fecha_actualizacion = now()
  WHERE id = v_control_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 4. Vista para análisis de consumo de leche por artículo
-- =====================================================
CREATE OR REPLACE VIEW vista_consumo_leche_por_articulo AS
SELECT
    a.descripcion as articulo,
    a.equivalencia as ml_por_unidad,
    SUM(cl.cantidad_vendida) as total_unidades_vendidas,
    SUM(cl.total_ml_consumido) as total_ml_consumido,
    ROUND(SUM(cl.total_ml_consumido) / 1000, 2) as total_litros_consumidos,
    COUNT(DISTINCT cl.fk_id_orden) as ordenes_que_lo_incluyeron,
    ROUND(AVG(cl.cantidad_vendida), 2) as promedio_unidades_por_orden
FROM consumo_leche cl
INNER JOIN articulos a ON cl.fk_id_articulo = a.id
GROUP BY a.id, a.descripcion, a.equivalencia
ORDER BY total_ml_consumido DESC;

-- 5. Vista para consumo de leche por período
-- =====================================================
CREATE OR REPLACE VIEW vista_consumo_leche_por_periodo AS
SELECT
    DATE(cl.fecha_consumo) as fecha,
    SUM(cl.total_ml_consumido) as total_ml_consumido,
    ROUND(SUM(cl.total_ml_consumido) / 1000, 2) as total_litros_consumidos,
    COUNT(DISTINCT cl.fk_id_orden) as ordenes_con_leche,
    COUNT(*) as items_con_leche,
    ROUND(AVG(cl.total_ml_consumido), 2) as promedio_ml_por_item
FROM consumo_leche cl
GROUP BY DATE(cl.fecha_consumo)
ORDER BY fecha DESC;

-- 6. Vista para estado actual del control de leche
-- =====================================================
CREATE OR REPLACE VIEW vista_estado_control_leche AS
SELECT
    a.descripcion as articulo_leche,
    a.stock as stock_litros_disponibles,
    cml.ml_acumulados_consumidos,
    ROUND((a.stock * 1000) + cml.ml_acumulados_consumidos, 2) as ml_totales_disponibles,
    cml.fecha_actualizacion
FROM control_ml_leche cml
INNER JOIN articulos a ON cml.fk_id_articulo_leche = a.id;

-- 7. Índices para mejorar performance
-- =====================================================
CREATE INDEX idx_consumo_leche_fecha ON consumo_leche(fecha_consumo);
CREATE INDEX idx_consumo_leche_articulo ON consumo_leche(fk_id_articulo);
CREATE INDEX idx_consumo_leche_orden ON consumo_leche(fk_id_orden);
CREATE INDEX idx_control_ml_leche_articulo ON control_ml_leche(fk_id_articulo_leche);

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE consumo_leche IS 'Registro detallado de consumo de leche por cada venta';
COMMENT ON TABLE control_ml_leche IS 'Control de ML acumulados consumidos que aún no han descontado stock';
COMMENT ON FUNCTION procesar_consumo_leche IS 'Procesa el consumo de leche automáticamente al registrar una venta';
COMMENT ON VIEW vista_consumo_leche_por_articulo IS 'Análisis de consumo de leche agrupado por artículo';
COMMENT ON VIEW vista_consumo_leche_por_periodo IS 'Consumo de leche por día para análisis temporal';
COMMENT ON VIEW vista_estado_control_leche IS 'Estado actual del stock y control de leche';
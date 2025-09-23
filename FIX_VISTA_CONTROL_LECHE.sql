-- =====================================================
-- CORREGIR VISTA DE CONTROL DE LECHE
-- =====================================================
-- Actualizar la vista para que funcione correctamente
-- =====================================================

-- 1. Recrear la vista de estado de control de leche
-- =====================================================
DROP VIEW IF EXISTS vista_estado_control_leche;

CREATE OR REPLACE VIEW vista_estado_control_leche AS
SELECT
    a.descripcion as articulo_leche,
    a.stock as stock_litros_disponibles,
    COALESCE(cml.ml_acumulados_consumidos, 0) as ml_acumulados_consumidos,
    ROUND((a.stock * 1000) - COALESCE(cml.ml_acumulados_consumidos, 0), 2) as ml_totales_disponibles,
    COALESCE(cml.fecha_actualizacion, now()) as fecha_actualizacion
FROM articulos a
LEFT JOIN control_ml_leche cml ON a.id = cml.fk_id_articulo_leche
WHERE a.equivalencia = 1000
AND LOWER(a.descripcion) LIKE '%leche%'
LIMIT 1;

-- 2. Inicializar control de leche si no existe
-- =====================================================
INSERT INTO control_ml_leche (fk_id_articulo_leche, ml_acumulados_consumidos)
SELECT a.id, 0
FROM articulos a
WHERE a.equivalencia = 1000
AND LOWER(a.descripcion) LIKE '%leche%'
AND NOT EXISTS (
    SELECT 1 FROM control_ml_leche cml WHERE cml.fk_id_articulo_leche = a.id
)
LIMIT 1;

-- 3. Verificar datos
-- =====================================================
SELECT 'VERIFICACION DE DATOS:' as info;

SELECT 'Articulo Leche:' as tipo, descripcion, stock, equivalencia
FROM articulos
WHERE equivalencia = 1000 AND LOWER(descripcion) LIKE '%leche%';

SELECT 'Control ML Leche:' as tipo, * FROM control_ml_leche;

SELECT 'Vista Estado:' as tipo, * FROM vista_estado_control_leche;

SELECT 'Consumos registrados:' as tipo, COUNT(*) as total FROM consumo_leche;
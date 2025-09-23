-- =====================================================
-- VERIFICAR SISTEMA DE CONSUMO DE LECHE
-- =====================================================
-- Script para verificar si el sistema está funcionando correctamente
-- =====================================================

-- 1. Verificar si las tablas existen
-- =====================================================
SELECT 'TABLAS EXISTENTES:' as info;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('consumo_leche', 'control_ml_leche');

-- 2. Verificar si la función existe
-- =====================================================
SELECT 'FUNCIONES EXISTENTES:' as info;

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'procesar_consumo_leche';

-- 3. Verificar artículos con equivalencia
-- =====================================================
SELECT 'ARTICULOS CON EQUIVALENCIA:' as info;

SELECT id, descripcion, equivalencia, stock
FROM articulos
WHERE equivalencia IS NOT NULL AND equivalencia > 0;

-- 4. Verificar si hay artículo leche
-- =====================================================
SELECT 'ARTICULO LECHE (equivalencia = 1000):' as info;

SELECT id, descripcion, equivalencia, stock
FROM articulos
WHERE equivalencia = 1000 AND LOWER(descripcion) LIKE '%leche%';

-- 5. Verificar ventas recientes
-- =====================================================
SELECT 'VENTAS RECIENTES CON DETALLES:' as info;

SELECT
    ov.id as orden_id,
    ov.fecha,
    ovd.fk_id_articulo,
    a.descripcion,
    a.equivalencia,
    ovd.cantidad
FROM ordenes_venta ov
INNER JOIN ordenes_venta_detalle ovd ON ov.id = ovd.fk_id_orden
INNER JOIN articulos a ON ovd.fk_id_articulo = a.id
WHERE ov.fecha >= CURRENT_DATE - INTERVAL '7 days'
AND a.equivalencia > 0
ORDER BY ov.fecha DESC
LIMIT 10;

-- 6. Verificar datos en tablas de leche
-- =====================================================
SELECT 'DATOS EN CONSUMO_LECHE:' as info;

SELECT COUNT(*) as total_registros FROM consumo_leche;

SELECT * FROM consumo_leche ORDER BY fecha_consumo DESC LIMIT 5;

SELECT 'DATOS EN CONTROL_ML_LECHE:' as info;

SELECT COUNT(*) as total_registros FROM control_ml_leche;

SELECT * FROM control_ml_leche;
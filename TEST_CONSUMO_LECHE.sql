-- =====================================================
-- PRUEBA MANUAL DEL SISTEMA DE CONSUMO DE LECHE
-- =====================================================
-- Script para probar manualmente el consumo de leche
-- =====================================================

-- 1. Crear artículo de prueba si no existe
-- =====================================================
INSERT INTO articulos (descripcion, precio_unitario, fk_id_agrupador, activo, stock, equivalencia)
VALUES ('Café de Prueba', 100, 1, true, 10, 37.7)
ON CONFLICT DO NOTHING;

-- 2. Crear artículo Leche si no existe
-- =====================================================
INSERT INTO articulos (descripcion, precio_unitario, fk_id_agrupador, activo, stock, equivalencia)
VALUES ('Leche', 50, 1, true, 5, 1000)
ON CONFLICT DO NOTHING;

-- 3. Verificar que existen los artículos
-- =====================================================
SELECT 'ARTICULOS CREADOS:' as info;
SELECT id, descripcion, equivalencia, stock
FROM articulos
WHERE descripcion IN ('Café de Prueba', 'Leche');

-- 4. Probar la función manualmente
-- =====================================================
SELECT 'PROBANDO CONSUMO DE LECHE...' as info;

-- Simular venta de 3 cafés (cada uno consume 37.7ml)
-- Total: 3 × 37.7 = 113.1ml
SELECT procesar_consumo_leche(
  999999, -- orden_id ficticio
  (SELECT id FROM articulos WHERE descripcion = 'Café de Prueba' LIMIT 1), -- articulo_id
  3, -- cantidad
  37.7 -- equivalencia_ml
) as resultado_consumo;

-- 5. Verificar resultados
-- =====================================================
SELECT 'RESULTADOS EN CONSUMO_LECHE:' as info;
SELECT * FROM consumo_leche WHERE fk_id_orden = 999999;

SELECT 'RESULTADOS EN CONTROL_ML_LECHE:' as info;
SELECT * FROM control_ml_leche;

SELECT 'STOCK ACTUAL DE LECHE:' as info;
SELECT descripcion, stock
FROM articulos
WHERE descripcion = 'Leche';

-- 6. Probar consumo mayor (para descontar stock)
-- =====================================================
SELECT 'PROBANDO CONSUMO MAYOR...' as info;

-- Simular venta de 30 cafés (30 × 37.7 = 1131ml)
-- Esto debería descontar 1 litro de leche
SELECT procesar_consumo_leche(
  999998, -- orden_id ficticio
  (SELECT id FROM articulos WHERE descripcion = 'Café de Prueba' LIMIT 1), -- articulo_id
  30, -- cantidad
  37.7 -- equivalencia_ml
) as resultado_consumo_mayor;

-- 7. Verificar resultados finales
-- =====================================================
SELECT 'RESULTADOS FINALES:' as info;

SELECT 'Total registros en consumo_leche:' as info, COUNT(*) as cantidad
FROM consumo_leche;

SELECT 'Control ML actual:' as info, *
FROM control_ml_leche;

SELECT 'Stock final de leche:' as info, stock
FROM articulos
WHERE descripcion = 'Leche';

-- 8. Limpiar datos de prueba (opcional)
-- =====================================================
-- Descomenta estas líneas si quieres limpiar los datos de prueba:

-- DELETE FROM consumo_leche WHERE fk_id_orden IN (999999, 999998);
-- DELETE FROM control_ml_leche;
-- DELETE FROM articulos WHERE descripcion IN ('Café de Prueba');
-- UPDATE articulos SET stock = 5 WHERE descripcion = 'Leche';
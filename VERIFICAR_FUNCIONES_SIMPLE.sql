-- =====================================================
-- VERIFICACIÓN RÁPIDA DE FUNCIONES Y DATOS
-- =====================================================

-- 1. Verificar que las funciones existen
SELECT
    routine_name as "Función",
    routine_type as "Tipo"
FROM information_schema.routines
WHERE routine_name IN ('calcular_stock_combo', 'actualizar_stock_todos_combos')
AND routine_schema = 'public';

-- 2. Verificar que los triggers existen
SELECT
    trigger_name as "Trigger",
    event_object_table as "Tabla"
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_stock_combos', 'trigger_componentes_stock');

-- 3. Verificar que la tabla articulos_combo_detalle existe
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'articulos_combo_detalle';

-- 4. Verificar que el campo es_combo existe en articulos
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'articulos' AND column_name = 'es_combo';

-- 5. Contar combos existentes
SELECT COUNT(*) as "Total Combos"
FROM articulos
WHERE es_combo = true;

-- 6. Contar componentes de combos
SELECT COUNT(*) as "Total Componentes"
FROM articulos_combo_detalle;

-- 7. Ver combos con sus componentes (si existen)
SELECT
    a.id as "ID Combo",
    a.descripcion as "Nombre Combo",
    a.stock as "Stock Actual",
    COUNT(acd.id) as "Cantidad Componentes"
FROM articulos a
LEFT JOIN articulos_combo_detalle acd ON a.id = acd.fk_articulo_combo
WHERE a.es_combo = true
GROUP BY a.id, a.descripcion, a.stock;

-- 8. Si hay combos, probar la función calcular_stock_combo
-- (Reemplaza el 1 por un ID real de combo)
-- SELECT calcular_stock_combo(1) as "Stock Calculado para Combo ID 1";

-- 9. Ver detalle de componentes de combos
SELECT
    combo.descripcion as "Combo",
    comp.descripcion as "Componente",
    acd.cantidad as "Cantidad Necesaria",
    comp.stock as "Stock Disponible",
    FLOOR(comp.stock / acd.cantidad) as "Combos Posibles"
FROM articulos_combo_detalle acd
JOIN articulos combo ON acd.fk_articulo_combo = combo.id
JOIN articulos comp ON acd.fk_articulo_componente = comp.id
ORDER BY combo.descripcion, comp.descripcion;
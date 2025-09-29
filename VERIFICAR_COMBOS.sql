-- =====================================================
-- SCRIPT PARA VERIFICAR LA CONFIGURACIÓN DE COMBOS
-- =====================================================

-- Verificar que el campo es_combo existe en la tabla articulos
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'articulos' AND column_name = 'es_combo';

-- Verificar que la tabla articulos_combo_detalle existe
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'articulos_combo_detalle'
ORDER BY ordinal_position;

-- Verificar constraints de la tabla
SELECT
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'articulos_combo_detalle';

-- Verificar si hay artículos marcados como combo
SELECT id, descripcion, es_combo, precio_unitario, stock
FROM articulos
WHERE es_combo = true;

-- Verificar si hay registros en articulos_combo_detalle
SELECT
    acd.*,
    combo.descripcion as combo_descripcion,
    componente.descripcion as componente_descripcion
FROM articulos_combo_detalle acd
LEFT JOIN articulos combo ON acd.fk_articulo_combo = combo.id
LEFT JOIN articulos componente ON acd.fk_articulo_componente = componente.id;

-- Probar inserción manual de un combo de prueba
/*
-- Insertar artículo combo de prueba
INSERT INTO articulos (descripcion, precio_unitario, fk_id_agrupador, activo, stock, stock_minimo, equivalencia, es_combo)
VALUES ('Combo Test', 500.00, 1, true, 10, 1, 0, true);

-- Obtener el ID del combo recién insertado
SELECT id FROM articulos WHERE descripcion = 'Combo Test' AND es_combo = true;

-- Insertar componentes del combo (usando IDs de artículos existentes)
-- NOTA: Cambiar los IDs por artículos que existan en tu base de datos
INSERT INTO articulos_combo_detalle (fk_articulo_combo, fk_articulo_componente, cantidad)
VALUES
    ((SELECT id FROM articulos WHERE descripcion = 'Combo Test'), 1, 1), -- Artículo ID 1
    ((SELECT id FROM articulos WHERE descripcion = 'Combo Test'), 2, 2); -- Artículo ID 2
*/
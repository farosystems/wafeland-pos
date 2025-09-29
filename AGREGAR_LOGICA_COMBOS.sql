-- =====================================================
-- SCRIPT PARA AGREGAR LÓGICA DE COMBOS
-- =====================================================
-- Este script agrega la funcionalidad de combos al sistema
-- Un combo es un artículo que está compuesto por otros artículos
-- Cuando se vende un combo, se descuenta el stock de los artículos relacionados
-- =====================================================

-- 1. Agregar campo es_combo a la tabla articulos
ALTER TABLE public.articulos
ADD COLUMN es_combo boolean DEFAULT false NOT NULL;

-- 2. Crear tabla para relacionar combos con sus artículos componentes
CREATE TABLE public.articulos_combo_detalle (
    id SERIAL PRIMARY KEY,
    fk_articulo_combo integer NOT NULL REFERENCES public.articulos(id) ON DELETE CASCADE,
    fk_articulo_componente integer NOT NULL REFERENCES public.articulos(id) ON DELETE CASCADE,
    cantidad numeric(10,2) NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT articulos_combo_detalle_cantidad_positiva CHECK (cantidad > 0),
    CONSTRAINT articulos_combo_detalle_no_autoreferencia CHECK (fk_articulo_combo != fk_articulo_componente),
    CONSTRAINT articulos_combo_detalle_unique UNIQUE (fk_articulo_combo, fk_articulo_componente)
);

-- 3. Crear índices para mejor performance
CREATE INDEX idx_articulos_combo_detalle_combo ON public.articulos_combo_detalle(fk_articulo_combo);
CREATE INDEX idx_articulos_combo_detalle_componente ON public.articulos_combo_detalle(fk_articulo_componente);
CREATE INDEX idx_articulos_es_combo ON public.articulos(es_combo) WHERE es_combo = true;

-- 4. Agregar comentarios para documentación
COMMENT ON COLUMN public.articulos.es_combo IS 'Indica si el artículo es un combo compuesto por otros artículos';
COMMENT ON TABLE public.articulos_combo_detalle IS 'Detalle de los artículos que componen un combo';
COMMENT ON COLUMN public.articulos_combo_detalle.fk_articulo_combo IS 'ID del artículo combo principal';
COMMENT ON COLUMN public.articulos_combo_detalle.fk_articulo_componente IS 'ID del artículo componente del combo';
COMMENT ON COLUMN public.articulos_combo_detalle.cantidad IS 'Cantidad del artículo componente incluida en el combo';

-- =====================================================
-- VERIFICACIONES
-- =====================================================

-- Verificar que el campo es_combo se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'articulos' AND column_name = 'es_combo';

-- Verificar que la tabla articulos_combo_detalle se creó correctamente
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'articulos_combo_detalle'
ORDER BY ordinal_position;

-- Verificar los constraints
SELECT
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name IN ('articulos_combo_detalle', 'articulos')
AND constraint_type IN ('CHECK', 'UNIQUE', 'FOREIGN KEY');

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

-- Ejemplo 1: Crear un combo "Desayuno Completo"
-- Primero insertar el artículo combo
/*
INSERT INTO public.articulos (nombre, precio, stock, es_combo, descripcion) VALUES
('Desayuno Completo', 850.00, 50, true, 'Combo: Café + Tostadas + Mermelada');

-- Luego agregar los componentes del combo (asumiendo que existen los artículos)
INSERT INTO public.articulos_combo_detalle (fk_articulo_combo, fk_articulo_componente, cantidad) VALUES
((SELECT id FROM articulos WHERE nombre = 'Desayuno Completo'), (SELECT id FROM articulos WHERE nombre = 'Café'), 1),
((SELECT id FROM articulos WHERE nombre = 'Desayuno Completo'), (SELECT id FROM articulos WHERE nombre = 'Tostadas'), 2),
((SELECT id FROM articulos WHERE nombre = 'Desayuno Completo'), (SELECT id FROM articulos WHERE nombre = 'Mermelada'), 1);
*/

-- =====================================================
-- CONSULTAS ÚTILES PARA EL DESARROLLO
-- =====================================================

-- Ver todos los combos con sus componentes
/*
SELECT
    combo.id as combo_id,
    combo.nombre as combo_nombre,
    combo.precio as combo_precio,
    componente.id as componente_id,
    componente.nombre as componente_nombre,
    detalle.cantidad as cantidad_componente,
    componente.stock as stock_disponible
FROM articulos combo
JOIN articulos_combo_detalle detalle ON combo.id = detalle.fk_articulo_combo
JOIN articulos componente ON detalle.fk_articulo_componente = componente.id
WHERE combo.es_combo = true
ORDER BY combo.nombre, componente.nombre;
*/

-- Verificar stock disponible para un combo específico
/*
SELECT
    combo.nombre as combo,
    MIN(FLOOR(componente.stock / detalle.cantidad)) as combos_disponibles
FROM articulos combo
JOIN articulos_combo_detalle detalle ON combo.id = detalle.fk_articulo_combo
JOIN articulos componente ON detalle.fk_articulo_componente = componente.id
WHERE combo.es_combo = true AND combo.id = ?
GROUP BY combo.id, combo.nombre;
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
--
-- 1. El campo es_combo indica si un artículo es un combo
-- 2. La tabla articulos_combo_detalle relaciona combos con sus componentes
-- 3. El campo cantidad permite especificar cuántas unidades de cada componente incluye el combo
-- 4. Cuando se venda un combo, se debe:
--    - Descontar 1 del stock del combo principal
--    - Descontar la cantidad correspondiente del stock de cada componente
-- 5. Antes de vender un combo, verificar que hay stock suficiente de todos los componentes
-- 6. Un artículo no puede ser componente de sí mismo (constraint)
-- 7. No puede haber duplicados en la relación combo-componente (constraint unique)
-- 8. La cantidad de componentes debe ser positiva
-- 9. Se recomienda crear triggers o funciones para automatizar el descuento de stock
-- 10. En el frontend, mostrar los componentes del combo en el formulario de alta
--
-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
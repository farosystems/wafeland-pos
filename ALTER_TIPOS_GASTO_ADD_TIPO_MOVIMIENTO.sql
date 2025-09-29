-- =====================================================
-- SCRIPT PARA AGREGAR CAMPO TIPO_MOVIMIENTO A TIPOS DE GASTO
-- =====================================================
-- Este script agrega el campo tipo_movimiento a la tabla tipo_gasto
-- para diferenciar entre ingresos y egresos
-- =====================================================

-- 1. Agregar el campo tipo_movimiento con constraint
ALTER TABLE public.tipo_gasto
ADD COLUMN tipo_movimiento text CHECK (tipo_movimiento = ANY (ARRAY['ingreso'::text, 'egreso'::text]));

-- =====================================================
-- COMENTARIOS EN LA COLUMNA
-- =====================================================

COMMENT ON COLUMN public.tipo_gasto.tipo_movimiento
IS 'Define si el tipo de gasto es un ingreso o egreso. Valores permitidos: ingreso, egreso';

-- =====================================================
-- DATOS INICIALES OPCIONALES
-- =====================================================
-- Puedes descomentar estas líneas para actualizar registros existentes

-- Ejemplos de actualización para tipos existentes:
-- UPDATE public.tipo_gasto SET tipo_movimiento = 'egreso' WHERE descripcion ILIKE '%gasto%' OR descripcion ILIKE '%pago%';
-- UPDATE public.tipo_gasto SET tipo_movimiento = 'ingreso' WHERE descripcion ILIKE '%ingreso%' OR descripcion ILIKE '%cobro%';

-- =====================================================
-- VERIFICACIÓN DE LA MODIFICACIÓN
-- =====================================================

-- Verificar que se agregó la columna correctamente
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    check_clause
FROM information_schema.columns
LEFT JOIN (
    SELECT
        conname,
        pg_get_constraintdef(c.oid) as check_clause
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'tipo_gasto' AND c.contype = 'c'
) constraints ON constraints.conname LIKE '%tipo_movimiento%'
WHERE table_name = 'tipo_gasto'
ORDER BY ordinal_position;

-- =====================================================
-- VER ESTRUCTURA COMPLETA DE LA TABLA
-- =====================================================

-- Mostrar todos los registros con el nuevo campo
SELECT
    id,
    descripcion,
    tipo_movimiento,
    obliga_empleado,
    afecta_caja
FROM public.tipo_gasto
ORDER BY id;

-- =====================================================
-- CONTEO POR TIPO DE MOVIMIENTO
-- =====================================================

-- Estadísticas de tipos de movimiento
SELECT
    tipo_movimiento,
    COUNT(*) as cantidad
FROM public.tipo_gasto
GROUP BY tipo_movimiento
ORDER BY tipo_movimiento;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
--
-- 1. El campo tipo_movimiento permite valores: 'ingreso' o 'egreso'
-- 2. El campo puede ser NULL para tipos que no se han categorizado aún
-- 3. Se incluye un constraint CHECK para validar los valores
-- 4. Los registros existentes mantendrán valor NULL hasta ser actualizados
-- 5. En el frontend se muestra "No definido" cuando el valor es NULL
-- 6. Los colores en el frontend:
--    - Verde: Ingreso (bg-green-100 text-green-800)
--    - Rojo: Egreso (bg-red-100 text-red-800)
--    - Gris: No definido (bg-gray-100 text-gray-800)
--
-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
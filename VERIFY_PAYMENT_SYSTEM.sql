-- =====================================================
-- VERIFICACIÓN DEL SISTEMA DE PAGOS
-- =====================================================
-- Este script verifica que el sistema de pagos esté correctamente configurado
-- =====================================================

-- 1. Verificar que existe la tabla cuentas_tesoreria
SELECT 'Tabla cuentas_tesoreria existe' as verificacion, COUNT(*) as registros
FROM public.cuentas_tesoreria;

-- 2. Verificar que existe la tabla pagos_cuenta_corriente con el FK correcto
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pagos_cuenta_corriente'
  AND column_name = 'fk_id_cuenta_tesoreria';

-- 3. Verificar que existe la foreign key entre pagos_cuenta_corriente y cuentas_tesoreria
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'pagos_cuenta_corriente'
  AND kcu.column_name = 'fk_id_cuenta_tesoreria';

-- 4. Verificar métodos de pago existentes
SELECT id, descripcion, activo
FROM public.cuentas_tesoreria
ORDER BY id;

-- 5. Verificar estructura completa de pagos_cuenta_corriente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pagos_cuenta_corriente'
ORDER BY ordinal_position;

-- =====================================================
-- RESULTADOS ESPERADOS:
-- =====================================================
-- 1. La tabla cuentas_tesoreria debe existir con al menos 1 registro
-- 2. La columna fk_id_cuenta_tesoreria debe existir en pagos_cuenta_corriente
-- 3. Debe existir la foreign key constraint
-- 4. Deben existir métodos de pago como 'Efectivo', 'Tarjeta de Débito', etc.
-- 5. La tabla pagos_cuenta_corriente debe tener todas las columnas necesarias
-- =====================================================
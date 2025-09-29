-- =====================================================
-- SCRIPT DE INSERCIÓN DEL MÓDULO TIPOS DE GASTO
-- =====================================================
-- Este script agrega el módulo "Tipos de Movimientos" dentro de Tesorería
-- Ejecutar después de haber creado las tablas y otros módulos
-- =====================================================

-- Insertar el nuevo módulo TIPOS_GASTO en la tabla modulos
-- Orden 12 para que aparezca entre CAJA (11) y GASTOS_EMPLEADOS (13)
INSERT INTO public.modulos (nombre, descripcion, icono, ruta, orden, activo) VALUES
('TIPOS_GASTO', 'Tipos de Movimientos', 'Receipt', '/tipos-gasto', 12, true);

-- =====================================================
-- VERIFICACIÓN DE INSERCIÓN
-- =====================================================

-- Verificar que el módulo se insertó correctamente
SELECT
    id,
    nombre,
    descripcion,
    icono,
    ruta,
    orden,
    activo,
    creado_el
FROM public.modulos
WHERE nombre = 'TIPOS_GASTO';

-- =====================================================
-- VERIFICACIÓN COMPLETA DE MÓDULOS DE TESORERÍA
-- =====================================================

-- Ver todos los módulos relacionados con Tesorería
SELECT
    id,
    nombre,
    descripcion,
    ruta,
    orden,
    activo
FROM public.modulos
WHERE nombre IN ('CAJA', 'GASTOS_EMPLEADOS', 'TIPOS_GASTO')
ORDER BY orden;

-- =====================================================
-- CONTEO TOTAL DE MÓDULOS
-- =====================================================

SELECT
    COUNT(*) as total_modulos,
    COUNT(CASE WHEN activo = true THEN 1 END) as modulos_activos,
    COUNT(CASE WHEN activo = false THEN 1 END) as modulos_inactivos
FROM public.modulos;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
--
-- 1. Este módulo permite gestionar los tipos de movimientos del sistema
-- 2. Ha sido movido desde "Movimientos del día" para tener su propio espacio
-- 3. Se encuentra dentro del menú de Tesorería en el frontend
-- 4. La funcionalidad incluye:
--    - Crear nuevos tipos de movimientos
--    - Editar tipos existentes
--    - Eliminar tipos de movimientos
--    - Configurar si son ingresos o egresos
--    - Configurar si obliga seleccionar empleado
--    - Configurar si afecta la caja
-- 5. La ruta es: /tipos-gasto
-- 6. El icono utilizado es 'Receipt'
-- 7. El orden asignado es 12 para que aparezca antes de "Movimientos del día"
--
-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
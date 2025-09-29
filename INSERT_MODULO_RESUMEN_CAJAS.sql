-- =====================================================
-- SCRIPT DE INSERCIÓN DEL MÓDULO RESUMEN DE CAJAS
-- =====================================================
-- Este script agrega el módulo "Resumen de Cajas" dentro de Tesorería
-- Ejecutar después de haber creado las tablas y otros módulos
-- =====================================================

-- Insertar el nuevo módulo RESUMEN_CAJAS en la tabla modulos
-- Orden 14 para que aparezca después de "Movimientos del día" (13)
INSERT INTO public.modulos (nombre, descripcion, icono, ruta, orden, activo) VALUES
('RESUMEN_CAJAS', 'Resumen de Cajas', 'BarChart3', '/resumen-cajas', 14, true);

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
WHERE nombre = 'RESUMEN_CAJAS';

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
WHERE nombre IN ('CAJA', 'TIPOS_GASTO', 'GASTOS_EMPLEADOS', 'RESUMEN_CAJAS')
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
-- 1. Este módulo permite ver un resumen completo de todas las cajas del sistema
-- 2. Analiza todos los movimientos registrados en detalle_lotes_operaciones
-- 3. Se encuentra dentro del menú de Tesorería en el frontend
-- 4. La funcionalidad incluye:
--    - Cards de resumen general (Total Ingresos, Egresos, Balance, Cantidad)
--    - Cards por tipo de movimiento con totales agrupados
--    - Tabla detallada de todos los movimientos
--    - Filtros por rango de fechas
--    - Filtros por tipo de movimiento (ingreso/egreso)
--    - Filtros por búsqueda de texto
--    - Paginación de resultados
--    - Indicadores visuales por tipo
--    - Información de cajas y lotes
-- 5. La ruta es: /resumen-cajas
-- 6. El icono utilizado es 'BarChart3'
-- 7. El orden asignado es 14 para que aparezca después de "Movimientos del día"
-- 8. Los datos se obtienen mediante joins complejos entre:
--    - detalle_lotes_operaciones (movimientos)
--    - lotes_operaciones (información de lotes)
--    - cajas (información de cajas)
--    - cuentas_tesoreria (cuentas asociadas)
--    - gastos_empleados (para obtener tipos de gasto)
--    - tipo_gasto (para clasificación ingreso/egreso)
-- 9. Las consultas están optimizadas para manejar filtros de fecha
-- 10. Se incluye manejo de errores para consultas complejas
--
-- =====================================================
-- ESTRUCTURA FINAL DEL MENÚ TESORERÍA
-- =====================================================
--
-- Tesorería
-- ├── Cajas (orden 11)
-- ├── Tipos de Movimientos (orden 12)
-- ├── Movimientos del día (orden 13)
-- └── Resumen de Cajas (orden 14) ← NUEVO MÓDULO
--
-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
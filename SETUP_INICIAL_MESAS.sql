-- =====================================================
-- SETUP INICIAL PARA MÓDULO DE MESAS
-- =====================================================
-- Este script configura los datos básicos necesarios
-- para el funcionamiento del módulo de mesas
-- =====================================================

-- 1. Insertar el módulo de mesas (si no existe)
INSERT INTO public.modulos (nombre, descripcion, icono, ruta, activo, orden)
VALUES ('mesas', 'Gestión de Mesas del Local', 'table', '/mesas', true, 15)
ON CONFLICT (nombre) DO NOTHING;

-- 2. Asignar permisos automáticamente por rol
-- ADMINISTRADORES: Acceso completo
INSERT INTO public.permisos_usuarios (fk_id_usuario, fk_id_modulo, puede_ver)
SELECT 
    u.id as fk_id_usuario,
    m.id as fk_id_modulo,
    true as puede_ver
FROM public.usuarios u
CROSS JOIN public.modulos m
WHERE u.rol = 'admin' 
  AND m.nombre = 'mesas'
  AND NOT EXISTS (
    SELECT 1 FROM public.permisos_usuarios pu 
    WHERE pu.fk_id_usuario = u.id 
      AND pu.fk_id_modulo = m.id
  );

-- SUPERVISORES: Acceso completo también
INSERT INTO public.permisos_usuarios (fk_id_usuario, fk_id_modulo, puede_ver)
SELECT 
    u.id as fk_id_usuario,
    m.id as fk_id_modulo,
    true as puede_ver
FROM public.usuarios u
CROSS JOIN public.modulos m
WHERE u.rol = 'supervisor' 
  AND m.nombre = 'mesas'
  AND NOT EXISTS (
    SELECT 1 FROM public.permisos_usuarios pu 
    WHERE pu.fk_id_usuario = u.id 
      AND pu.fk_id_modulo = m.id
  );

-- 3. Insertar entidad "Consumidor Final" si no existe
INSERT INTO public.entidades (razon_social, tipo, categoria_iva)
VALUES ('Consumidor Final', 'cliente', 'Consumidor Final')
ON CONFLICT DO NOTHING;

-- 4. Insertar cuenta de tesorería "Efectivo" si no existe
INSERT INTO public.cuentas_tesoreria (descripcion, activo)
VALUES ('Efectivo', true)
ON CONFLICT DO NOTHING;

-- 5. Verificar que existe tipo de comprobante "Factura"
INSERT INTO public.tipos_comprobantes (descripcion, descuenta_stock, reingresa_stock, imprime_pdf, activo)
VALUES ('Factura', true, false, true, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================
-- Descomenta las siguientes líneas si quieres datos de prueba

/*
-- Insertar algunas mesas de ejemplo
INSERT INTO public.mesas (numero, descripcion, capacidad, posicion_x, posicion_y, activo) VALUES
('1', 'Mesa junto a ventana principal', 4, 50, 50, true),
('2', 'Mesa central salon', 6, 200, 100, true),
('3', 'Mesa terraza', 2, 350, 150, true),
('VIP-1', 'Mesa VIP reservada', 8, 100, 200, true),
('A1', 'Mesa salon A1', 4, 250, 250, true),
('B1', 'Mesa salon B1', 4, 400, 100, true)
ON CONFLICT (numero) DO NOTHING;
*/

-- =====================================================
-- VERIFICAR INSTALACIÓN
-- =====================================================

-- Mostrar el módulo insertado
SELECT 
    'Módulo instalado:' as resultado,
    m.id,
    m.nombre,
    m.descripcion,
    m.activo
FROM public.modulos m
WHERE m.nombre = 'mesas';

-- Mostrar usuarios con permisos del módulo
SELECT 
    'Permisos asignados:' as resultado,
    u.nombre as usuario,
    u.rol,
    'SÍ' as acceso_mesas
FROM public.usuarios u
INNER JOIN public.permisos_usuarios pu ON u.id = pu.fk_id_usuario
INNER JOIN public.modulos m ON pu.fk_id_modulo = m.id
WHERE m.nombre = 'mesas'
ORDER BY u.rol, u.nombre;

-- Mostrar entidades necesarias
SELECT 
    'Entidades configuradas:' as resultado,
    razon_social,
    tipo,
    categoria_iva
FROM public.entidades 
WHERE razon_social = 'Consumidor Final' OR tipo = 'cliente';

-- Mostrar cuentas de tesorería
SELECT 
    'Cuentas tesorería:' as resultado,
    descripcion,
    activo
FROM public.cuentas_tesoreria 
WHERE descripcion IN ('Efectivo');

-- Mostrar tipos de comprobantes
SELECT 
    'Tipos comprobantes:' as resultado,
    descripcion,
    descuenta_stock,
    activo
FROM public.tipos_comprobantes 
WHERE descripcion = 'Factura';

-- =====================================================
-- NOTAS DE INSTALACIÓN
-- =====================================================

/*
DESPUÉS DE EJECUTAR ESTE SCRIPT:

1. Verificar que todas las consultas de verificación devolvieron resultados

2. El módulo "Mesas" aparecerá en el sidebar para admin/supervisores

3. Se pueden crear las primeras mesas desde el panel "Gestionar Mesas"

4. Para usar el sistema completo necesitas:
   - Al menos un lote de operaciones abierto
   - Productos activos en la tabla articulos
   - Usuario autenticado con permisos

5. Flujo típico:
   - Crear mesas físicas del local
   - Abrir mesa con comensales
   - Agregar productos al pedido
   - Cerrar mesa cuando terminan
   - Procesar cobro (genera orden de venta)
   - Generar/imprimir ticket

PROBLEMAS COMUNES:
- "No hay lote abierto": Crear lote desde módulo Cajas
- "No se encuentran productos": Verificar tabla articulos tiene productos activos
- "Error de permisos": Verificar permisos_usuarios tiene acceso al módulo 'mesas'
*/
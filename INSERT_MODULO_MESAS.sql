-- =====================================================
-- INSERTAR MÓDULO DE MESAS EN EL SISTEMA
-- =====================================================
-- Este script agrega el módulo de mesas a la tabla de módulos
-- y asigna permisos básicos por rol
-- =====================================================

-- 1. Insertar el módulo de mesas
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

-- 3. SUPERVISORES: Acceso completo también
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

-- 4. COBRADORES: Sin acceso por defecto (se puede habilitar individualmente)
-- Los cobradores normalmente no necesitan gestionar mesas,
-- pero se puede otorgar el permiso caso por caso desde el panel de seguridad

-- =====================================================
-- VERIFICAR RESULTADOS
-- =====================================================

-- Mostrar el módulo insertado
SELECT 
    id,
    nombre,
    descripcion,
    icono,
    ruta,
    activo,
    orden,
    creado_el
FROM public.modulos 
WHERE nombre = 'mesas';

-- Mostrar usuarios con permisos del módulo
SELECT 
    u.nombre as usuario,
    u.email,
    u.rol,
    pu.puede_ver,
    pu.creado_el as permiso_creado
FROM public.usuarios u
INNER JOIN public.permisos_usuarios pu ON u.id = pu.fk_id_usuario
INNER JOIN public.modulos m ON pu.fk_id_modulo = m.id
WHERE m.nombre = 'mesas'
ORDER BY u.rol, u.nombre;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
/*
1. El módulo se inserta con orden 15 para aparecer cerca del inicio del menú

2. Solo administradores y supervisores reciben permisos automáticamente

3. Los cobradores pueden recibir permisos individualmente desde:
   - Panel de Seguridad > Seguridad por Usuario
   - Seleccionar usuario > Marcar "Gestión de Mesas del Local"

4. El nombre del módulo 'mesas' debe coincidir exactamente con el usado 
   en el código: isModuloPermitido('mesas')

5. Si necesitas cambiar el orden de aparición en el menú, 
   actualiza el campo 'orden' con un valor diferente
*/
-- =====================================================
-- ACTUALIZAR PERMISOS DE USUARIOS SUPERVISORES
-- =====================================================

-- Este script actualiza los permisos de los usuarios supervisores existentes
-- para que respeten la configuración de módulos en lugar de tener acceso completo

-- Primero, eliminar todos los permisos existentes de usuarios supervisores
DELETE FROM permisos_usuarios 
WHERE fk_id_usuario IN (
  SELECT id FROM usuarios WHERE rol = 'supervisor'
);

-- Luego, crear nuevos permisos específicos para supervisores
INSERT INTO permisos_usuarios (fk_id_usuario, fk_id_modulo, puede_ver)
SELECT 
  u.id,
  m.id,
  CASE 
    WHEN m.nombre IN ('dashboard', 'articulos', 'clientes', 'ventas', 'mis-ventas', 'movimientos-stock', 'importacion-stock', 'stock-faltante', 'agrupadores', 'empleados', 'liquidaciones', 'caja', 'gastos-empleados', 'pagos', 'cuentas-corrientes', 'informes') THEN true
    ELSE false
  END
FROM usuarios u
CROSS JOIN modulos m
WHERE u.rol = 'supervisor' 
  AND m.activo = true;

-- Verificar los cambios
SELECT 
  u.nombre as usuario,
  u.rol,
  m.nombre as modulo,
  pu.puede_ver
FROM usuarios u
JOIN permisos_usuarios pu ON u.id = pu.fk_id_usuario
JOIN modulos m ON pu.fk_id_modulo = m.id
WHERE u.rol = 'supervisor'
ORDER BY u.nombre, m.orden;

-- =====================================================
-- ¡LISTO! PERMISOS DE SUPERVISORES ACTUALIZADOS
-- =====================================================

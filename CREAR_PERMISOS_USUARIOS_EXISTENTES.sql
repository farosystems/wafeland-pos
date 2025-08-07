-- 👥 CREAR PERMISOS POR DEFECTO PARA USUARIOS EXISTENTES

-- Crear permisos por defecto para usuarios existentes basados en su rol
INSERT INTO permisos_usuarios (fk_id_usuario, fk_id_modulo, puede_ver)
SELECT 
  u.id,
  m.id,
  CASE 
    WHEN u.rol = 'admin' THEN true
    WHEN u.rol = 'supervisor' THEN true
    WHEN u.rol = 'vendedor' THEN m.nombre IN ('dashboard', 'articulos', 'clientes', 'ventas', 'mis-ventas', 'movimientos-stock', 'importacion-stock', 'stock-faltante', 'talles-colores', 'variantes-productos', 'agrupadores', 'informes')
    WHEN u.rol = 'cobrador' THEN m.nombre IN ('dashboard', 'ventas', 'mis-ventas', 'pagos', 'cuentas-corrientes', 'caja', 'informes')
    ELSE false
  END
FROM usuarios u
CROSS JOIN modulos m
WHERE m.activo = true
AND NOT EXISTS (
  SELECT 1 FROM permisos_usuarios pu 
  WHERE pu.fk_id_usuario = u.id AND pu.fk_id_modulo = m.id
);

-- Verificar que se crearon los permisos correctamente
SELECT 
  u.nombre as usuario,
  u.rol,
  COUNT(pu.id) as total_permisos,
  COUNT(CASE WHEN pu.puede_ver = true THEN 1 END) as modulos_habilitados
FROM usuarios u
LEFT JOIN permisos_usuarios pu ON u.id = pu.fk_id_usuario
GROUP BY u.id, u.nombre, u.rol
ORDER BY u.nombre; 
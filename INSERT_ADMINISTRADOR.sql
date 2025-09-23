-- =====================================================
-- INSERT PARA USUARIO ADMINISTRADOR - SISTEMA POS
-- =====================================================
-- Ejecutar DESPUÉS de crear todas las tablas del sistema
-- =====================================================

-- =====================================================
-- 1. CREAR USUARIO ADMINISTRADOR
-- =====================================================

-- IMPORTANTE: Reemplaza los valores con los datos reales del administrador
INSERT INTO usuarios (nombre, email, rol, clerk_user_id) 
VALUES (
  'administrador',           -- nombre
  'admin@empresa.com',       -- email (reemplazar con email real)
  'admin',                   -- rol
  'user_admin_clerk_id'      -- clerk_user_id (reemplazar con ID real de Clerk)
);

-- =====================================================
-- 2. CREAR PERMISOS COMPLETOS PARA EL ADMINISTRADOR
-- =====================================================

-- Obtener el ID del usuario administrador recién creado
-- (asumiendo que es el primer usuario o el ID 1)
INSERT INTO permisos_usuarios (fk_id_usuario, fk_id_modulo, puede_ver)
SELECT 
  1, -- ID del usuario administrador (ajustar si es diferente)
  m.id,
  true,  -- puede_ver
  true,  -- puede_crear
  true,  -- puede_editar
  true   -- puede_eliminar
FROM modulos m
WHERE m.activo = true;

-- =====================================================
-- 3. VERIFICACIÓN DE PERMISOS CREADOS
-- =====================================================

-- Verificar que el usuario administrador se creó correctamente
SELECT 
  id,
  nombre,
  email,
  rol,
  creado_el
FROM usuarios 
WHERE rol = 'admin'
ORDER BY id;

-- Verificar todos los permisos del administrador
SELECT 
  u.nombre as usuario,
  m.nombre as modulo,
  m.descripcion,
  pu.puede_ver,
  pu.puede_crear,
  pu.puede_editar,
  pu.puede_eliminar
FROM permisos_usuarios pu
JOIN usuarios u ON pu.fk_id_usuario = u.id
JOIN modulos m ON pu.fk_id_modulo = m.id
WHERE u.rol = 'admin'
ORDER BY m.orden;

-- =====================================================
-- 4. ALTERNATIVA: CREAR ADMINISTRADOR CON ID ESPECÍFICO
-- =====================================================

-- Si necesitas crear el administrador con un ID específico:
/*
INSERT INTO usuarios (id, nombre, email, rol, clerk_user_id) 
VALUES (
  1,                        -- ID específico
  'Administrador',          
  'admin@empresa.com',      
  'admin',                  
  'user_admin_clerk_id'     
);

-- Luego crear los permisos:
INSERT INTO permisos_usuarios (fk_id_usuario, fk_id_modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT 
  1, -- ID específico del administrador
  m.id,
  true, true, true, true
FROM modulos m
WHERE m.activo = true;
*/

-- =====================================================
-- 5. CREAR MÚLTIPLES ADMINISTRADORES (OPCIONAL)
-- =====================================================

-- Para crear múltiples administradores:
/*
INSERT INTO usuarios (nombre, email, rol, clerk_user_id) VALUES
('Admin Principal', 'admin@empresa.com', 'admin', 'user_admin1_clerk_id'),
('Admin Secundario', 'admin2@empresa.com', 'admin', 'user_admin2_clerk_id');

-- Crear permisos para todos los administradores:
INSERT INTO permisos_usuarios (fk_id_usuario, fk_id_modulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT 
  u.id,
  m.id,
  true, true, true, true
FROM usuarios u
CROSS JOIN modulos m
WHERE u.rol = 'admin' 
AND m.activo = true;
*/

-- =====================================================
-- ¡LISTO! ADMINISTRADOR CREADO CON PERMISOS COMPLETOS
-- =====================================================


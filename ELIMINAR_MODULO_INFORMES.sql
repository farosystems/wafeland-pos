-- 🗑️ ELIMINAR MÓDULO INFORMES NO UTILIZADO

-- Eliminar permisos asociados al módulo informes
DELETE FROM public.permisos_usuarios 
WHERE fk_id_modulo = (SELECT id FROM public.modulos WHERE nombre = 'informes');

-- Eliminar el módulo informes
DELETE FROM public.modulos 
WHERE nombre = 'informes';

-- Verificar que se eliminó correctamente
SELECT * FROM public.modulos ORDER BY orden; 
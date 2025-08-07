-- 🔧 CORREGIR ORDEN DE MÓDULOS - SISTEMA POS

-- Corregir el orden de los módulos para que coincida con el ID
-- El módulo "informes" tiene id=20 pero orden=18, debe ser orden=20
-- El módulo "usuarios" tiene id=18 pero orden=19, debe ser orden=18

UPDATE public.modulos 
SET orden = 20 
WHERE nombre = 'informes' AND id = 20;

UPDATE public.modulos 
SET orden = 18 
WHERE nombre = 'usuarios' AND id = 18;

-- Verificar que el orden sea secuencial
UPDATE public.modulos 
SET orden = id 
WHERE orden != id;

-- Verificar el resultado
SELECT id, nombre, orden, descripcion 
FROM public.modulos 
ORDER BY orden; 
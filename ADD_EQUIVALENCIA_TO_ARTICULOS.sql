-- =====================================================
-- AGREGAR CAMPO EQUIVALENCIA A TABLA ARTICULOS
-- =====================================================
-- Este script agrega el campo 'equivalencia' de tipo float
-- a la tabla de artículos
-- =====================================================

-- Agregar columna equivalencia a la tabla articulos
ALTER TABLE public.articulos
ADD COLUMN IF NOT EXISTS equivalencia numeric DEFAULT 1.0;

-- Agregar comentario a la columna
COMMENT ON COLUMN public.articulos.equivalencia IS 'Factor de equivalencia para conversiones de unidades';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'articulos' AND column_name = 'equivalencia';
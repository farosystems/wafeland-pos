-- =====================================================
-- SCRIPT PARA AGREGAR CAMPO STOCK_MINIMO A ARTÍCULOS
-- =====================================================
-- Este script agrega el campo stock_minimo a la tabla de artículos existente
-- Ejecutar en la base de datos para actualizar la estructura
-- =====================================================

-- Agregar columna stock_minimo a la tabla articulos
ALTER TABLE public.articulos 
ADD COLUMN stock_minimo numeric DEFAULT 0;

-- Comentario para documentar el cambio
COMMENT ON COLUMN public.articulos.stock_minimo IS 'Cantidad mínima de stock para alertar cuando el stock esté bajo';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'articulos' AND column_name = 'stock_minimo';

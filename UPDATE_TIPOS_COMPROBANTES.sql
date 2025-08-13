-- =====================================================
-- SCRIPT PARA ACTUALIZAR TABLA TIPOS_COMPROBANTES
-- =====================================================
-- Este script agrega las columnas faltantes a la tabla tipos_comprobantes
-- para que coincida con la estructura esperada por el código
-- =====================================================

-- Agregar columnas faltantes a la tabla tipos_comprobantes
ALTER TABLE public.tipos_comprobantes
ADD COLUMN descuenta_stock boolean DEFAULT false,
ADD COLUMN imprime_pdf boolean DEFAULT true,
ADD COLUMN creado_el timestamp with time zone DEFAULT now();

-- Comentarios para documentar los cambios
COMMENT ON COLUMN public.tipos_comprobantes.descuenta_stock IS 'Indica si el tipo de comprobante descuenta stock al generar';
COMMENT ON COLUMN public.tipos_comprobantes.imprime_pdf IS 'Indica si el tipo de comprobante imprime PDF';
COMMENT ON COLUMN public.tipos_comprobantes.creado_el IS 'Fecha y hora de creación del tipo de comprobante';

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tipos_comprobantes'
ORDER BY ordinal_position;

-- Actualizar registros existentes con valores por defecto
UPDATE public.tipos_comprobantes
SET 
  descuenta_stock = CASE 
    WHEN descripcion ILIKE '%factura%' OR descripcion ILIKE '%ticket%' THEN true
    ELSE false
  END,
  imprime_pdf = CASE 
    WHEN descripcion ILIKE '%factura%' THEN true
    ELSE false
  END,
  creado_el = COALESCE(creado_el, now())
WHERE descuenta_stock IS NULL OR imprime_pdf IS NULL;

-- Mostrar la estructura final de la tabla
SELECT 
  'tipos_comprobantes' as tabla,
  COUNT(*) as total_registros
FROM public.tipos_comprobantes;

-- Mostrar los tipos de comprobantes existentes
SELECT 
  id,
  descripcion,
  descuenta_stock,
  reingresa_stock,
  imprime_pdf,
  activo,
  creado_el
FROM public.tipos_comprobantes
ORDER BY id;

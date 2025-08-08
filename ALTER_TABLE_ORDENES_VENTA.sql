-- Agregar campo anulada a la tabla ordenes_venta
ALTER TABLE public.ordenes_venta 
ADD COLUMN anulada BOOLEAN DEFAULT FALSE;

-- Crear índice para mejorar el rendimiento de consultas por anulada
CREATE INDEX IF NOT EXISTS idx_ordenes_venta_anulada ON public.ordenes_venta (anulada);

-- Comentario para documentar el campo
COMMENT ON COLUMN public.ordenes_venta.anulada IS 'Indica si la venta ha sido anulada mediante una nota de crédito';

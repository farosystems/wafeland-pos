-- Agregar campo fk_id_orden_anulada a la tabla ordenes_venta
ALTER TABLE public.ordenes_venta 
ADD COLUMN fk_id_orden_anulada BIGINT NULL;

-- Crear índice para mejorar el rendimiento de consultas por fk_id_orden_anulada
CREATE INDEX IF NOT EXISTS idx_ordenes_venta_fk_id_orden_anulada ON public.ordenes_venta (fk_id_orden_anulada);

-- Agregar foreign key constraint
ALTER TABLE public.ordenes_venta 
ADD CONSTRAINT ordenes_venta_fk_id_orden_anulada_fkey 
FOREIGN KEY (fk_id_orden_anulada) REFERENCES ordenes_venta (id);

-- Comentario para documentar el campo
COMMENT ON COLUMN public.ordenes_venta.fk_id_orden_anulada IS 'Referencia a la orden de venta que fue anulada por esta nota de crédito';

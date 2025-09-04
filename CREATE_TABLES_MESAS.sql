-- =====================================================
-- SCRIPT DE CREACIÓN DE TABLAS PARA MÓDULO MESAS
-- =====================================================
-- Este script crea las tablas necesarias para el módulo de gestión de mesas
-- =====================================================

-- 1. Tabla de mesas físicas del local
-- =====================================================
CREATE TABLE public.mesas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  numero text NOT NULL,
  descripcion text,
  capacidad integer DEFAULT 4,
  posicion_x numeric DEFAULT 0, -- Posición X en el tablero
  posicion_y numeric DEFAULT 0, -- Posición Y en el tablero
  activo boolean DEFAULT true,
  creado_el timestamp with time zone DEFAULT now(),
  CONSTRAINT mesas_pkey PRIMARY KEY (id),
  CONSTRAINT mesas_numero_unique UNIQUE (numero)
);

-- 2. Tabla de sesiones de mesa (cuando se abre una mesa)
-- =====================================================
CREATE TABLE public.sesiones_mesa (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_mesa bigint NOT NULL,
  fk_id_usuario bigint NOT NULL, -- Usuario que abrió la mesa
  fk_id_lote bigint NOT NULL, -- Lote de operaciones activo
  comensales integer NOT NULL CHECK (comensales > 0),
  abierta boolean DEFAULT true,
  fecha_apertura timestamp with time zone DEFAULT now(),
  fecha_cierre timestamp with time zone,
  observaciones text,
  total_sesion numeric DEFAULT 0,
  CONSTRAINT sesiones_mesa_pkey PRIMARY KEY (id),
  CONSTRAINT sesiones_mesa_fk_id_mesa_fkey FOREIGN KEY (fk_id_mesa) REFERENCES public.mesas(id),
  CONSTRAINT sesiones_mesa_fk_id_usuario_fkey FOREIGN KEY (fk_id_usuario) REFERENCES public.usuarios(id),
  CONSTRAINT sesiones_mesa_fk_id_lote_fkey FOREIGN KEY (fk_id_lote) REFERENCES public.lotes_operaciones(id_lote)
);

-- 3. Tabla de pedidos dentro de una sesión de mesa
-- =====================================================
CREATE TABLE public.pedidos_mesa (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_sesion_mesa bigint NOT NULL,
  numero_pedido integer DEFAULT 1, -- Pedido número 1, 2, 3, etc. dentro de la sesión
  estado text DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'preparando'::text, 'listo'::text, 'entregado'::text, 'cancelado'::text])),
  fecha_pedido timestamp with time zone DEFAULT now(),
  subtotal numeric DEFAULT 0,
  observaciones text,
  CONSTRAINT pedidos_mesa_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_mesa_fk_id_sesion_mesa_fkey FOREIGN KEY (fk_id_sesion_mesa) REFERENCES public.sesiones_mesa(id)
);

-- 4. Tabla de detalle de pedidos (productos específicos)
-- =====================================================
CREATE TABLE public.detalle_pedidos_mesa (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_pedido_mesa bigint NOT NULL,
  fk_id_articulo bigint NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unitario numeric NOT NULL,
  subtotal numeric GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  observaciones text, -- Observaciones específicas del producto (sin azúcar, extra queso, etc.)
  entregado boolean DEFAULT false,
  fecha_creado timestamp with time zone DEFAULT now(),
  CONSTRAINT detalle_pedidos_mesa_pkey PRIMARY KEY (id),
  CONSTRAINT detalle_pedidos_mesa_fk_id_pedido_mesa_fkey FOREIGN KEY (fk_id_pedido_mesa) REFERENCES public.pedidos_mesa(id),
  CONSTRAINT detalle_pedidos_mesa_fk_id_articulo_fkey FOREIGN KEY (fk_id_articulo) REFERENCES public.articulos(id)
);

-- 5. Vista para obtener información completa de sesiones activas
-- =====================================================
CREATE OR REPLACE VIEW public.vista_sesiones_mesa_activas AS
SELECT 
    sm.id as sesion_id,
    sm.fk_id_mesa,
    m.numero as mesa_numero,
    m.descripcion as mesa_descripcion,
    m.capacidad,
    m.posicion_x,
    m.posicion_y,
    sm.comensales,
    sm.fecha_apertura,
    sm.total_sesion,
    sm.observaciones,
    u.nombre as usuario_nombre,
    COUNT(pm.id) as total_pedidos,
    COALESCE(SUM(pm.subtotal), 0) as total_consumido
FROM public.sesiones_mesa sm
INNER JOIN public.mesas m ON sm.fk_id_mesa = m.id
INNER JOIN public.usuarios u ON sm.fk_id_usuario = u.id
LEFT JOIN public.pedidos_mesa pm ON sm.id = pm.fk_id_sesion_mesa AND pm.estado != 'cancelado'
WHERE sm.abierta = true AND m.activo = true
GROUP BY sm.id, m.id, u.nombre;

-- 6. Índices para mejorar performance
-- =====================================================
CREATE INDEX idx_sesiones_mesa_abierta ON public.sesiones_mesa(abierta);
CREATE INDEX idx_sesiones_mesa_fecha ON public.sesiones_mesa(fecha_apertura);
CREATE INDEX idx_pedidos_mesa_estado ON public.pedidos_mesa(estado);
CREATE INDEX idx_mesas_activo ON public.mesas(activo);

-- =====================================================
-- COMENTARIOS DEL ESQUEMA
-- =====================================================
COMMENT ON TABLE public.mesas IS 'Tabla que almacena las mesas físicas del local con su posición en el tablero';
COMMENT ON TABLE public.sesiones_mesa IS 'Sesiones activas de mesas, se crea un registro cuando se abre una mesa';
COMMENT ON TABLE public.pedidos_mesa IS 'Pedidos realizados durante una sesión de mesa';
COMMENT ON TABLE public.detalle_pedidos_mesa IS 'Productos específicos de cada pedido de mesa';
COMMENT ON VIEW public.vista_sesiones_mesa_activas IS 'Vista con información completa de sesiones de mesa activas';
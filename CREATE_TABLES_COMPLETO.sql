-- =====================================================
-- SCRIPT COMPLETO DE CREACIÓN DE TABLAS DEL SISTEMA
-- =====================================================
-- Este script crea todas las tablas del sistema en el orden correcto
-- respetando las dependencias de foreign keys
-- =====================================================

-- 1. TABLAS BASE (sin dependencias)
-- =====================================================

-- Tabla de configuración del sistema
CREATE TABLE public.configuracion (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  creado_el timestamp with time zone DEFAULT now(),
  nombre text,
  imagen text,
  color_primario text DEFAULT '#22c55e'::text,
  CONSTRAINT configuracion_pkey PRIMARY KEY (id)
);

-- Tabla de agrupadores
CREATE TABLE public.agrupadores (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true,
  CONSTRAINT agrupadores_pkey PRIMARY KEY (id)
);

-- Tabla de marcas
CREATE TABLE public.marcas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  descripcion text NOT NULL,
  activo boolean DEFAULT true,
  CONSTRAINT marcas_pkey PRIMARY KEY (id)
);



-- Tabla de cajas
CREATE TABLE public.cajas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  descripcion text NOT NULL,
  turno text,
  CONSTRAINT cajas_pkey PRIMARY KEY (id)
);

-- Tabla de cuentas de tesorería
CREATE TABLE public.cuentas_tesoreria (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  descripcion text NOT NULL,
  activo boolean DEFAULT true,
  CONSTRAINT cuentas_tesoreria_pkey PRIMARY KEY (id)
);

-- Tabla de tipos de gasto
CREATE TABLE public.tipo_gasto (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  descripcion text,
  obliga_empleado boolean,
  afecta_caja boolean,
  CONSTRAINT tipo_gasto_pkey PRIMARY KEY (id)
);

-- Tabla de tipos de comprobantes
CREATE TABLE public.tipos_comprobantes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  descripcion text NOT NULL,
  descuenta_stock boolean DEFAULT false,
  reingresa_stock boolean DEFAULT false,
  imprime_pdf boolean DEFAULT true,
  activo boolean DEFAULT true,
  creado_el timestamp with time zone DEFAULT now(),
  CONSTRAINT tipos_comprobantes_pkey PRIMARY KEY (id)
);

-- Tabla de módulos del sistema
CREATE TABLE public.modulos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  descripcion text,
  icono text,
  ruta text,
  activo boolean DEFAULT true,
  orden integer DEFAULT 0,
  creado_el timestamp with time zone DEFAULT now(),
  CONSTRAINT modulos_pkey PRIMARY KEY (id)
);

-- 2. TABLAS DE USUARIOS Y EMPLEADOS
-- =====================================================

-- Tabla de usuarios
CREATE TABLE public.usuarios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  email text NOT NULL UNIQUE,
  telefono text,
  password_hash text,
  rol text NOT NULL DEFAULT 'cobrador'::text CHECK (rol = ANY (ARRAY['admin'::text, 'supervisor'::text, 'cobrador'::text])),
  creado_el timestamp with time zone DEFAULT now(),
  prueba_gratis boolean DEFAULT true,
  clerk_user_id text UNIQUE,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);

-- Tabla de empleados
CREATE TABLE public.empleados (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  apellido text,
  telefono text,
  email text,
  activo boolean DEFAULT true,
  dni text,
  sueldo numeric,
  tipo_liquidacion text CHECK (tipo_liquidacion = ANY (ARRAY['mensual'::text, 'quincenal'::text, 'semanal'::text])),
  tope_adelanto numeric,
  CONSTRAINT empleados_pkey PRIMARY KEY (id)
);

-- 3. TABLAS DE ENTIDADES Y CLIENTES
-- =====================================================

-- Tabla de entidades (clientes y proveedores)
CREATE TABLE public.entidades (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  razon_social text NOT NULL,
  tipo text NOT NULL CHECK (tipo = ANY (ARRAY['cliente'::text, 'proveedor'::text])),
  email text,
  tipo_doc text CHECK (tipo_doc = ANY (ARRAY['dni'::text, 'cuit'::text, 'cuil'::text])),
  num_doc text,
  telefono text,
  categoria_iva text CHECK (categoria_iva = ANY (ARRAY['Consumidor Final'::text, 'Responsable Inscripto'::text, 'Responsable Monotributo'::text, 'Exento'::text, 'No Responsable'::text, 'Sujeto no Categorizado'::text])),
  maximo_cuenta_corriente numeric,
  CONSTRAINT entidades_pkey PRIMARY KEY (id)
);

-- 4. TABLAS DE ARTÍCULOS Y VARIANTES
-- =====================================================

-- Tabla de artículos
CREATE TABLE public.articulos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  descripcion text NOT NULL,
  precio_unitario numeric NOT NULL,
  precio_costo numeric,
  mark_up numeric,
  fk_id_agrupador bigint,
  fk_id_marca bigint,
  activo boolean DEFAULT true,
  stock numeric DEFAULT 0,
  stock_minimo numeric DEFAULT 0,
  CONSTRAINT articulos_pkey PRIMARY KEY (id),
  CONSTRAINT articulos_fk_id_agrupador_fkey FOREIGN KEY (fk_id_agrupador) REFERENCES public.agrupadores(id),
  CONSTRAINT articulos_fk_id_marca_fkey FOREIGN KEY (fk_id_marca) REFERENCES public.marcas(id)
);



-- 5. TABLAS DE LOTES Y OPERACIONES
-- =====================================================

-- Tabla de lotes de operaciones
CREATE TABLE public.lotes_operaciones (
  id_lote bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_usuario bigint NOT NULL,
  fk_id_caja bigint NOT NULL,
  abierto boolean DEFAULT true,
  tipo_lote text CHECK (tipo_lote = ANY (ARRAY['apertura'::text, 'cierre'::text])),
  fecha_apertura timestamp with time zone DEFAULT now(),
  hora_apertura text,
  fecha_cierre timestamp with time zone,
  hora_cierre text,
  observaciones text,
  saldo_inicial numeric DEFAULT 0,
  CONSTRAINT lotes_operaciones_pkey PRIMARY KEY (id_lote),
  CONSTRAINT lotes_operaciones_fk_id_usuario_fkey FOREIGN KEY (fk_id_usuario) REFERENCES public.usuarios(id),
  CONSTRAINT lotes_operaciones_fk_id_caja_fkey FOREIGN KEY (fk_id_caja) REFERENCES public.cajas(id)
);

-- Tabla de detalle de lotes operaciones
CREATE TABLE public.detalle_lotes_operaciones (
  idd bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_lote bigint NOT NULL,
  fk_id_cuenta_tesoreria bigint NOT NULL,
  tipo text CHECK (tipo = ANY (ARRAY['ingreso'::text, 'egreso'::text])),
  monto numeric NOT NULL,
  fecha_movimiento timestamp with time zone DEFAULT now(),
  CONSTRAINT detalle_lotes_operaciones_pkey PRIMARY KEY (idd),
  CONSTRAINT detalle_lotes_operaciones_fk_id_lote_fkey FOREIGN KEY (fk_id_lote) REFERENCES public.lotes_operaciones(id_lote),
  CONSTRAINT detalle_lotes_operaciones_fk_id_cuenta_tesoreria_fkey FOREIGN KEY (fk_id_cuenta_tesoreria) REFERENCES public.cuentas_tesoreria(id)
);

-- 6. TABLAS DE VENTAS
-- =====================================================

-- Tabla de órdenes de venta
CREATE TABLE public.ordenes_venta (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_entidades bigint,
  fk_id_usuario bigint NOT NULL,
  fk_id_lote bigint NOT NULL,
  fk_id_tipo_comprobante bigint,
  fecha timestamp with time zone DEFAULT now(),
  total numeric NOT NULL,
  subtotal numeric NOT NULL,
  anulada boolean,
  fk_id_orden_anulada bigint,
  CONSTRAINT ordenes_venta_pkey PRIMARY KEY (id),
  CONSTRAINT ordenes_venta_fk_id_entidades_fkey FOREIGN KEY (fk_id_entidades) REFERENCES public.entidades(id),
  CONSTRAINT ordenes_venta_fk_id_usuario_fkey FOREIGN KEY (fk_id_usuario) REFERENCES public.usuarios(id),
  CONSTRAINT ordenes_venta_fk_id_lote_fkey FOREIGN KEY (fk_id_lote) REFERENCES public.lotes_operaciones(id_lote),
  CONSTRAINT ordenes_venta_fk_id_tipo_comprobante_fkey FOREIGN KEY (fk_id_tipo_comprobante) REFERENCES public.tipos_comprobantes(id),
  CONSTRAINT ordenes_venta_fk_id_orden_anulada_fkey FOREIGN KEY (fk_id_orden_anulada) REFERENCES public.ordenes_venta(id)
);

-- Tabla de detalle de órdenes de venta
CREATE TABLE public.ordenes_venta_detalle (
  idd bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_orden bigint NOT NULL,
  fk_id_articulo bigint NOT NULL,
  cantidad integer NOT NULL,
  precio_unitario numeric NOT NULL,
  CONSTRAINT ordenes_venta_detalle_pkey PRIMARY KEY (idd),
  CONSTRAINT ordenes_venta_detalle_fk_id_orden_fkey FOREIGN KEY (fk_id_orden) REFERENCES public.ordenes_venta(id),
  CONSTRAINT ordenes_venta_detalle_fk_id_articulo_fkey FOREIGN KEY (fk_id_articulo) REFERENCES public.articulos(id)
);

-- Tabla de impuestos de órdenes de venta
CREATE TABLE public.ordenes_venta_impuestos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_orden bigint NOT NULL,
  tipo_impuesto text NOT NULL,
  porcentaje numeric NOT NULL,
  monto numeric NOT NULL,
  CONSTRAINT ordenes_venta_impuestos_pkey PRIMARY KEY (id),
  CONSTRAINT ordenes_venta_impuestos_fk_id_orden_fkey FOREIGN KEY (fk_id_orden) REFERENCES public.ordenes_venta(id)
);

-- Tabla de medios de pago de órdenes de venta
CREATE TABLE public.ordenes_venta_medios_pago (
  idd bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_orden bigint NOT NULL,
  fk_id_cuenta_tesoreria bigint NOT NULL,
  monto_pagado numeric NOT NULL CHECK (monto_pagado > 0::numeric),
  CONSTRAINT ordenes_venta_medios_pago_pkey PRIMARY KEY (idd),
  CONSTRAINT ordenes_venta_medios_pago_fk_id_orden_fkey FOREIGN KEY (fk_id_orden) REFERENCES public.ordenes_venta(id),
  CONSTRAINT ordenes_venta_medios_pago_fk_id_cuenta_tesoreria_fkey FOREIGN KEY (fk_id_cuenta_tesoreria) REFERENCES public.cuentas_tesoreria(id)
);

-- 7. TABLAS DE CUENTAS CORRIENTES
-- =====================================================

-- Tabla de cuentas corrientes
CREATE TABLE public.cuentas_corrientes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  creada_el timestamp with time zone DEFAULT now(),
  fk_id_orden bigint NOT NULL,
  fk_id_cliente bigint NOT NULL,
  total numeric NOT NULL,
  saldo numeric NOT NULL,
  estado text CHECK (estado = ANY (ARRAY['pendiente'::text, 'pagada'::text, 'cancelado'::text])),
  CONSTRAINT cuentas_corrientes_pkey PRIMARY KEY (id),
  CONSTRAINT cuentas_corrientes_fk_id_orden_fkey FOREIGN KEY (fk_id_orden) REFERENCES public.ordenes_venta(id),
  CONSTRAINT cuentas_corrientes_fk_id_cliente_fkey FOREIGN KEY (fk_id_cliente) REFERENCES public.entidades(id)
);

-- Tabla de pagos de cuenta corriente
CREATE TABLE public.pagos_cuenta_corriente (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  creado_el timestamp with time zone NOT NULL DEFAULT now(),
  fk_id_cuenta_corriente bigint,
  monto real,
  fk_id_cuenta_tesoreria integer,
  fk_id_lote integer,
  CONSTRAINT pagos_cuenta_corriente_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_cuenta_corriente_fk_id_cuenta_corriente_fkey FOREIGN KEY (fk_id_cuenta_corriente) REFERENCES public.cuentas_corrientes(id),
  CONSTRAINT pagos_cuenta_corriente_fk_id_cuenta_tesoreria_fkey FOREIGN KEY (fk_id_cuenta_tesoreria) REFERENCES public.cuentas_tesoreria(id),
  CONSTRAINT pagos_cuenta_corriente_fk_id_lote_fkey FOREIGN KEY (fk_id_lote) REFERENCES public.lotes_operaciones(id_lote)
);

-- 8. TABLAS DE STOCK Y MOVIMIENTOS
-- =====================================================

-- Tabla de movimientos de stock
CREATE TABLE public.movimientos_stock (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_articulos bigint NOT NULL,
  fk_id_orden bigint,
  origen text NOT NULL,
  tipo text NOT NULL,
  cantidad numeric NOT NULL,
  stock_actual numeric NOT NULL,
  creado_el timestamp with time zone DEFAULT now(),
  CONSTRAINT movimientos_stock_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_stock_fk_id_articulos_fkey FOREIGN KEY (fk_id_articulos) REFERENCES public.articulos(id),
  CONSTRAINT movimientos_stock_fk_id_orden_fkey FOREIGN KEY (fk_id_orden) REFERENCES public.ordenes_venta(id)
);

-- 9. TABLAS DE EMPLEADOS Y LIQUIDACIONES
-- =====================================================

-- Tabla de liquidaciones
CREATE TABLE public.liquidaciones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  creado_el timestamp with time zone NOT NULL DEFAULT now(),
  fk_empleado bigint,
  desde timestamp without time zone,
  hasta timestamp without time zone,
  sueldo_base numeric,
  total_adelantos numeric,
  total_faltas numeric,
  neto_liquidado numeric,
  CONSTRAINT liquidaciones_pkey PRIMARY KEY (id),
  CONSTRAINT liquidaciones_fk_empleado_fkey FOREIGN KEY (fk_empleado) REFERENCES public.empleados(id)
);

-- Tabla de gastos de empleados
CREATE TABLE public.gastos_empleados (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  creado_el timestamp with time zone DEFAULT now(),
  fk_tipo_gasto bigint NOT NULL,
  monto numeric NOT NULL,
  descripcion text,
  fk_empleado bigint,
  fk_lote_operaciones bigint NOT NULL,
  fk_usuario bigint NOT NULL,
  fk_cuenta_tesoreria bigint NOT NULL,
  CONSTRAINT gastos_empleados_pkey PRIMARY KEY (id),
  CONSTRAINT gastos_empleados_fk_lote_operaciones_fkey FOREIGN KEY (fk_lote_operaciones) REFERENCES public.lotes_operaciones(id_lote),
  CONSTRAINT gastos_empleados_fk_usuario_fkey FOREIGN KEY (fk_usuario) REFERENCES public.usuarios(id),
  CONSTRAINT gastos_empleados_fk_cuenta_tesoreria_fkey FOREIGN KEY (fk_cuenta_tesoreria) REFERENCES public.cuentas_tesoreria(id),
  CONSTRAINT gastos_empleados_fk_tipo_gasto_fkey FOREIGN KEY (fk_tipo_gasto) REFERENCES public.tipo_gasto(id),
  CONSTRAINT gastos_empleados_fk_empleado_fkey FOREIGN KEY (fk_empleado) REFERENCES public.empleados(id)
);

-- 10. TABLA DE PERMISOS DE USUARIOS
-- =====================================================

-- Tabla de permisos de usuarios
CREATE TABLE public.permisos_usuarios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fk_id_usuario bigint NOT NULL,
  fk_id_modulo bigint NOT NULL,
  puede_ver boolean DEFAULT false,
  creado_el timestamp with time zone DEFAULT now(),
  actualizado_el timestamp with time zone DEFAULT now(),
  CONSTRAINT permisos_usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT permisos_usuarios_fk_id_usuario_fkey FOREIGN KEY (fk_id_usuario) REFERENCES public.usuarios(id),
  CONSTRAINT permisos_usuarios_fk_id_modulo_fkey FOREIGN KEY (fk_id_modulo) REFERENCES public.modulos(id)
);

-- =====================================================
-- FIN DEL SCRIPT DE CREACIÓN DE TABLAS
-- =====================================================
-- Total de tablas creadas: 22
-- =====================================================


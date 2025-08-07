# 🗄️ ESQUEMA COMPLETO DE BASE DE DATOS - SISTEMA POS

## 📋 INSTRUCCIONES DE USO

1. **Copiar y pegar** cada bloque SQL en el **SQL Editor de Supabase**
2. **Ejecutar en orden** para respetar las dependencias entre tablas
3. **Verificar** que cada tabla se cree correctamente antes de continuar

---

## 🔧 TABLAS DE CONFIGURACIÓN (SIN DEPENDENCIAS)

### 1. Configuración de Empresa
```sql
create table public.configuracion (
  id bigint not null default nextval('configuracion_id_seq'::regclass),
  creado_el timestamp with time zone default now(),
  nombre text,
  imagen text,
  color_primario text default '#22c55e',
  constraint configuracion_pkey primary key (id)
) TABLESPACE pg_default;
```

### 2. Usuarios
```sql
create table public.usuarios (
  id bigint not null default nextval('usuarios_id_seq'::regclass),
  nombre text not null,
  email text unique not null,
  telefono text,
  password_hash text,
  rol text not null default 'cobrador' check (rol in ('admin', 'supervisor', 'cobrador')),
  creado_el timestamp with time zone default now(),
  prueba_gratis boolean default true,
  clerk_user_id text unique,
  constraint usuarios_pkey primary key (id)
) TABLESPACE pg_default;
```

### 3. Agrupadores
```sql
create table public.agrupadores (
  id bigint not null default nextval('agrupadores_id_seq'::regclass),
  nombre text not null,
  activo boolean default true,
  constraint agrupadores_pkey primary key (id)
) TABLESPACE pg_default;
```

### 4. Marcas
```sql
create table public.marcas (
  id bigint not null default nextval('marcas_id_seq'::regclass),
  descripcion text not null,
  activo boolean default true,
  constraint marcas_pkey primary key (id)
) TABLESPACE pg_default;
```

### 5. Colores
```sql
create table public.color (
  id bigint not null default nextval('color_id_seq'::regclass),
  descripcion text not null,
  activo boolean default true,
  constraint color_pkey primary key (id)
) TABLESPACE pg_default;
```

### 6. Talles
```sql
create table public.talles (
  id bigint not null default nextval('talles_id_seq'::regclass),
  descripcion text not null,
  activo boolean default true,
  constraint talles_pkey primary key (id)
) TABLESPACE pg_default;
```

### 7. Tipos de Comprobantes
```sql
create table public.tipos_comprobantes (
  id bigint not null default nextval('tipos_comprobantes_id_seq'::regclass),
  descripcion text not null,
  activo boolean default true,
  reingresa_stock boolean default false,
  constraint tipos_comprobantes_pkey primary key (id)
) TABLESPACE pg_default;
```

### 8. Tipos de Gasto
```sql
create table public.tipo_gasto (
  id bigint not null default nextval('tipo_gasto_id_seq'::regclass),
  descripcion text,
  obliga_empleado boolean,
  afecta_caja boolean,
  constraint tipo_gasto_pkey primary key (id)
) TABLESPACE pg_default;
```

### 9. Cuentas de Tesorería
```sql
create table public.cuentas_tesoreria (
  id bigint not null default nextval('cuentas_tesoreria_id_seq'::regclass),
  descripcion text not null,
  activo boolean default true,
  constraint cuentas_tesoreria_pkey primary key (id)
) TABLESPACE pg_default;
```

### 10. Cajas
```sql
create table public.cajas (
  id bigint not null default nextval('cajas_id_seq'::regclass),
  descripcion text not null,
  turno text,
  constraint cajas_pkey primary key (id)
) TABLESPACE pg_default;
```

### 11. Empleados
```sql
create table public.empleados (
  id bigint not null default nextval('empleados_id_seq'::regclass),
  nombre text not null,
  apellido text,
  telefono text,
  email text,
  activo boolean default true,
  constraint empleados_pkey primary key (id)
) TABLESPACE pg_default;
```

### 12. Entidades (Clientes/Proveedores)
```sql
create table public.entidades (
  id bigint not null default nextval('entidades_id_seq'::regclass),
  razon_social text not null,
  tipo text not null check (tipo in ('cliente', 'proveedor')),
  email text,
  tipo_doc text check (tipo_doc in ('dni', 'cuit', 'cuil')),
  num_doc text,
  telefono text,
  categoria_iva text check (categoria_iva in ('Consumidor Final', 'Responsable Inscripto', 'Responsable Monotributo', 'Exento', 'No Responsable', 'Sujeto no Categorizado')),
  maximo_cuenta_corriente numeric(10,2),
  constraint entidades_pkey primary key (id)
) TABLESPACE pg_default;
```

---

## 📦 TABLAS DE PRODUCTOS

### 13. Artículos
```sql
create table public.articulos (
  id bigint not null default nextval('articulos_id_seq'::regclass),
  descripcion text not null,
  precio_unitario numeric(10,2) not null,
  precio_costo numeric(10,2),
  mark_up numeric(5,2),
  fk_id_agrupador bigint,
  fk_id_marca bigint,
  activo boolean default true,
  stock numeric(10,2) default 0,
  constraint articulos_pkey primary key (id),
  constraint articulos_fk_id_agrupador_fkey foreign key (fk_id_agrupador) references agrupadores (id),
  constraint articulos_fk_id_marca_fkey foreign key (fk_id_marca) references marcas (id)
) TABLESPACE pg_default;
```

### 14. Variantes de Artículos
```sql
create table public.variantes_articulos (
  id bigint not null default nextval('variantes_articulos_id_seq'::regclass),
  creado_el timestamp with time zone default now(),
  fk_id_articulo bigint not null,
  stock_unitario integer default 0,
  stock_minimo integer default 0,
  stock_maximo integer default 0,
  fk_id_talle bigint,
  fk_id_color bigint,
  precio_venta numeric(10,2),
  codigo_barras text,
  constraint variantes_articulos_pkey primary key (id),
  constraint variantes_articulos_fk_id_articulo_fkey foreign key (fk_id_articulo) references articulos (id),
  constraint variantes_articulos_fk_id_talle_fkey foreign key (fk_id_talle) references talles (id),
  constraint variantes_articulos_fk_id_color_fkey foreign key (fk_id_color) references color (id)
) TABLESPACE pg_default;
```

---

## 💰 TABLAS DE OPERACIONES

### 15. Lotes de Operaciones
```sql
create table public.lotes_operaciones (
  id_lote bigint not null default nextval('lotes_operaciones_id_lote_seq'::regclass),
  fk_id_usuario bigint not null,
  fk_id_caja bigint not null,
  abierto boolean default true,
  tipo_lote text check (tipo_lote in ('apertura', 'cierre')),
  fecha_apertura timestamp with time zone default now(),
  hora_apertura text,
  fecha_cierre timestamp with time zone,
  hora_cierre text,
  observaciones text,
  saldo_inicial numeric(10,2) default 0,
  constraint lotes_operaciones_pkey primary key (id_lote),
  constraint lotes_operaciones_fk_id_usuario_fkey foreign key (fk_id_usuario) references usuarios (id),
  constraint lotes_operaciones_fk_id_caja_fkey foreign key (fk_id_caja) references cajas (id)
) TABLESPACE pg_default;
```

### 16. Órdenes de Venta
```sql
create table public.ordenes_venta (
  id bigint not null default nextval('ordenes_venta_id_seq'::regclass),
  fk_id_entidades bigint,
  fk_id_usuario bigint not null,
  fk_id_lote bigint not null,
  fk_id_tipo_comprobante bigint,
  fecha timestamp with time zone default now(),
  total numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  constraint ordenes_venta_pkey primary key (id),
  constraint ordenes_venta_fk_id_entidades_fkey foreign key (fk_id_entidades) references entidades (id),
  constraint ordenes_venta_fk_id_usuario_fkey foreign key (fk_id_usuario) references usuarios (id),
  constraint ordenes_venta_fk_id_lote_fkey foreign key (fk_id_lote) references lotes_operaciones (id_lote),
  constraint ordenes_venta_fk_id_tipo_comprobante_fkey foreign key (fk_id_tipo_comprobante) references tipos_comprobantes (id)
) TABLESPACE pg_default;
```

### 17. Detalles de Órdenes de Venta
```sql
create table public.ordenes_venta_detalle (
  idd bigint not null default nextval('ordenes_venta_detalle_idd_seq'::regclass),
  fk_id_orden bigint not null,
  fk_id_articulo bigint not null,
  cantidad integer not null,
  precio_unitario numeric(10,2) not null,
  fk_id_talle bigint,
  fk_id_color bigint,
  constraint ordenes_venta_detalle_pkey primary key (idd),
  constraint ordenes_venta_detalle_fk_id_orden_fkey foreign key (fk_id_orden) references ordenes_venta (id),
  constraint ordenes_venta_detalle_fk_id_articulo_fkey foreign key (fk_id_articulo) references articulos (id),
  constraint ordenes_venta_detalle_fk_id_talle_fkey foreign key (fk_id_talle) references talles (id),
  constraint ordenes_venta_detalle_fk_id_color_fkey foreign key (fk_id_color) references color (id)
) TABLESPACE pg_default;
```

### 18. Medios de Pago de Órdenes de Venta
```sql
create table public.ordenes_venta_medios_pago (
  idd bigint not null default nextval('ordenes_venta_medios_pago_idd_seq'::regclass),
  fk_id_orden bigint not null,
  fk_id_cuenta_tesoreria bigint not null,
  monto_pagado numeric(10,2) not null,
  constraint ordenes_venta_medios_pago_pkey primary key (idd),
  constraint ordenes_venta_medios_pago_fk_id_cuenta_tesoreria_fkey foreign key (fk_id_cuenta_tesoreria) references cuentas_tesoreria (id),
  constraint ordenes_venta_medios_pago_fk_id_orden_fkey foreign key (fk_id_orden) references ordenes_venta (id),
  constraint ordenes_venta_medios_pago_monto_pagado_check check ((monto_pagado > (0)::numeric))
) TABLESPACE pg_default;
```

### 19. Impuestos de Órdenes de Venta
```sql
create table public.ordenes_venta_impuestos (
  id bigint not null default nextval('ordenes_venta_impuestos_id_seq'::regclass),
  fk_id_orden bigint not null,
  tipo_impuesto text not null,
  porcentaje numeric(5,2) not null,
  monto numeric(10,2) not null,
  constraint ordenes_venta_impuestos_pkey primary key (id),
  constraint ordenes_venta_impuestos_fk_id_orden_fkey foreign key (fk_id_orden) references ordenes_venta (id)
) TABLESPACE pg_default;
```

---

## 📊 TABLAS DE MOVIMIENTOS

### 20. Movimientos de Stock
```sql
create table public.movimientos_stock (
  id bigint not null default nextval('movimientos_stock_id_seq'::regclass),
  fk_id_articulos bigint not null,
  fk_id_orden bigint,
  origen text not null,
  tipo text not null,
  cantidad numeric(10,2) not null,
  stock_actual numeric(10,2) not null,
  creado_el timestamp with time zone default now(),
  fk_id_talle bigint,
  fk_id_color bigint,
  constraint movimientos_stock_pkey primary key (id),
  constraint movimientos_stock_fk_id_articulos_fkey foreign key (fk_id_articulos) references articulos (id),
  constraint movimientos_stock_fk_id_orden_fkey foreign key (fk_id_orden) references ordenes_venta (id),
  constraint movimientos_stock_fk_id_talle_fkey foreign key (fk_id_talle) references talles (id),
  constraint movimientos_stock_fk_id_color_fkey foreign key (fk_id_color) references color (id)
) TABLESPACE pg_default;
```

### 21. Detalles de Lotes de Operaciones
```sql
create table public.detalle_lotes_operaciones (
  idd bigint not null default nextval('detalle_lotes_operaciones_idd_seq'::regclass),
  fk_id_lote bigint not null,
  fk_id_cuenta_tesoreria bigint not null,
  tipo text check (tipo in ('ingreso', 'egreso')),
  monto numeric(10,2) not null,
  fecha_movimiento timestamp with time zone default now(),
  constraint detalle_lotes_operaciones_pkey primary key (idd),
  constraint detalle_lotes_operaciones_fk_id_lote_fkey foreign key (fk_id_lote) references lotes_operaciones (id_lote),
  constraint detalle_lotes_operaciones_fk_id_cuenta_tesoreria_fkey foreign key (fk_id_cuenta_tesoreria) references cuentas_tesoreria (id)
) TABLESPACE pg_default;
```

---

## 💳 TABLAS DE CUENTAS CORRIENTES

### 22. Cuentas Corrientes
```sql
create table public.cuentas_corrientes (
  id bigint not null default nextval('cuentas_corrientes_id_seq'::regclass),
  creada_el timestamp with time zone default now(),
  fk_id_orden bigint not null,
  fk_id_cliente bigint not null,
  total numeric(10,2) not null,
  saldo numeric(10,2) not null,
  estado text check (estado in ('pendiente', 'pagada', 'cancelado')),
  constraint cuentas_corrientes_pkey primary key (id),
  constraint cuentas_corrientes_fk_id_orden_fkey foreign key (fk_id_orden) references ordenes_venta (id),
  constraint cuentas_corrientes_fk_id_cliente_fkey foreign key (fk_id_cliente) references entidades (id)
) TABLESPACE pg_default;
```

### 23. Pagos de Cuenta Corriente
```sql
create table public.pagos_cuenta_corriente (
  id bigint not null default nextval('pagos_cuenta_corriente_id_seq'::regclass),
  fk_id_cuenta_corriente bigint not null,
  monto numeric(10,2) not null,
  fecha_pago timestamp with time zone default now(),
  fk_id_usuario bigint not null,
  fk_id_lote bigint not null,
  constraint pagos_cuenta_corriente_pkey primary key (id),
  constraint pagos_cuenta_corriente_fk_id_cuenta_corriente_fkey foreign key (fk_id_cuenta_corriente) references cuentas_corrientes (id),
  constraint pagos_cuenta_corriente_fk_id_usuario_fkey foreign key (fk_id_usuario) references usuarios (id),
  constraint pagos_cuenta_corriente_fk_id_lote_fkey foreign key (fk_id_lote) references lotes_operaciones (id_lote)
) TABLESPACE pg_default;
```

---

## 👥 TABLAS DE EMPLEADOS Y GASTOS

### 24. Gastos de Empleados
```sql
create table public.gastos_empleados (
  id bigint not null default nextval('gastos_empleados_id_seq'::regclass),
  creado_el timestamp with time zone default now(),
  fk_tipo_gasto bigint not null,
  monto numeric(10,2) not null,
  descripcion text,
  fk_empleado bigint not null,
  fk_lote_operaciones bigint not null,
  fk_usuario bigint not null,
  fk_cuenta_tesoreria bigint not null,
  constraint gastos_empleados_pkey primary key (id),
  constraint gastos_empleados_fk_tipo_gasto_fkey foreign key (fk_tipo_gasto) references tipo_gasto (id),
  constraint gastos_empleados_fk_empleado_fkey foreign key (fk_empleado) references empleados (id),
  constraint gastos_empleados_fk_lote_operaciones_fkey foreign key (fk_lote_operaciones) references lotes_operaciones (id_lote),
  constraint gastos_empleados_fk_usuario_fkey foreign key (fk_usuario) references usuarios (id),
  constraint gastos_empleados_fk_cuenta_tesoreria_fkey foreign key (fk_cuenta_tesoreria) references cuentas_tesoreria (id)
) TABLESPACE pg_default;
```

### 25. Liquidaciones
```sql
create table public.liquidaciones (
  id bigint not null default nextval('liquidaciones_id_seq'::regclass),
  fk_id_empleado bigint not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  total_ventas numeric(10,2) default 0,
  comision numeric(10,2) default 0,
  total_liquidacion numeric(10,2) default 0,
  estado text default 'pendiente',
  constraint liquidaciones_pkey primary key (id),
  constraint liquidaciones_fk_id_empleado_fkey foreign key (fk_id_empleado) references empleados (id)
) TABLESPACE pg_default;
```

---

## 📋 TABLAS DE ÓRDENES DE COMPRA

### 26. Órdenes de Compra
```sql
create table public.ordenes_compra (
  id bigint not null default nextval('ordenes_compra_id_seq'::regclass),
  creado_el timestamp with time zone default now(),
  numero_orden text not null,
  fecha date not null,
  fk_id_proveedor bigint not null,
  fk_id_empresa bigint not null,
  subtotal numeric(10,2) not null,
  descuento_porcentaje numeric(5,2) default 0,
  subtotal_menos_descuento numeric(10,2) not null,
  tasa_impuestos numeric(5,2) default 0,
  total_impuestos numeric(10,2) default 0,
  envio_almacenaje numeric(10,2) default 0,
  total numeric(10,2) not null,
  estado text check (estado in ('borrador', 'generando', 'completada', 'cancelada')),
  notas text,
  constraint ordenes_compra_pkey primary key (id),
  constraint ordenes_compra_fk_id_proveedor_fkey foreign key (fk_id_proveedor) references entidades (id),
  constraint ordenes_compra_fk_id_empresa_fkey foreign key (fk_id_empresa) references configuracion (id)
) TABLESPACE pg_default;
```

### 27. Detalles de Órdenes de Compra
```sql
create table public.ordenes_compra_detalle (
  id bigint not null default nextval('ordenes_compra_detalle_id_seq'::regclass),
  fk_id_orden_compra bigint not null,
  fk_id_articulo bigint not null,
  cantidad integer not null,
  precio_unitario numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  constraint ordenes_compra_detalle_pkey primary key (id),
  constraint ordenes_compra_detalle_fk_id_orden_compra_fkey foreign key (fk_id_orden_compra) references ordenes_compra (id),
  constraint ordenes_compra_detalle_fk_id_articulo_fkey foreign key (fk_id_articulo) references articulos (id)
) TABLESPACE pg_default;
```

---

## 🔍 ÍNDICES RECOMENDADOS

```sql
-- Índices para mejorar el rendimiento de consultas frecuentes

-- Usuarios
CREATE INDEX idx_usuarios_clerk_user_id ON usuarios(clerk_user_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- Entidades
CREATE INDEX idx_entidades_tipo ON entidades(tipo);
CREATE INDEX idx_entidades_razon_social ON entidades(razon_social);

-- Artículos
CREATE INDEX idx_articulos_activo ON articulos(activo);
CREATE INDEX idx_articulos_fk_id_agrupador ON articulos(fk_id_agrupador);
CREATE INDEX idx_articulos_fk_id_marca ON articulos(fk_id_marca);

-- Variantes
CREATE INDEX idx_variantes_articulos_fk_id_articulo ON variantes_articulos(fk_id_articulo);
CREATE INDEX idx_variantes_articulos_codigo_barras ON variantes_articulos(codigo_barras);

-- Órdenes de Venta
CREATE INDEX idx_ordenes_venta_fecha ON ordenes_venta(fecha);
CREATE INDEX idx_ordenes_venta_fk_id_entidades ON ordenes_venta(fk_id_entidades);
CREATE INDEX idx_ordenes_venta_fk_id_usuario ON ordenes_venta(fk_id_usuario);

-- Detalles de Venta
CREATE INDEX idx_ordenes_venta_detalle_fk_id_orden ON ordenes_venta_detalle(fk_id_orden);
CREATE INDEX idx_ordenes_venta_detalle_fk_id_articulo ON ordenes_venta_detalle(fk_id_articulo);

-- Medios de Pago
CREATE INDEX idx_ordenes_venta_medios_pago_fk_id_orden ON ordenes_venta_medios_pago(fk_id_orden);
CREATE INDEX idx_ordenes_venta_medios_pago_fk_id_cuenta_tesoreria ON ordenes_venta_medios_pago(fk_id_cuenta_tesoreria);

-- Movimientos de Stock
CREATE INDEX idx_movimientos_stock_fk_id_articulos ON movimientos_stock(fk_id_articulos);
CREATE INDEX idx_movimientos_stock_creado_el ON movimientos_stock(creado_el);

-- Lotes de Operaciones
CREATE INDEX idx_lotes_operaciones_fk_id_usuario ON lotes_operaciones(fk_id_usuario);
CREATE INDEX idx_lotes_operaciones_abierto ON lotes_operaciones(abierto);
```

---

## ✅ VERIFICACIÓN FINAL

Después de ejecutar todos los CREATE TABLE, verifica que todas las tablas se hayan creado correctamente:

```sql
-- Listar todas las tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

---

## 🚀 DATOS INICIALES RECOMENDADOS

### Insertar configuración básica
```sql
INSERT INTO configuracion (nombre, color_primario) 
VALUES ('Mi Empresa', '#22c55e');

INSERT INTO cuentas_tesoreria (descripcion) 
VALUES ('EFECTIVO'), ('TRANSFERENCIA'), ('TARJETA');

INSERT INTO cajas (descripcion, turno) 
VALUES ('Caja Principal', 'Mañana');

INSERT INTO tipos_comprobantes (descripcion, reingresa_stock) 
VALUES ('FACTURA A', false), ('FACTURA B', false), ('TICKET', false), ('NOTA DE CRÉDITO', true);

INSERT INTO agrupadores (nombre) 
VALUES ('General');

INSERT INTO marcas (descripcion) 
VALUES ('Sin Marca');

INSERT INTO talles (descripcion) 
VALUES ('ÚNICO');

INSERT INTO color (descripcion) 
VALUES ('Sin Color');
```

---

## 📝 NOTAS IMPORTANTES

1. **Orden de ejecución**: Las tablas están ordenadas para respetar las dependencias de claves foráneas
2. **Secuencias**: Supabase crea automáticamente las secuencias para los campos ID
3. **Permisos**: Configura RLS (Row Level Security) según tus necesidades
4. **Backup**: Haz un backup antes de ejecutar en producción
5. **Pruebas**: Ejecuta primero en un entorno de desarrollo

---

**✅ ¡Listo! Tu base de datos del Sistema POS está completamente configurada.** 
# 📋 Módulo de Gestión de Mesas - Sistema POS

## 🎯 Descripción

El módulo de mesas permite gestionar las mesas de una cafetería o restaurante a través de un tablero visual interactivo. Los usuarios pueden crear, editar, mover y abrir mesas para comenzar el servicio a los clientes.

## ✅ Funcionalidades Implementadas

### ✅ Completadas

1. **Schema de Base de Datos**
   - 4 nuevas tablas: `mesas`, `sesiones_mesa`, `pedidos_mesa`, `detalle_pedidos_mesa`
   - Vista optimizada `vista_sesiones_mesa_activas`
   - Índices para mejorar performance

2. **Botón "Abrir Local"**
   - Integrado en el sidebar principal
   - Acceso directo al módulo de mesas
   - Control de permisos por roles

3. **Tablero Visual Interactivo**
   - Drag & drop para mover mesas por el tablero
   - Estados visuales: Libre (verde), Ocupada (azul), Por Cobrar (naranja)
   - Información en tiempo real (comensales, tiempo, consumo)

4. **CRUD Completo de Mesas**
   - Crear nuevas mesas con número, descripción y capacidad
   - Editar mesas existentes
   - Eliminar mesas (soft delete)
   - Posicionamiento personalizable en el tablero

5. **Gestión de Sesiones**
   - Abrir mesa con selección de comensales (1 hasta capacidad máxima)
   - Validación de capacidad y estado de mesa
   - Control de usuario y lote activo

6. **Estadísticas en Tiempo Real**
   - Contador de mesas libres, ocupadas y por cobrar
   - Vista resumida del estado general

## 📁 Archivos Creados/Modificados

### Base de Datos
- `CREATE_TABLES_MESAS.sql` - Schema completo del módulo

### Types y Interfaces
- `src/types/mesa.ts` - Definiciones TypeScript completas

### Servicios y Acciones
- `src/services/mesas.ts` - Funciones de acceso a datos
- `src/app/actions/mesas.ts` - Server Actions con autenticación

### Hooks
- `src/hooks/use-mesas.ts` - Hook personalizado para gestión de estado

### Componentes
- `src/app/mesas/page.tsx` - Página principal del módulo
- `src/components/mesas/mesas-content.tsx` - Contenedor principal
- `src/components/mesas/tablero-mesas.tsx` - Tablero con drag & drop
- `src/components/mesas/mesa-card.tsx` - Tarjeta individual de mesa
- `src/components/mesas/mesa-form.tsx` - Formulario para crear/editar

### Navegación
- `src/components/app-sidebar.tsx` - Agregado botón "Abrir Local"

## 🔧 Instalación y Configuración

### 1. Base de Datos

Ejecuta el script SQL para crear las tablas necesarias:

```bash
# Conecta a tu base de datos Supabase y ejecuta:
cat CREATE_TABLES_MESAS.sql | psql -h your-host -U your-user -d your-database
```

### 2. Permisos de Usuario

Agrega el módulo 'mesas' a la tabla de módulos y asigna permisos:

```sql
-- Insertar el módulo de mesas
INSERT INTO modulos (nombre, descripcion, icono, ruta, activo, orden) 
VALUES ('mesas', 'Gestión de Mesas', 'table', '/mesas', true, 50);

-- Asignar permisos (ejemplo para administradores)
INSERT INTO permisos_usuarios (fk_id_usuario, fk_id_modulo, puede_ver) 
SELECT u.id, m.id, true 
FROM usuarios u, modulos m 
WHERE u.rol = 'admin' AND m.nombre = 'mesas';
```

### 3. Verificar Dependencias

El módulo utiliza las siguientes dependencias ya incluidas en el proyecto:

- `@dnd-kit/core` - Para funcionalidad drag & drop
- `@tabler/icons-react` - Para iconografía
- `@radix-ui/react-*` - Para componentes UI
- `sonner` - Para notificaciones toast

## 🚀 Uso del Sistema

### 1. Acceso al Módulo
- Hacer clic en el botón **"Abrir Local"** en la barra lateral
- Solo usuarios con permisos del módulo 'mesas' pueden acceder

### 2. Gestión de Mesas

#### Crear Nueva Mesa
1. Hacer clic en **"Gestionar Mesas"** para mostrar el panel de gestión
2. Hacer clic en **"Nueva Mesa"**
3. Completar el formulario:
   - **Número**: Identificador único (ej: "1", "A1", "VIP-1")
   - **Descripción**: Opcional (ej: "Mesa junto a ventana")
   - **Capacidad**: Número máximo de comensales (1-20)
   - **Posición X/Y**: Posición inicial en el tablero

#### Editar Mesa Existente
1. En el panel de gestión, hacer clic en **"Editar"** en la mesa deseada
2. Modificar los datos necesarios
3. Hacer clic en **"Actualizar Mesa"**

#### Eliminar Mesa
1. Solo se pueden eliminar mesas libres (sin sesión activa)
2. Hacer clic en el ícono de basura en el panel de gestión
3. Confirmar la eliminación

### 3. Manejo de Mesas en el Tablero

#### Mover Mesas
- **Arrastrar y soltar** cualquier mesa para reposicionarla
- La nueva posición se guarda automáticamente

#### Estados de Mesa
- 🟢 **Verde (Libre)**: Mesa disponible para nuevos clientes
- 🔵 **Azul (Ocupada)**: Mesa con clientes pero sin consumo registrado
- 🟠 **Naranja (Por Cobrar)**: Mesa con consumo pendiente de cobro

#### Abrir Mesa
1. Hacer clic en una mesa **libre** (verde)
2. Seleccionar número de comensales (1 hasta la capacidad máxima)
3. Hacer clic en **"Abrir Mesa"**
4. La mesa cambia a estado "Ocupada"

## 🎨 Características Visuales

### Tablero Interactivo
- **Área de trabajo**: 600px de altura con scroll si es necesario
- **Drag & Drop**: Movimiento fluido con restricciones de ventana
- **Estados visuales**: Colores diferenciados por estado
- **Información en tiempo real**: Tiempo transcurrido, comensales, consumo

### Tarjetas de Mesa
- **Tamaño**: 128x112px (compactas pero informativas)
- **Información mostrada**:
  - Número de mesa
  - Estado actual
  - Comensales actuales/capacidad
  - Tiempo transcurrido (si está ocupada)
  - Total consumido (si hay pedidos)

### Panel de Gestión
- **Collapsible**: Se oculta por defecto para maximizar espacio del tablero
- **Grid responsivo**: Se adapta al tamaño de pantalla
- **Filtros visuales**: Distingue estados con colores y badges

## 🔄 Flujo de Trabajo Típico

1. **Configuración inicial**: Crear mesas físicas del local
2. **Apertura del local**: Acceder al módulo "Abrir Local"
3. **Llegada de clientes**: Hacer clic en mesa libre → seleccionar comensales → abrir
4. **Durante el servicio**: Ver tiempo transcurrido y estado en tiempo real
5. **Tomar pedidos**: [Por implementar - vista individual de mesa]
6. **Cerrar mesa**: [Por implementar - proceso de cobro]

## 🚧 Próximas Funcionalidades (Por Implementar)

### Vista Individual de Mesa
- Modal detallado al hacer clic en mesa ocupada
- Lista de pedidos y productos
- Agregar/quitar productos del pedido
- Cambiar estado de pedidos (pendiente → preparando → listo → entregado)
- Notas especiales por producto

### Gestión de Pedidos
- Integración con tabla de productos existente
- Cálculo automático de totales
- Historial de pedidos por mesa
- Impresión de comandas

### Proceso de Cobro
- Generar orden de venta desde sesión de mesa
- Múltiples medios de pago
- Cierre automático de sesión
- Integración con sistema de facturación

### Reportes y Análisis
- Tiempo promedio de ocupación por mesa
- Mesas más/menos utilizadas
- Consumo promedio por mesa
- Estadísticas de rotación

## 🛠️ Estructura Técnica

### Patrón de Arquitectura
- **Server Actions**: Lógica de negocio en el servidor con autenticación
- **Custom Hooks**: Gestión de estado local reactivo
- **Component Composition**: Componentes reutilizables y modulares
- **Type Safety**: TypeScript estricto en toda la aplicación

### Gestión de Estado
- **Estado local**: React.useState para UI
- **Estado global**: Custom hooks con useCallback/useEffect
- **Optimistic Updates**: Actualizaciones inmediatas con rollback en error
- **Cache Strategy**: Refetch automático después de operaciones críticas

### Seguridad
- **Autenticación**: Clerk integration
- **Autorización**: Verificación de permisos por rol
- **Validación**: Zod schemas en formularios
- **SQL Injection Protection**: Supabase client con prepared statements

## 🐛 Consideraciones y Limitaciones

### Limitaciones Actuales
- No hay persistencia de posiciones de mesa en caso de refresh
- Vista individual de mesa no implementada
- Sistema de pedidos pendiente
- No hay integración con cocina/bar

### Consideraciones de Performance
- Las consultas incluyen JOINs que pueden ser lentas con muchas mesas
- El drag & drop puede ser pesado en dispositivos móviles
- Actualizaciones en tiempo real dependen de refetch manual

### Recomendaciones de Uso
- **Máximo recomendado**: 50 mesas activas simultáneas
- **Resolución mínima**: 1024x768 para tablero completo
- **Conexión**: Estable a internet para sincronización
- **Roles**: Asignar permisos solo a personal autorizado

---

## 📞 Soporte

Para dudas o problemas con el módulo de mesas:

1. Verificar que el schema de BD esté correctamente aplicado
2. Confirmar permisos de usuario en tabla `permisos_usuarios`
3. Revisar logs del navegador para errores de JavaScript
4. Verificar conectividad con Supabase

¡El módulo está listo para uso básico y preparado para extensiones futuras! 🎉
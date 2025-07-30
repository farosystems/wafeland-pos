# Configuración de Seguridad - Server Actions

## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env.local`:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (for Server Actions - KEEP SECRET)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Configuración de la Base de Datos

### 1. Agregar campo clerk_user_id a la tabla usuarios

```sql
ALTER TABLE usuarios ADD COLUMN clerk_user_id TEXT;
CREATE INDEX idx_usuarios_clerk_user_id ON usuarios(clerk_user_id);
```

### 2. Actualizar usuarios existentes

```sql
-- Ejemplo: Actualizar un usuario específico
UPDATE usuarios 
SET clerk_user_id = 'user_2abc123def456' 
WHERE email = 'usuario@ejemplo.com';
```

## Estructura de Permisos

### Roles de Usuario:
- **admin**: Acceso completo a todas las funciones
- **supervisor**: Puede crear/editar clientes, artículos, ventas
- **cobrador**: Solo puede crear ventas y movimientos de stock

### Permisos por Tabla:

#### Clientes (entidades)
- **Leer**: Todos los usuarios autenticados
- **Crear/Editar**: admin, supervisor
- **Eliminar**: solo admin

#### Artículos (articulos)
- **Leer**: Todos los usuarios autenticados
- **Crear/Editar**: admin, supervisor
- **Eliminar**: solo admin

#### Ventas (ordenes_venta)
- **Leer**: Todos los usuarios autenticados
- **Crear**: admin, supervisor, cobrador
- **Editar**: admin, supervisor
- **Eliminar**: solo admin

#### Usuarios (usuarios)
- **Leer/Crear/Editar/Eliminar**: solo admin

#### Movimientos de Stock
- **Leer**: Todos los usuarios autenticados
- **Crear**: admin, supervisor, cobrador
- **Reportes por fecha**: admin, supervisor

## Migración de Código

### 1. Reemplazar imports en componentes

```typescript
// Antes (inseguro)
import { getArticles } from "@/services/articles";

// Después (seguro)
import { getArticles } from "@/app/actions/articles";
```

### 2. Usar hooks seguros

```typescript
// Antes
import { useArticles } from "@/hooks/use-articles";

// Después
import { useArticlesSecure } from "@/hooks/use-articles-secure";
```

### 3. Actualizar componentes de formulario

```typescript
// En lugar de llamar directamente a Supabase
const handleSubmit = async (data: CreateArticleData) => {
  try {
    await createArticle(data); // Server Action
    // Manejar éxito
  } catch (error) {
    // Manejar error
  }
};
```

## Beneficios de Seguridad

1. **Autenticación obligatoria**: Todas las operaciones requieren usuario autenticado
2. **Verificación de permisos**: Control granular por rol de usuario
3. **Clave de servicio oculta**: La clave de servicio no se expone al frontend
4. **Validación en servidor**: Todas las validaciones se ejecutan en el servidor
5. **Auditoría**: Cada operación está vinculada a un usuario específico

## Próximos Pasos

1. Configurar las variables de entorno
2. Actualizar la tabla usuarios con clerk_user_id
3. Migrar componentes uno por uno a Server Actions
4. Probar permisos con diferentes roles de usuario
5. Implementar logging de auditoría si es necesario

## Troubleshooting

### Error: "Usuario no encontrado en el sistema"
- Verificar que el usuario existe en la tabla usuarios
- Asegurar que clerk_user_id esté configurado correctamente

### Error: "No tienes permisos para..."
- Verificar el rol del usuario en la tabla usuarios
- Asegurar que el rol tenga los permisos necesarios

### Error: "No autorizado"
- Verificar que el usuario esté autenticado con Clerk
- Verificar la configuración de Clerk en el middleware 
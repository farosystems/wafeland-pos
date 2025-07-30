# Guía de Migración a Server Actions

## 🎯 Objetivo
Migrar tu aplicación de acceso directo a Supabase desde el frontend a Server Actions seguras con autenticación de Clerk.

## 📋 Checklist de Migración

### ✅ Completado
- [x] Server Actions creadas para todas las tablas principales
- [x] Hooks seguros implementados
- [x] Componente de artículos migrado como ejemplo
- [x] Documentación de configuración creada

### 🔄 Pendiente
- [ ] Configurar variables de entorno
- [ ] Actualizar base de datos
- [ ] Migrar componentes restantes
- [ ] Probar funcionalidad

## 🚀 Pasos para Completar la Migración

### Paso 1: Configurar Variables de Entorno

1. **Crear archivo `.env.local`** en la raíz del proyecto:

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

2. **Obtener las claves necesarias:**
   - **Clerk**: Desde el dashboard de Clerk
   - **Supabase**: Desde el dashboard de Supabase (Settings > API)

### Paso 2: Actualizar Base de Datos

Ejecutar en el SQL Editor de Supabase:

```sql
-- Agregar campo para Clerk User ID
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_usuarios_clerk_user_id ON usuarios(clerk_user_id);

-- Actualizar usuarios existentes (ejemplo)
UPDATE usuarios 
SET clerk_user_id = 'user_2abc123def456' 
WHERE email = 'tu_email@ejemplo.com';
```

### Paso 3: Migrar Componentes

#### Opción A: Migración Gradual (Recomendada)

1. **Migrar un componente a la vez:**
   ```typescript
   // Antes
   import { useArticles } from "@/hooks/use-articles";
   
   // Después
   import { useArticlesSecure } from "@/hooks/use-articles-secure";
   ```

2. **Actualizar imports en componentes:**
   ```typescript
   // Antes
   import { getClientes } from "@/services/clientes";
   
   // Después
   import { getClientes } from "@/app/actions/clientes";
   ```

#### Opción B: Migración Completa

Reemplazar todos los componentes de una vez:

1. **Clientes:**
   - `src/components/clientes/clientes-content.tsx` → usar `useClientesSecure`
   - `src/app/clientes/page.tsx` → actualizar import

2. **Ventas:**
   - `src/components/ventas/venta-form-dialog.tsx` → usar Server Actions
   - Actualizar imports de servicios

3. **Usuarios:**
   - `src/components/clientes/usuarios-content.tsx` → usar Server Actions
   - Actualizar imports

### Paso 4: Probar Funcionalidad

1. **Probar con diferentes roles:**
   - Admin: Acceso completo
   - Supervisor: Acceso limitado
   - Cobrador: Solo ventas

2. **Verificar errores de permisos:**
   - Intentar acceder sin autenticación
   - Intentar operaciones sin permisos

## 📁 Archivos Creados/Modificados

### Server Actions
- `src/app/actions/clientes.ts` ✅
- `src/app/actions/articles.ts` ✅
- `src/app/actions/ventas.ts` ✅
- `src/app/actions/usuarios.ts` ✅
- `src/app/actions/movimientos-stock.ts` ✅
- `src/app/actions/index.ts` ✅

### Hooks Seguros
- `src/hooks/use-articles-secure.ts` ✅
- `src/hooks/use-clientes-secure.ts` ✅

### Componentes Migrados
- `src/components/articles/articles-content-secure.tsx` ✅
- `src/app/articles/page.tsx` ✅ (actualizado)

### Documentación
- `SECURITY_SETUP.md` ✅
- `MIGRATION_GUIDE.md` ✅
- `setup-security.js` ✅
- `env-example.txt` ✅

## 🔧 Scripts de Ayuda

### Verificar Configuración
```bash
node setup-security.js
```

### Variables de Entorno Requeridas
Ver archivo `env-example.txt` para el template completo.

## 🚨 Troubleshooting

### Error: "Usuario no encontrado en el sistema"
- Verificar que el usuario existe en la tabla `usuarios`
- Asegurar que `clerk_user_id` esté configurado correctamente

### Error: "No tienes permisos para..."
- Verificar el rol del usuario en la tabla `usuarios`
- Asegurar que el rol tenga los permisos necesarios

### Error: "No autorizado"
- Verificar que el usuario esté autenticado con Clerk
- Verificar la configuración de Clerk en el middleware

### Error: "SUPABASE_SERVICE_ROLE_KEY is not defined"
- Agregar la variable `SUPABASE_SERVICE_ROLE_KEY` al archivo `.env.local`
- Reiniciar el servidor de desarrollo

## 🎉 Beneficios Obtenidos

1. **Seguridad mejorada**: Autenticación obligatoria y verificación de permisos
2. **Clave de servicio oculta**: No se expone al frontend
3. **Control granular**: Permisos específicos por rol y función
4. **Auditoría**: Cada operación vinculada a un usuario específico
5. **Validación en servidor**: Todas las validaciones se ejecutan en el servidor

## 📞 Siguiente Paso

Una vez que hayas configurado las variables de entorno y actualizado la base de datos, puedes:

1. **Probar el componente de artículos** que ya está migrado
2. **Migrar otros componentes** siguiendo el mismo patrón
3. **Implementar logging de auditoría** si es necesario
4. **Configurar RLS en Supabase** para capa adicional de seguridad

¿Necesitas ayuda con algún paso específico? 
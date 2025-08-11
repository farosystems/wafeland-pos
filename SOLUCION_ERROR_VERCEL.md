# Solución para Error de Server Components en Vercel

## Problema
Al subir el proyecto a Vercel y intentar crear un nuevo cliente, aparece un error de Server Components render con el mensaje: "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details."

## Causas Identificadas

1. **Manejo inadecuado de errores en Server Actions**
2. **Variables de entorno no configuradas correctamente en Vercel**
3. **Falta de manejo de errores global en la aplicación**
4. **Configuración de Next.js no optimizada para producción**

## Soluciones Implementadas

### 1. Mejora del Manejo de Errores en Server Actions

Se ha mejorado el archivo `src/app/actions/clientes.ts` con:
- Validación de variables de entorno al inicio
- Manejo de errores con try-catch en todas las funciones
- Mensajes de error más descriptivos
- Logging de errores para debugging

### 2. Componentes de Manejo de Errores

Se han creado archivos de manejo de errores:
- `src/app/error.tsx` - Error global de la aplicación
- `src/app/clientes/error.tsx` - Error específico de la página de clientes

### 3. Configuración Mejorada de Next.js

Se ha actualizado `next.config.ts` con:
- Configuración experimental para Server Components
- Headers de seguridad
- Configuración optimizada para Vercel

### 4. Configuración de Vercel

Se ha creado `vercel.json` con:
- Configuración específica para Next.js
- Timeouts aumentados para Server Actions
- Headers de seguridad

## Pasos para Solucionar el Problema

### 1. Verificar Variables de Entorno en Vercel

Asegúrate de que las siguientes variables estén configuradas en el dashboard de Vercel:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=tu_clerk_publishable_key
CLERK_SECRET_KEY=tu_clerk_secret_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Supabase Service Role Key (para Server Actions)
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
```

### 2. Verificar Configuración de Supabase

Asegúrate de que:
- La base de datos esté accesible desde Vercel
- Las políticas de RLS (Row Level Security) estén configuradas correctamente
- El usuario de servicio tenga los permisos necesarios

### 3. Verificar Configuración de Clerk

Asegúrate de que:
- Las URLs de redirección estén configuradas correctamente en Clerk
- El dominio de Vercel esté en la lista de dominios permitidos

### 4. Desplegar los Cambios

1. Haz commit de todos los cambios
2. Sube los cambios a tu repositorio
3. Vercel detectará automáticamente los cambios y hará un nuevo deploy

### 5. Verificar el Deploy

1. Ve al dashboard de Vercel
2. Verifica que el deploy se haya completado exitosamente
3. Revisa los logs del deploy para asegurarte de que no hay errores

## Verificación de la Solución

Después del deploy:

1. Ve a la página de clientes
2. Intenta crear un nuevo cliente
3. Verifica que no aparezca el error de Server Components
4. Si aparece algún error, revisa la consola del navegador y los logs de Vercel

## Debugging Adicional

Si el problema persiste:

1. **Revisar logs de Vercel**: Ve a Functions > View Function Logs
2. **Verificar variables de entorno**: Usa `console.log` temporalmente en las Server Actions
3. **Probar localmente**: Ejecuta `npm run build && npm start` para simular producción

## Archivos Modificados

- `src/app/actions/clientes.ts` - Mejorado manejo de errores
- `src/app/error.tsx` - Nuevo componente de error global
- `src/app/clientes/error.tsx` - Nuevo componente de error específico
- `next.config.ts` - Configuración mejorada
- `vercel.json` - Nueva configuración de Vercel
- `src/components/clientes/clientes-content-secure.tsx` - Mejorado manejo de errores

## Notas Importantes

- Los errores de Server Components en producción no muestran detalles específicos por seguridad
- Siempre usa try-catch en las Server Actions
- Valida las variables de entorno al inicio de las Server Actions
- Usa logging para debugging en producción

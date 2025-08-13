# Documentación Completa: Implementación de Autenticación con Clerk

## Índice
1. [Configuración Inicial](#configuración-inicial)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Configuración del Middleware](#configuración-del-middleware)
4. [Componentes de Autenticación](#componentes-de-autenticación)
5. [Sistema de Permisos](#sistema-de-permisos)
6. [Route Guard](#route-guard)
7. [Server Actions](#server-actions)
8. [Variables de Entorno](#variables-de-entorno)
9. [Flujo de Autenticación](#flujo-de-autenticación)
10. [Integración con Supabase](#integración-con-supabase)
11. [Sistema de Prueba Gratuita](#sistema-de-prueba-gratuita)

---

## Configuración Inicial

### 1. Instalación de Dependencias

```bash
npm install @clerk/nextjs @clerk/themes
```

### 2. Variables de Entorno Requeridas

Crear archivo `.env.local` con las siguientes variables:

```env
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

---

## Estructura de Archivos

### Archivos Principales de Autenticación

```
src/
├── middleware.ts                           # Middleware de Clerk
├── app/
│   ├── layout.tsx                         # Layout principal con ClerkProvider
│   ├── sign-in/[[...sign-in]]/page.tsx    # Página de inicio de sesión
│   ├── sign-up/[[...sign-up]]/page.tsx    # Página de registro
│   └── actions/                           # Server Actions con autenticación
├── components/
│   ├── route-guard.tsx                    # Componente de protección de rutas
│   ├── app-sidebar.tsx                    # Sidebar con información de usuario
│   └── user-info.tsx                      # Componente de información de usuario
├── lib/
│   └── auth-utils.ts                      # Utilidades de autenticación
└── hooks/
    └── use-trial-check.ts                 # Hook para verificación de prueba gratuita
```

---

## Configuración del Middleware

### Archivo: `src/middleware.ts`

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|api/webhooks).*)",
  ],
};
```

**Propósito**: 
- Intercepta todas las rutas excepto archivos estáticos y webhooks
- Maneja la autenticación automáticamente
- Redirige usuarios no autenticados a `/sign-in`

---

## Componentes de Autenticación

### 1. Layout Principal - `src/app/layout.tsx`

```typescript
import { ClerkProvider } from "@clerk/nextjs";
import { RouteGuard } from "@/components/route-guard";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body className="flex h-screen">
          <RouteGuard>
            <AppSidebar />
            <div className="flex flex-col flex-1 min-h-0">
              <main className="flex-1 overflow-y-auto bg-gray-50">
                {children}
              </main>
            </div>
          </RouteGuard>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### 2. Página de Inicio de Sesión - `src/app/sign-in/[[...sign-in]]/page.tsx`

```typescript
"use client";
import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";

export default function CustomSignIn() {
  const { signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!signIn) throw new Error("Clerk no está listo");
      const result = await signIn.create({
        identifier,
        password,
      });
      await setActive({ session: result.createdSessionId });
      window.location.href = "/home";
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <input
          type="text"
          placeholder="Email o usuario"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
        {error && <div className="text-red-600">{error}</div>}
      </form>
    </div>
  );
}
```

### 3. Página de Registro - `src/app/sign-up/[[...sign-up]]/page.tsx`

```typescript
"use client";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="relative w-full h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="z-10">
        <SignUp path="/sign-up" routing="path" />
      </div>
    </div>
  );
}
```

---

## Sistema de Permisos

### Archivo: `src/lib/auth-utils.ts`

```typescript
import { getUsuarios } from "@/services/usuarios";
import { getModulosUsuario } from "@/services/permisos";
import { currentUser } from "@clerk/nextjs/server";

export async function getUserPermissions() {
  try {
    const user = await currentUser();
    if (!user) return null;

    const usuarios = await getUsuarios();
    const userEmail = user.emailAddresses[0]?.emailAddress;
    const usuario = usuarios.find(u => u.email === userEmail);
    
    if (!usuario) return null;

    const modulosPermitidos = await getModulosUsuario(usuario.id);
    
    return {
      usuario,
      modulosPermitidos,
      esAdmin: usuario.rol === 'admin'
    };
  } catch (error) {
    console.error("Error obteniendo permisos:", error);
    return null;
  }
}
```

**Funcionalidad**:
- Obtiene el usuario actual de Clerk
- Busca el usuario correspondiente en la base de datos local
- Obtiene los módulos permitidos para ese usuario
- Retorna información de permisos y rol

---

## Route Guard

### Archivo: `src/components/route-guard.tsx`

```typescript
"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUsuarios } from "@/services/usuarios";
import { getModulosUsuario } from "@/services/permisos";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredModule?: string;
}

// Rutas públicas que no requieren autenticación
const publicRoutes = ["/sign-in", "/sign-up"];

export function RouteGuard({ children, requiredModule }: RouteGuardProps) {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usuarioDB, setUsuarioDB] = useState(null);
  const [modulosPermitidos, setModulosPermitidos] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedUser, setLastCheckedUser] = useState("");

  useEffect(() => {
    async function checkPermissions() {
      if (isChecking) return;
      
      // Si es una ruta pública, permitir acceso
      if (publicRoutes.includes(pathname)) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      if (!isSignedIn || !user) {
        setLoading(false);
        return;
      }

      setIsChecking(true);
      try {
        const userEmail = user.emailAddresses[0]?.emailAddress;
        
        // Verificar si ya tenemos los datos del usuario y no han cambiado
        if (lastCheckedUser === userEmail && usuarioDB && modulosPermitidos.length > 0) {
          const esAdmin = usuarioDB.rol === 'admin';
          
          if (esAdmin) {
            setHasAccess(true);
          } else {
            const route = pathname.replace('/', '');
            const moduleName = getModuleNameFromRoute(route);
            const tieneAcceso = modulosPermitidos.some(modulo => modulo.nombre === moduleName);
            setHasAccess(tieneAcceso);
          }
          setLoading(false);
          setIsChecking(false);
          return;
        }
        
        const usuarios = await getUsuarios();
        const usuario = usuarios.find(u => u.email === userEmail);
        
        if (usuario) {
          setUsuarioDB(usuario);
          setLastCheckedUser(userEmail);
          const modulos = await getModulosUsuario(usuario.id);
          setModulosPermitidos(modulos);
          
          const esAdmin = usuario.rol === 'admin';
          
          if (esAdmin) {
            setHasAccess(true);
          } else {
            const route = pathname.replace('/', '');
            const moduleName = getModuleNameFromRoute(route);
            const tieneAcceso = modulos.some(modulo => modulo.nombre === moduleName);
            setHasAccess(tieneAcceso);
          }
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error("Error verificando permisos:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
        setIsChecking(false);
      }
    }

    checkPermissions();
  }, [isSignedIn, user, pathname, requiredModule, isChecking]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Función auxiliar para mapear rutas a nombres de módulos
function getModuleNameFromRoute(route: string): string {
  const routeToModuleMap: Record<string, string> = {
    'articles': 'ARTICULOS',
    'clientes': 'CLIENTES',
    'ventas': 'VENTAS',
    'caja': 'CAJA',
    'empleados': 'EMPLEADOS',
    'seguridad': 'SEGURIDAD',
    // Agregar más mapeos según sea necesario
  };
  
  return routeToModuleMap[route] || route.toUpperCase();
}
```

**Funcionalidades**:
- Protege todas las rutas excepto las públicas
- Verifica permisos de usuario basados en módulos
- Cachea información de permisos para mejorar rendimiento
- Muestra pantalla de carga durante verificación
- Redirige usuarios no autenticados a `/sign-in`
- Muestra mensaje de acceso denegado si no tiene permisos

---

## Server Actions

### Estructura Típica de Server Action

```typescript
'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verificar permisos del usuario
async function checkUserPermissions() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('No autorizado');
  }
  
  // Verificar si el usuario existe en nuestra base de datos
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, rol, email')
    .eq('clerk_user_id', userId)
    .single();
    
  if (error || !usuario) {
    throw new Error('Usuario no encontrado en el sistema');
  }
  
  return usuario;
}

// Ejemplo de función que usa la verificación de permisos
export async function createArticle(data: CreateArticleData) {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear artículos');
  }
  
  // Lógica de creación del artículo
  const { data: article, error } = await supabase
    .from('articulos')
    .insert([data])
    .select()
    .single();
    
  if (error) throw error;
  return article;
}
```

**Características**:
- Usa `auth()` de Clerk para obtener el userId
- Verifica que el usuario exista en la base de datos local
- Implementa verificación de roles y permisos específicos
- Maneja errores de autorización

---

## Variables de Entorno

### Configuración Completa

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (for Server Actions - KEEP SECRET)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Notas importantes**:
- `NEXT_PUBLIC_*` variables son accesibles en el cliente
- `CLERK_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY` deben mantenerse secretas
- Solo usar en Server Actions y API routes

---

## Flujo de Autenticación

### 1. Usuario Accede a la Aplicación

```
Usuario → Middleware → Verificar Sesión
```

### 2. Si No Está Autenticado

```
Middleware → Redirigir a /sign-in → Página de Login
```

### 3. Login Exitoso

```
Login → Clerk Autentica → RouteGuard → Verificar Permisos → Acceso
```

### 4. Verificación de Permisos

```
RouteGuard → Obtener Usuario de Clerk → Buscar en DB Local → Obtener Módulos → Verificar Acceso
```

### 5. Server Actions

```
Cliente → Server Action → auth() → Verificar Usuario → Verificar Permisos → Ejecutar Lógica
```

---

## Integración con Supabase

### Tabla de Usuarios en Supabase

```sql
CREATE TABLE public.usuarios (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  clerk_user_id text UNIQUE,
  email text UNIQUE NOT NULL,
  nombre text,
  apellido text,
  rol text CHECK (rol IN ('admin', 'supervisor', 'cobrador', 'cajero')),
  activo boolean DEFAULT true,
  prueba_gratis boolean DEFAULT false,
  creado_el timestamp with time zone DEFAULT now(),
  maximo_cuenta_corriente numeric(10,2) DEFAULT 0
);
```

### Relación con Módulos

```sql
CREATE TABLE public.modulos (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL UNIQUE,
  descripcion text,
  icono text,
  ruta text,
  activo boolean DEFAULT true,
  orden integer DEFAULT 0,
  creado_el timestamp with time zone DEFAULT now()
);

CREATE TABLE public.permisos_usuarios (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  fk_id_usuario bigint REFERENCES usuarios(id),
  fk_id_modulo bigint REFERENCES modulos(id),
  activo boolean DEFAULT true,
  creado_el timestamp with time zone DEFAULT now()
);
```

---

## Sistema de Prueba Gratuita

### Hook: `src/hooks/use-trial-check.ts`

```typescript
import { useUser } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { getUsuarios } from "@/services/usuarios";

export function useTrialCheck() {
  const { user } = useUser();
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  const checkTrial = useCallback(async (onExpired?: () => void) => {
    try {
      const usuarios = await getUsuarios();
      const usuario = usuarios.find(u => u.email === user?.emailAddresses?.[0]?.emailAddress);
      if (usuario && usuario.prueba_gratis) {
        const creado = new Date(usuario.creado_el);
        const hoy = new Date();
        const diffMs = hoy.getTime() - creado.getTime();
        const diffDias = 15 - Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDias <= 0) {
          setIsTrialExpired(true);
          if (onExpired) onExpired();
          return true;
        }
      }
      setIsTrialExpired(false);
      return false;
    } catch {
      setIsTrialExpired(false);
      return false;
    }
  }, [user]);

  return { checkTrial, isTrialExpired };
}
```

**Funcionalidad**:
- Verifica si el usuario está en período de prueba gratuita
- Calcula días restantes (15 días por defecto)
- Permite ejecutar callback cuando expira la prueba
- Se integra con el sistema de autenticación de Clerk

---

## Componentes de UI

### UserButton Component

```typescript
import { UserButton } from "@clerk/nextjs";

// En el sidebar o header
<UserButton 
  appearance={{
    elements: {
      avatarBox: "w-8 h-8"
    }
  }}
/>
```

### Información de Usuario

```typescript
import { useUser } from "@clerk/nextjs";

export function UserInfo() {
  const { user, isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;
  return isSignedIn ? (
    <div className="flex items-center gap-4">
      <p className="text-sm font-medium">Hola, {user.lastName}</p>
    </div>
  ) : null;
}
```

---

## Configuración de Clerk Dashboard

### 1. Crear Aplicación en Clerk

1. Ir a [clerk.com](https://clerk.com)
2. Crear nueva aplicación
3. Configurar dominio y URLs de redirección

### 2. Configurar URLs

```
Sign-in URL: http://localhost:3000/sign-in
Sign-up URL: http://localhost:3000/sign-up
After sign-in URL: http://localhost:3000/home
After sign-up URL: http://localhost:3000/home
```

### 3. Configurar Métodos de Autenticación

- Email/Password
- OAuth providers (Google, GitHub, etc.)
- Configurar campos personalizados si es necesario

---

## Mejores Prácticas

### 1. Seguridad

- Nunca exponer `CLERK_SECRET_KEY` en el cliente
- Usar `SUPABASE_SERVICE_ROLE_KEY` solo en Server Actions
- Validar permisos en cada Server Action
- Implementar rate limiting si es necesario

### 2. Rendimiento

- Cachear información de permisos en RouteGuard
- Usar `useMemo` y `useCallback` para optimizar re-renders
- Implementar loading states apropiados

### 3. UX

- Mostrar pantallas de carga durante verificación
- Proporcionar mensajes de error claros
- Implementar redirecciones automáticas
- Mantener estado de autenticación consistente

### 4. Mantenimiento

- Centralizar lógica de permisos en `auth-utils.ts`
- Usar tipos TypeScript para mejor seguridad
- Documentar cambios en permisos y roles
- Implementar logging para debugging

---

## Troubleshooting

### Problemas Comunes

1. **Usuario no encontrado en DB local**
   - Verificar sincronización entre Clerk y Supabase
   - Implementar webhook para crear usuarios automáticamente

2. **Permisos no se actualizan**
   - Verificar cache en RouteGuard
   - Forzar revalidación de permisos

3. **Errores de CORS**
   - Verificar configuración de dominios en Clerk
   - Configurar correctamente las URLs de redirección

4. **Problemas de Middleware**
   - Verificar matcher configuration
   - Asegurar que las rutas públicas estén excluidas

---

## Conclusión

Esta implementación proporciona un sistema de autenticación robusto y escalable usando Clerk como proveedor de autenticación y Supabase como base de datos local para permisos y roles. El sistema incluye:

- Autenticación segura con Clerk
- Sistema de permisos basado en módulos
- Protección de rutas con RouteGuard
- Server Actions con verificación de permisos
- Sistema de prueba gratuita
- Integración completa con Supabase

La arquitectura es modular y fácil de mantener, permitiendo agregar nuevos roles, módulos y funcionalidades según sea necesario.


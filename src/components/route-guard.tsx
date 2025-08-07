"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUsuarios } from "@/services/usuarios";
import { getModulosUsuario } from "@/services/permisos";
import { Usuario } from "@/types/usuario";
import { Modulo } from "@/types/permisos";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredModule?: string;
}

export function RouteGuard({ children, requiredModule }: RouteGuardProps) {
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [usuarioDB, setUsuarioDB] = useState<Usuario | null>(null);
  const [modulosPermitidos, setModulosPermitidos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedUser, setLastCheckedUser] = useState<string | null>(null);

  // Rutas públicas que no requieren verificación de permisos
  const publicRoutes = ['/home', '/sign-in', '/sign-up', '/'];
  
  const getModuleNameFromRoute = (route: string) => {
    const reverseRouteMap: { [key: string]: string } = {
      'dashboard': 'dashboard',
      'articles': 'articulos',
      'ventas': 'ventas',
      'clientes': 'clientes',
      'usuarios': 'usuarios',
      'informes': 'informes',
      'configuracion': 'configuracion',
      'stock-faltante': 'stock-faltante',
      'importacion-stock': 'importacion-stock',
      'movimientos-stock': 'movimientos-stock',
      'talles-colores': 'talles-colores',
      'variantes-productos': 'variantes-productos',
      'agrupadores': 'agrupadores',
      'pagos': 'pagos',
      'cuentas-corrientes': 'cuentas-corrientes',
      'caja': 'caja',
      'gastos-empleados': 'gastos-empleados',
      'liquidaciones': 'liquidaciones',
      'empleados': 'empleados',
      'seguridad': 'seguridad',
      'mis-ventas': 'mis-ventas',
    };
    
    return reverseRouteMap[route] || route;
  };

  useEffect(() => {
    async function checkPermissions() {
      // Evitar múltiples llamadas simultáneas
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
          // Usar datos en cache
          const esAdmin = usuarioDB.rol === 'admin' || usuarioDB.rol === 'supervisor';
          
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
          
          // Verificar acceso
          const esAdmin = usuario.rol === 'admin' || usuario.rol === 'supervisor';
          
          if (esAdmin) {
            setHasAccess(true);
          } else {
            // Verificar si tiene acceso a la ruta específica
            const route = pathname.replace('/', '');
            const moduleName = getModuleNameFromRoute(route);
            const tieneAcceso = modulos.some(modulo => modulo.nombre === moduleName);
            setHasAccess(tieneAcceso);
          }
        } else {
          // Si no se encuentra el usuario, denegar acceso
          setHasAccess(false);
        }
      } catch (error) {
        console.error("Error verificando permisos:", error);
        // En caso de error, denegar acceso
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

  // Para rutas públicas, no verificar autenticación
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  // Mostrar acceso denegado si no tiene acceso
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-600 mb-2">
              Acceso Denegado
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              No tienes permisos para acceder a esta página
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-500">
                Tu rol: <span className="font-semibold capitalize text-gray-700">{usuarioDB?.rol || 'Usuario'}</span>
              </p>
              <p className="text-sm text-gray-500">
                Módulos disponibles: <span className="font-semibold text-gray-700">{modulosPermitidos.length}</span>
              </p>
              <p className="text-xs text-gray-400">
                Ruta intentada: {pathname}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => router.push("/home")}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                Ir a Inicio
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.back()}
                className="w-full"
                size="lg"
              >
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
} 
"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUsuarios } from "@/services/usuarios";
import { getModulosUsuario } from "@/services/permisos";
import { Usuario } from "@/types/usuario";
import { Modulo } from "@/types/permisos";
import { 
  Calendar, 
  Clock, 
  User, 
  Shield, 
  TrendingUp, 
  Package,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  BarChart3,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [usuarioDB, setUsuarioDB] = useState<Usuario | null>(null);
  const [modulosPermitidos, setModulosPermitidos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      if (isSignedIn && user) {
        try {
          const usuarios = await getUsuarios();
          const userEmail = user.emailAddresses[0]?.emailAddress;
          const usuario = usuarios.find(u => u.email === userEmail);
          
          if (usuario) {
            setUsuarioDB(usuario);
            const modulos = await getModulosUsuario(usuario.id);
            setModulosPermitidos(modulos);
          }
        } catch (error) {
          console.error("Error cargando datos del usuario:", error);
        } finally {
          setLoading(false);
        }
      } else if (isLoaded && !isSignedIn) {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [isSignedIn, isLoaded, user]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Sistema de Punto de Venta (POS)
        </h1>
        <p className="text-muted-foreground mb-6">
          Debés iniciar sesión para continuar
        </p>
        <Button onClick={() => router.push("/sign-in")}>
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    
    if (hours < 12) return "Buenos días";
    if (hours < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getModuleIcon = (nombreModulo: string) => {
    const iconMap: { [key: string]: any } = {
      'dashboard': TrendingUp,
      'articulos': Package,
      'ventas': ShoppingCart,
      'clientes': Users,
      'usuarios': User,
      'informes': FileText,
      'configuracion': Settings,
      'stock-faltante': BarChart3,
      'importacion-stock': Package,
      'movimientos-stock': TrendingUp,
      'talles-colores': Package,
      'variantes-productos': Package,
      'agrupadores': Package,
      'pagos': ShoppingCart,
      'cuentas-corrientes': Users,
      'caja': ShoppingCart,
      'gastos-empleados': ShoppingCart,
      'liquidaciones': Users,
      'empleados': Users,
      'seguridad': Shield,
      'mis-ventas': ShoppingCart,
    };
    
    return iconMap[nombreModulo] || Home;
  };

  const getModuleColor = (nombreModulo: string) => {
    const colorMap: { [key: string]: string } = {
      'dashboard': 'bg-blue-500',
      'articulos': 'bg-green-500',
      'ventas': 'bg-purple-500',
      'clientes': 'bg-orange-500',
      'usuarios': 'bg-red-500',
      'informes': 'bg-indigo-500',
      'configuracion': 'bg-gray-500',
      'stock-faltante': 'bg-yellow-500',
      'importacion-stock': 'bg-teal-500',
      'movimientos-stock': 'bg-pink-500',
      'talles-colores': 'bg-cyan-500',
      'variantes-productos': 'bg-emerald-500',
      'agrupadores': 'bg-violet-500',
      'pagos': 'bg-rose-500',
      'cuentas-corrientes': 'bg-sky-500',
      'caja': 'bg-lime-500',
      'gastos-empleados': 'bg-amber-500',
      'liquidaciones': 'bg-fuchsia-500',
      'empleados': 'bg-slate-500',
      'seguridad': 'bg-red-600',
      'mis-ventas': 'bg-blue-600',
    };
    
    return colorMap[nombreModulo] || 'bg-gray-500';
  };

  const getModuleRoute = (nombreModulo: string) => {
    const routeMap: { [key: string]: string } = {
      'dashboard': 'dashboard',
      'articulos': 'articles',
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
    
    return routeMap[nombreModulo] || nombreModulo;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header con saludo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {getCurrentTime()}, {usuarioDB?.nombre || user?.firstName || 'Usuario'}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Bienvenido al Sistema de Punto de Venta
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{getCurrentDate()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <Badge variant="secondary" className="ml-2">
              {usuarioDB?.rol || 'Usuario'}
            </Badge>
          </div>
        </div>

        {/* Módulos disponibles */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Módulos Disponibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modulosPermitidos.map((modulo) => {
              const IconComponent = getModuleIcon(modulo.nombre);
              const colorClass = getModuleColor(modulo.nombre);
              
              return (
                <Card 
                  key={modulo.id} 
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-md"
                  onClick={() => {
                    const route = getModuleRoute(modulo.nombre);
                    console.log('Navegando a:', route, 'para módulo:', modulo.nombre);
                    router.push(`/${route}`);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 ${colorClass} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {modulo.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg mb-2">{modulo.descripcion}</CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      {modulo.nombre}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Módulos Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{modulosPermitidos.length}</div>
              <p className="text-blue-100 text-sm">Módulos disponibles para ti</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Rol de Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold capitalize">{usuarioDB?.rol || 'Usuario'}</div>
              <p className="text-green-100 text-sm">Tu nivel de acceso</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">Activo</div>
              <p className="text-purple-100 text-sm">Sesión iniciada correctamente</p>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Acciones Rápidas
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              Ir al Dashboard
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => router.push("/ventas")}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Nueva Venta
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => router.push("/articulos")}
              className="flex items-center gap-2"
            >
              <Package className="w-5 h-5" />
              Gestionar Artículos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 
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
      esAdmin: usuario.rol === 'admin' || usuario.rol === 'supervisor'
    };
  } catch (error) {
    console.error("Error obteniendo permisos:", error);
    return null;
  }
}

export function canAccessRoute(pathname: string, modulosPermitidos: any[], esAdmin: boolean): boolean {
  // Admins y supervisores pueden acceder a todo
  if (esAdmin) return true;

  // Rutas públicas que no requieren permisos
  const publicRoutes = ['/home', '/sign-in', '/sign-up'];
  if (publicRoutes.includes(pathname)) return true;

  // Verificar si la ruta corresponde a un módulo permitido
  const route = pathname.replace('/', '');
  return modulosPermitidos.some(modulo => modulo.ruta === route);
}

export function getRedirectPath(modulosPermitidos: any[]): string {
  // Si no hay módulos permitidos, redirigir a home
  if (modulosPermitidos.length === 0) {
    return '/home';
  }

  // Buscar el dashboard primero
  const dashboard = modulosPermitidos.find(modulo => modulo.nombre === 'dashboard');
  if (dashboard) {
    return `/${dashboard.ruta}`;
  }

  // Si no hay dashboard, usar el primer módulo disponible
  return `/${modulosPermitidos[0].ruta}`;
} 
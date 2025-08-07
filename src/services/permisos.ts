import { supabase } from "@/lib/supabaseClient";
import {
  Modulo,
  PermisoUsuario,
  PermisoUsuarioConDetalles,
  CreatePermisoUsuarioData,
  UpdatePermisoUsuarioData
} from "@/types/permisos";

// Obtener todos los módulos activos
export async function getModulos(): Promise<Modulo[]> {
  const { data, error } = await supabase
    .from("modulos")
    .select("*")
    .eq("activo", true)
    .order("orden");

  if (error) {
    console.error("Error obteniendo módulos:", error);
    throw error;
  }

  return data || [];
}

// Obtener permisos de un usuario específico
export async function getPermisosUsuario(usuarioId: number): Promise<PermisoUsuarioConDetalles[]> {
  const { data, error } = await supabase
    .from("permisos_usuarios")
    .select(`
      *,
      modulo:modulos(*),
      usuario:usuarios(id, nombre, email, rol)
    `)
    .eq("fk_id_usuario", usuarioId);

  if (error) {
    console.error("Error obteniendo permisos del usuario:", error);
    throw error;
  }

  // Ordenar por orden del módulo en el cliente
  const sortedData = (data || []).sort((a, b) => {
    return (a.modulo?.orden || 0) - (b.modulo?.orden || 0);
  });

  return sortedData;
}

// Obtener todos los permisos con detalles
export async function getAllPermisosConDetalles(): Promise<PermisoUsuarioConDetalles[]> {
  const { data, error } = await supabase
    .from("permisos_usuarios")
    .select(`
      *,
      modulo:modulos(*),
      usuario:usuarios(id, nombre, email, rol)
    `);

  if (error) {
    console.error("Error obteniendo todos los permisos:", error);
    throw error;
  }

  // Ordenar los datos en el cliente
  const sortedData = (data || []).sort((a, b) => {
    // Primero por nombre de usuario
    const userComparison = (a.usuario?.nombre || '').localeCompare(b.usuario?.nombre || '');
    if (userComparison !== 0) return userComparison;
    
    // Luego por orden del módulo
    return (a.modulo?.orden || 0) - (b.modulo?.orden || 0);
  });

  return sortedData;
}

// Crear un nuevo permiso
export async function createPermiso(permiso: CreatePermisoUsuarioData): Promise<PermisoUsuario> {
  const { data, error } = await supabase
    .from("permisos_usuarios")
    .insert(permiso)
    .select()
    .single();

  if (error) {
    console.error("Error creando permiso:", error);
    throw error;
  }

  return data;
}

// Actualizar un permiso existente
export async function updatePermiso(permisoId: number, updates: UpdatePermisoUsuarioData): Promise<PermisoUsuario> {
  const { data, error } = await supabase
    .from("permisos_usuarios")
    .update({ ...updates, actualizado_el: new Date().toISOString() })
    .eq("id", permisoId)
    .select()
    .single();

  if (error) {
    console.error("Error actualizando permiso:", error);
    throw error;
  }

  return data;
}

// Actualizar permisos en lote para un usuario
export async function updatePermisosUsuarioLote(usuarioId: number, permisos: { [moduloId: number]: UpdatePermisoUsuarioData }): Promise<void> {
  // Primero, obtener los permisos existentes del usuario
  const { data: permisosExistentes, error: errorGet } = await supabase
    .from("permisos_usuarios")
    .select("*")
    .eq("fk_id_usuario", usuarioId);

  if (errorGet) {
    console.error("Error obteniendo permisos existentes:", errorGet);
    throw errorGet;
  }

  // Crear un mapa de permisos existentes por módulo
  const permisosExistentesMap = new Map(
    permisosExistentes?.map(p => [p.fk_id_modulo, p]) || []
  );

  // Preparar las operaciones de upsert
  const updates = Object.entries(permisos).map(([moduloId, permiso]) => {
    const moduloIdNum = parseInt(moduloId);
    const permisoExistente = permisosExistentesMap.get(moduloIdNum);
    
    return {
      id: permisoExistente?.id, // Incluir ID si existe para actualizar
      fk_id_usuario: usuarioId,
      fk_id_modulo: moduloIdNum,
      ...permiso,
      actualizado_el: new Date().toISOString()
    };
  });

  const { error } = await supabase
    .from("permisos_usuarios")
    .upsert(updates, { 
      onConflict: 'fk_id_usuario,fk_id_modulo',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error("Error actualizando permisos en lote:", error);
    throw error;
  }
}

// Eliminar un permiso
export async function deletePermiso(permisoId: number): Promise<void> {
  const { error } = await supabase
    .from("permisos_usuarios")
    .delete()
    .eq("id", permisoId);

  if (error) {
    console.error("Error eliminando permiso:", error);
    throw error;
  }
}

// Obtener permisos de un usuario para un módulo específico
export async function getPermisoUsuarioModulo(usuarioId: number, moduloId: number): Promise<PermisoUsuario | null> {
  const { data, error } = await supabase
    .from("permisos_usuarios")
    .select("*")
    .eq("fk_id_usuario", usuarioId)
    .eq("fk_id_modulo", moduloId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error obteniendo permiso específico:", error);
    throw error;
  }

  return data;
}

// Verificar si un usuario puede ver un módulo específico
export async function verificarPermiso(usuarioId: number, moduloId: number): Promise<boolean> {
  const permiso = await getPermisoUsuarioModulo(usuarioId, moduloId);
  return permiso?.puede_ver || false;
}

// Obtener módulos que puede ver un usuario
export async function getModulosUsuario(usuarioId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from("permisos_usuarios")
    .select(`
      puede_ver,
      modulo:modulos(*)
    `)
    .eq("fk_id_usuario", usuarioId)
    .eq("puede_ver", true);

  if (error) {
    console.error("Error obteniendo módulos del usuario:", error);
    throw error;
  }

  // Ordenar por orden del módulo en el cliente
  const sortedData = (data || [])
    .map(item => item.modulo)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));

  return sortedData;
}

// Crear permisos por defecto para un usuario (basado en su rol)
export async function crearPermisosPorDefecto(usuarioId: number, rol: string): Promise<void> {
  const modulos = await getModulos();
  
  // Verificar permisos existentes
  const { data: permisosExistentes, error: errorGet } = await supabase
    .from("permisos_usuarios")
    .select("fk_id_modulo")
    .eq("fk_id_usuario", usuarioId);

  if (errorGet) {
    console.error("Error obteniendo permisos existentes:", errorGet);
    throw errorGet;
  }

  // Crear un set de módulos que ya tienen permisos
  const modulosConPermisos = new Set(permisosExistentes?.map(p => p.fk_id_modulo) || []);
  
  // Filtrar solo los módulos que no tienen permisos
  const permisos = modulos
    .filter(modulo => !modulosConPermisos.has(modulo.id))
    .map(modulo => ({
      fk_id_usuario: usuarioId,
      fk_id_modulo: modulo.id,
      puede_ver: getPuedeVerPorRol(rol, modulo.nombre)
    }));

  // Solo insertar si hay permisos nuevos para crear
  if (permisos.length > 0) {
    const { error } = await supabase
      .from("permisos_usuarios")
      .insert(permisos);

    if (error) {
      console.error("Error creando permisos por defecto:", error);
      throw error;
    }
  }
}

// Función auxiliar para determinar si un usuario puede ver un módulo según su rol
function getPuedeVerPorRol(rol: string, nombreModulo: string): boolean {
  switch (rol) {
    case 'admin':
    case 'supervisor':
      return true;
    case 'vendedor':
      return ['dashboard', 'articulos', 'clientes', 'ventas', 'mis-ventas', 'movimientos-stock', 'importacion-stock', 'stock-faltante', 'talles-colores', 'variantes-productos', 'agrupadores', 'informes'].includes(nombreModulo);
    case 'cobrador':
      return ['dashboard', 'ventas', 'mis-ventas', 'pagos', 'cuentas-corrientes', 'caja', 'informes'].includes(nombreModulo);
    default:
      return false;
  }
}

// Crear un nuevo módulo
export async function createModulo(modulo: {
  nombre: string;
  descripcion?: string;
  icono?: string;
  ruta?: string;
  activo?: boolean;
  orden?: number;
}): Promise<Modulo> {
  const { data, error } = await supabase
    .from("modulos")
    .insert(modulo)
    .select()
    .single();

  if (error) {
    console.error("Error creando módulo:", error);
    throw error;
  }

  return data;
}

// Actualizar un módulo existente
export async function updateModulo(moduloId: number, updates: {
  nombre?: string;
  descripcion?: string;
  icono?: string;
  ruta?: string;
  activo?: boolean;
  orden?: number;
}): Promise<Modulo> {
  const { data, error } = await supabase
    .from("modulos")
    .update(updates)
    .eq("id", moduloId)
    .select()
    .single();

  if (error) {
    console.error("Error actualizando módulo:", error);
    throw error;
  }

  return data;
}

// Eliminar un módulo
export async function deleteModulo(moduloId: number): Promise<void> {
  const { error } = await supabase
    .from("modulos")
    .delete()
    .eq("id", moduloId);

  if (error) {
    console.error("Error eliminando módulo:", error);
    throw error;
  }
} 
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
    // Si no existe en nuestra DB, verificar por email
    const { userId } = await auth();
    if (userId) {
      // Obtener información del usuario de Clerk
      const { data: user } = await supabase
        .from('usuarios')
        .select('id, rol, email')
        .eq('clerk_user_id', userId)
        .single();
        
      if (user) {
        return user;
      }
    }
    throw new Error('Usuario no encontrado en el sistema');
  }
  
  return usuario;
}

export async function getMovimientosStock() {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select(`*, talle:fk_id_talle(descripcion), color:fk_id_color(descripcion)`)
    .order("id", { ascending: false });
    
  if (error) throw error;
  
  return (data as Array<{
    id: number;
    fk_id_orden: number | null;
    fk_id_articulos: number;
    origen: string;
    tipo: string;
    cantidad: number;
    fk_id_talle: number | null;
    fk_id_color: number | null;
    creado_el: string;
    talle?: { descripcion: string };
    color?: { descripcion: string };
  }>).map(m => ({
    ...m,
    talle_descripcion: m.talle?.descripcion || '-',
    color_descripcion: m.color?.descripcion || '-',
  }));
}

export async function createMovimientoStock(mov: {
  fk_id_orden: number | null;
  fk_id_articulos: number;
  origen: string;
  tipo: string;
  cantidad: number;
  fk_id_talle?: number | null;
  fk_id_color?: number | null;
  stock_actual?: number | null;
}) {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para crear movimientos de stock
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor' && usuario.rol !== 'cobrador') {
    throw new Error('No tienes permisos para crear movimientos de stock');
  }
  
  const { data, error } = await supabase
    .from("movimientos_stock")
    .insert([
      {
        fk_id_orden: mov.fk_id_orden,
        fk_id_articulos: mov.fk_id_articulos,
        origen: mov.origen,
        tipo: mov.tipo,
        cantidad: mov.cantidad,
        fk_id_talle: mov.fk_id_talle,
        fk_id_color: mov.fk_id_color,
        stock_actual: mov.stock_actual,
        creado_el: new Date().toISOString(),
      }
    ])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getMovimientosStockByArticulo(articuloId: number) {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select(`*, talle:fk_id_talle(descripcion), color:fk_id_color(descripcion)`)
    .eq("fk_id_articulos", articuloId)
    .order("creado_el", { ascending: false });
    
  if (error) throw error;
  
  return (data as Array<{
    id: number;
    fk_id_orden: number | null;
    fk_id_articulos: number;
    origen: string;
    tipo: string;
    cantidad: number;
    fk_id_talle: number | null;
    fk_id_color: number | null;
    creado_el: string;
    talle?: { descripcion: string };
    color?: { descripcion: string };
  }>).map(m => ({
    ...m,
    talle_descripcion: m.talle?.descripcion || '-',
    color_descripcion: m.color?.descripcion || '-',
  }));
}

export async function getMovimientosStockByDateRange(fechaInicio: string, fechaFin: string) {
  const usuario = await checkUserPermissions();
  
  // Solo administradores y supervisores pueden ver reportes por fecha
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para ver reportes de stock');
  }
  
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select(`*, talle:fk_id_talle(descripcion), color:fk_id_color(descripcion)`)
    .gte("creado_el", fechaInicio)
    .lte("creado_el", fechaFin)
    .order("creado_el", { ascending: false });
    
  if (error) throw error;
  
  return (data as Array<{
    id: number;
    fk_id_orden: number | null;
    fk_id_articulos: number;
    origen: string;
    tipo: string;
    cantidad: number;
    fk_id_talle: number | null;
    fk_id_color: number | null;
    creado_el: string;
    talle?: { descripcion: string };
    color?: { descripcion: string };
  }>).map(m => ({
    ...m,
    talle_descripcion: m.talle?.descripcion || '-',
    color_descripcion: m.color?.descripcion || '-',
  }));
} 
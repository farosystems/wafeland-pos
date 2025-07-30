'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUserPermissions() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('No autorizado');
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, rol, email')
    .eq('clerk_user_id', userId)
    .single();

  if (!usuario) {
    throw new Error('Usuario no encontrado en el sistema');
  }

  return usuario;
}

export async function getOrdenesVentaDetalle() {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .select("*")
    .order("idd", { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function createOrdenVentaDetalle(detalle: any) {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear detalles de órdenes de venta');
  }
  
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .insert([detalle])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateOrdenVentaDetalle(id: number, detalle: any) {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar detalles de órdenes de venta');
  }
  
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .update(detalle)
    .eq("idd", id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteOrdenVentaDetalle(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar detalles de órdenes de venta');
  }
  
  const { error } = await supabase
    .from("ordenes_venta_detalle")
    .delete()
    .eq("idd", id);
    
  if (error) throw error;
}

export async function getOrdenVentaDetalleById(id: number) {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .select("*")
    .eq("idd", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data;
} 
'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Liquidacion, CreateLiquidacionData } from '@/types/liquidacion';

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

export async function getLiquidaciones(): Promise<Liquidacion[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("liquidaciones")
    .select("*")
    .order("id", { ascending: false });
    
  if (error) throw error;
  return data as Liquidacion[];
}

export async function createLiquidacion(liquidacion: CreateLiquidacionData): Promise<Liquidacion> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear liquidaciones');
  }
  
  const { data, error } = await supabase
    .from("liquidaciones")
    .insert([liquidacion])
    .select()
    .single();
    
  if (error) throw error;
  return data as Liquidacion;
}

export async function updateLiquidacion(id: number, liquidacion: Partial<CreateLiquidacionData>): Promise<Liquidacion> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar liquidaciones');
  }
  
  const { data, error } = await supabase
    .from("liquidaciones")
    .update(liquidacion)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Liquidacion;
}

export async function deleteLiquidacion(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar liquidaciones');
  }
  
  const { error } = await supabase
    .from("liquidaciones")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getLiquidacionById(id: number): Promise<Liquidacion | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("liquidaciones")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as Liquidacion;
} 
'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { TipoGasto, CreateTipoGastoData } from '@/types/tipoGasto';

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

export async function getTiposGasto(): Promise<TipoGasto[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("tipo_gasto")
    .select("*")
    .order("id", { ascending: true });
    
  if (error) throw error;
  return data as TipoGasto[];
}

export async function createTipoGasto(tipoGasto: CreateTipoGastoData): Promise<TipoGasto> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear tipos de gasto');
  }
  
  const { data, error } = await supabase
    .from("tipo_gasto")
    .insert([tipoGasto])
    .select()
    .single();
    
  if (error) throw error;
  return data as TipoGasto;
}

export async function updateTipoGasto(id: number, tipoGasto: Partial<CreateTipoGastoData>): Promise<TipoGasto> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar tipos de gasto');
  }
  
  const { data, error } = await supabase
    .from("tipo_gasto")
    .update(tipoGasto)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as TipoGasto;
}

export async function deleteTipoGasto(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar tipos de gasto');
  }
  
  const { error } = await supabase
    .from("tipo_gasto")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getTipoGastoById(id: number): Promise<TipoGasto | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("tipo_gasto")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as TipoGasto;
} 
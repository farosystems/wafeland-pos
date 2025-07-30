'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { LoteOperacion, CreateLoteOperacionData } from '@/types/loteOperacion';

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

export async function getLotesOperaciones(): Promise<LoteOperacion[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .select("*")
    .order("id_lote", { ascending: false });
    
  if (error) throw error;
  return data as LoteOperacion[];
}

export async function createLoteOperacion(lote: CreateLoteOperacionData): Promise<LoteOperacion> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear lotes de operaciones');
  }
  
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .insert([lote])
    .select()
    .single();
    
  if (error) throw error;
  return data as LoteOperacion;
}

export async function updateLoteOperacion(id: number, lote: Partial<CreateLoteOperacionData>): Promise<LoteOperacion> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar lotes de operaciones');
  }
  
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .update(lote)
    .eq("id_lote", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as LoteOperacion;
}

export async function deleteLoteOperacion(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar lotes de operaciones');
  }
  
  const { error } = await supabase
    .from("lotes_operaciones")
    .delete()
    .eq("id_lote", id);
    
  if (error) throw error;
}

export async function getLoteOperacionById(id: number): Promise<LoteOperacion | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .select("*")
    .eq("id_lote", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as LoteOperacion;
} 
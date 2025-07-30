'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Caja, CreateCajaData } from '@/types/caja';

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

export async function getCajas(): Promise<Caja[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("cajas")
    .select("*");
    
  if (error) throw error;
  return data as Caja[];
}

export async function createCaja(caja: CreateCajaData): Promise<Caja> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear cajas');
  }
  
  const { data, error } = await supabase
    .from("cajas")
    .insert([caja])
    .select()
    .single();
    
  if (error) throw error;
  return data as Caja;
}

export async function updateCaja(id: number, caja: Partial<CreateCajaData>): Promise<Caja> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar cajas');
  }
  
  const { data, error } = await supabase
    .from("cajas")
    .update(caja)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Caja;
}

export async function deleteCaja(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar cajas');
  }
  
  const { error } = await supabase
    .from("cajas")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getCajaById(id: number): Promise<Caja | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("cajas")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as Caja;
} 
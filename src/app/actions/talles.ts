'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Talle, CreateTalleData, UpdateTalleData } from '@/types/talle';

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

export async function getTalles(): Promise<Talle[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("talles")
    .select("*")
    .order("id", { ascending: true });
    
  if (error) throw error;
  return data as Talle[];
}

export async function createTalle(talle: CreateTalleData): Promise<Talle> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear talles');
  }
  
  const { data, error } = await supabase
    .from("talles")
    .insert([talle])
    .select()
    .single();
    
  if (error) throw error;
  return data as Talle;
}

export async function updateTalle(id: number, talle: UpdateTalleData): Promise<Talle> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar talles');
  }
  
  const { data, error } = await supabase
    .from("talles")
    .update(talle)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Talle;
}

export async function deleteTalle(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar talles');
  }
  
  const { error } = await supabase
    .from("talles")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getTalleById(id: number): Promise<Talle | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("talles")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as Talle;
} 
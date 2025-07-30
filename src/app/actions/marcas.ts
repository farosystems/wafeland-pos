'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Marca, CreateMarcaData, UpdateMarcaData } from '@/types/marca';

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

export async function getMarcas(): Promise<Marca[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("marcas")
    .select("*")
    .order("id", { ascending: true });
    
  if (error) throw error;
  return data as Marca[];
}

export async function createMarca(marca: CreateMarcaData): Promise<Marca> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear marcas');
  }
  
  const { data, error } = await supabase
    .from("marcas")
    .insert([marca])
    .select()
    .single();
    
  if (error) throw error;
  return data as Marca;
}

export async function updateMarca(id: number, marca: UpdateMarcaData): Promise<Marca> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar marcas');
  }
  
  const { data, error } = await supabase
    .from("marcas")
    .update(marca)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Marca;
}

export async function deleteMarca(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar marcas');
  }
  
  const { error } = await supabase
    .from("marcas")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getMarcaById(id: number): Promise<Marca | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("marcas")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as Marca;
} 
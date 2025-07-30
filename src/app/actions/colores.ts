'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Color, CreateColorData, UpdateColorData } from '@/types/color';

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

export async function getColores(): Promise<Color[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("color")
    .select("*")
    .order("id", { ascending: true });
    
  if (error) throw error;
  return data as Color[];
}

export async function createColor(color: CreateColorData): Promise<Color> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear colores');
  }
  
  const { data, error } = await supabase
    .from("color")
    .insert([color])
    .select()
    .single();
    
  if (error) throw error;
  return data as Color;
}

export async function updateColor(id: number, color: UpdateColorData): Promise<Color> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar colores');
  }
  
  const { data, error } = await supabase
    .from("color")
    .update(color)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Color;
}

export async function deleteColor(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar colores');
  }
  
  const { error } = await supabase
    .from("color")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getColorById(id: number): Promise<Color | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("color")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as Color;
} 
'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Agrupador, CreateAgrupadorData, UpdateAgrupadorData } from '@/types/agrupador';

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

export async function getAgrupadores(): Promise<Agrupador[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("agrupadores")
    .select("*")
    .order("id", { ascending: false });
    
  if (error) throw error;
  return data as Agrupador[];
}

export async function createAgrupador(agrupador: CreateAgrupadorData): Promise<Agrupador> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear agrupadores');
  }
  
  const { data, error } = await supabase
    .from("agrupadores")
    .insert([agrupador])
    .select()
    .single();
    
  if (error) throw error;
  return data as Agrupador;
}

export async function updateAgrupador(id: number, agrupador: UpdateAgrupadorData): Promise<Agrupador> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar agrupadores');
  }
  
  const { data, error } = await supabase
    .from("agrupadores")
    .update(agrupador)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Agrupador;
}

export async function deleteAgrupador(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar agrupadores');
  }
  
  const { error } = await supabase
    .from("agrupadores")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getAgrupadorById(id: number): Promise<Agrupador | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("agrupadores")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as Agrupador;
} 
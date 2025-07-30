'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { GastoEmpleado, CreateGastoEmpleadoData } from '@/types/gastoEmpleado';

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

export async function getGastosEmpleados(): Promise<GastoEmpleado[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("gastos_empleados")
    .select("*")
    .order("id", { ascending: false });
    
  if (error) throw error;
  return data as GastoEmpleado[];
}

export async function createGastoEmpleado(gasto: CreateGastoEmpleadoData): Promise<GastoEmpleado> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear gastos de empleados');
  }
  
  const { data, error } = await supabase
    .from("gastos_empleados")
    .insert([gasto])
    .select()
    .single();
    
  if (error) throw error;
  return data as GastoEmpleado;
}

export async function updateGastoEmpleado(id: number, gasto: Partial<CreateGastoEmpleadoData>): Promise<GastoEmpleado> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar gastos de empleados');
  }
  
  const { data, error } = await supabase
    .from("gastos_empleados")
    .update(gasto)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as GastoEmpleado;
}

export async function deleteGastoEmpleado(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar gastos de empleados');
  }
  
  const { error } = await supabase
    .from("gastos_empleados")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getGastoEmpleadoById(id: number): Promise<GastoEmpleado | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("gastos_empleados")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as GastoEmpleado;
} 
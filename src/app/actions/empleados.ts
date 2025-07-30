'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Empleado, CreateEmpleadoData } from '@/types/empleado';

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

export async function getEmpleados(): Promise<Empleado[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("empleados")
    .select("*")
    .order("nombre", { ascending: true });
    
  if (error) throw error;
  return data as Empleado[];
}

export async function createEmpleado(empleado: CreateEmpleadoData): Promise<Empleado> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear empleados');
  }
  
  const { data, error } = await supabase
    .from("empleados")
    .insert([empleado])
    .select()
    .single();
    
  if (error) throw error;
  return data as Empleado;
}

export async function updateEmpleado(id: number, empleado: Partial<CreateEmpleadoData>): Promise<Empleado> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar empleados');
  }
  
  const { data, error } = await supabase
    .from("empleados")
    .update(empleado)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Empleado;
}

export async function deleteEmpleado(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar empleados');
  }
  
  const { error } = await supabase
    .from("empleados")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getEmpleadoById(id: number): Promise<Empleado | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as Empleado;
} 
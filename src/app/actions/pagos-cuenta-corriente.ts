'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

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

export async function getPagosCuentaCorriente() {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("pagos_cuenta_corriente")
    .select("*")
    .order("id", { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function createPagoCuentaCorriente(pago: any) {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear pagos de cuenta corriente');
  }
  
  const { data, error } = await supabase
    .from("pagos_cuenta_corriente")
    .insert([pago])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updatePagoCuentaCorriente(id: number, pago: any) {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar pagos de cuenta corriente');
  }
  
  const { data, error } = await supabase
    .from("pagos_cuenta_corriente")
    .update(pago)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deletePagoCuentaCorriente(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar pagos de cuenta corriente');
  }
  
  const { error } = await supabase
    .from("pagos_cuenta_corriente")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getPagoCuentaCorrienteById(id: number) {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("pagos_cuenta_corriente")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data;
} 
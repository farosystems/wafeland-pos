'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { CuentaCorriente } from '@/types/cuentaCorriente';

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

export async function getCuentasCorrientes(): Promise<CuentaCorriente[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("cuentas_corrientes")
    .select("*");
    
  if (error) throw error;
  return data as CuentaCorriente[];
}

export async function getCuentaCorrienteById(id: number): Promise<CuentaCorriente | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("cuentas_corrientes")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as CuentaCorriente;
}

export async function getCuentaCorrienteByCliente(clienteId: number): Promise<CuentaCorriente | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("cuentas_corrientes")
    .select("*")
    .eq("fk_id_cliente", clienteId)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as CuentaCorriente;
} 
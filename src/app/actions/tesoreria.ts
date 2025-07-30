'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verificar permisos del usuario
async function checkUserPermissions() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('No autorizado');
  }
  
  // Verificar si el usuario existe en nuestra base de datos
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, rol, email')
    .eq('clerk_user_id', userId)
    .single();
    
  if (error || !usuario) {
    // Si no existe en nuestra DB, verificar por email
    const { userId } = await auth();
    if (userId) {
      // Obtener información del usuario de Clerk
      const { data: user } = await supabase
        .from('usuarios')
        .select('id, rol, email')
        .eq('clerk_user_id', userId)
        .single();
        
      if (user) {
        return user;
      }
    }
    throw new Error('Usuario no encontrado en el sistema');
  }
  
  return usuario;
}

export async function getCuentasTesoreria() {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .select("*")
    .order("id", { ascending: true });
    
  if (error) throw error;
  return data;
}

export async function createCuentaTesoreria(cuenta: {
  descripcion: string;
  activo?: boolean;
}) {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para crear cuentas de tesorería
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear cuentas de tesorería');
  }
  
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .insert([cuenta])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateCuentaTesoreria(id: number, cuenta: {
  descripcion?: string;
  activo?: boolean;
}) {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para actualizar cuentas de tesorería
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar cuentas de tesorería');
  }
  
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .update(cuenta)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
} 
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

export async function getTiposComprobantes() {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("tipos_comprobantes")
    .select("*")
    .order("id", { ascending: true });
    
  if (error) throw error;
  return data;
}

export async function createTipoComprobante(tipo: {
  descripcion: string;
  activo?: boolean;
  reingresa_stock?: boolean;
}) {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para crear tipos de comprobantes
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear tipos de comprobantes');
  }
  
  const { data, error } = await supabase
    .from("tipos_comprobantes")
    .insert([tipo])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateTipoComprobante(id: number, tipo: {
  descripcion?: string;
  activo?: boolean;
  reingresa_stock?: boolean;
}) {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para actualizar tipos de comprobantes
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar tipos de comprobantes');
  }
  
  const { data, error } = await supabase
    .from("tipos_comprobantes")
    .update(tipo)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
} 
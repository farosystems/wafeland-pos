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

export async function getLoteAbierto() {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .select("*")
    .eq("estado", "abierto")
    .order("id", { ascending: false })
    .limit(1)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    throw error;
  }
  
  return data;
}

export async function createLote(lote: {
  descripcion: string;
  fecha_inicio: string;
  estado?: string;
}) {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para crear lotes
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear lotes');
  }
  
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .insert([lote])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateLote(id: number, lote: {
  descripcion?: string;
  fecha_fin?: string;
  estado?: string;
}) {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para actualizar lotes
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar lotes');
  }
  
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .update(lote)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
} 
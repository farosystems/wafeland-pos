'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Usuario, CreateUsuarioData } from '@/types/usuario';

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

export async function getUsuarios(): Promise<Usuario[]> {
  const usuario = await checkUserPermissions();
  
  // Solo administradores pueden ver todos los usuarios
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para ver usuarios');
  }
  
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("id", { ascending: false });
    
  if (error) throw error;
  return data as Usuario[];
}

export async function createUsuario(usuario: CreateUsuarioData): Promise<Usuario> {
  const currentUser = await checkUserPermissions();
  
  // Solo administradores pueden crear usuarios
  if (currentUser.rol !== 'admin') {
    throw new Error('No tienes permisos para crear usuarios');
  }
  
  const { data, error } = await supabase
    .from("usuarios")
    .insert([usuario])
    .select()
    .single();
    
  if (error) throw error;
  return data as Usuario;
}

export async function updateUsuario(id: number, usuario: Partial<CreateUsuarioData>): Promise<Usuario> {
  const currentUser = await checkUserPermissions();
  
  // Solo administradores pueden actualizar usuarios
  if (currentUser.rol !== 'admin') {
    throw new Error('No tienes permisos para actualizar usuarios');
  }
  
  const { data, error } = await supabase
    .from("usuarios")
    .update(usuario)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Usuario;
}

export async function deleteUsuario(id: number): Promise<void> {
  const currentUser = await checkUserPermissions();
  
  // Solo administradores pueden eliminar usuarios
  if (currentUser.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar usuarios');
  }
  
  // No permitir eliminar el propio usuario
  if (currentUser.id === id) {
    throw new Error('No puedes eliminar tu propio usuario');
  }
  
  const { error } = await supabase
    .from("usuarios")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getUsuarioById(id: number): Promise<Usuario | null> {
  const currentUser = await checkUserPermissions();
  
  // Solo administradores pueden ver usuarios específicos
  if (currentUser.rol !== 'admin') {
    throw new Error('No tienes permisos para ver usuarios');
  }
  
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    throw error;
  }
  
  return data as Usuario;
}

export async function getCurrentUser(): Promise<Usuario | null> {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }
  
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    throw error;
  }
  
  return data as Usuario;
}

// Función para verificación de prueba gratis (accesible para todos los usuarios autenticados)
export async function getUsuariosForTrialCheck(): Promise<Usuario[]> {
  await checkUserPermissions(); // Solo verificar autenticación
  
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, email, prueba_gratis, creado_el")
    .order("id", { ascending: false });
    
  if (error) throw error;
  return data as Usuario[];
} 
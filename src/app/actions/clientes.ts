'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Cliente, CreateClienteData } from '@/types/cliente';

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

export async function getClientes(): Promise<Cliente[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("entidades")
    .select("*")
    .order("razon_social", { ascending: true });
    
  if (error) throw error;
  return data as Cliente[];
}

export async function createCliente(cliente: CreateClienteData): Promise<Cliente> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para crear clientes
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear clientes');
  }
  
  const { data, error } = await supabase
    .from("entidades")
    .insert([cliente])
    .select()
    .single();
    
  if (error) throw error;
  return data as Cliente;
}

export async function updateCliente(id: number, cliente: Partial<CreateClienteData>): Promise<Cliente> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para actualizar clientes
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar clientes');
  }
  
  const { data, error } = await supabase
    .from("entidades")
    .update(cliente)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Cliente;
}

export async function deleteCliente(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para eliminar clientes
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar clientes');
  }
  
  const { error } = await supabase
    .from("entidades")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getClienteById(id: number): Promise<Cliente | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("entidades")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    throw error;
  }
  
  return data as Cliente;
} 
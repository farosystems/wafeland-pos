'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Cliente, CreateClienteData } from '@/types/cliente';

// Verificar que las variables de entorno estén disponibles
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variables de entorno de Supabase no configuradas correctamente');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verificar permisos del usuario
async function checkUserPermissions() {
  try {
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
  } catch (error) {
    console.error('Error en checkUserPermissions:', error);
    throw new Error('Error de autenticación: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

export async function getClientes(): Promise<Cliente[]> {
  try {
    await checkUserPermissions();
    
    const { data, error } = await supabase
      .from("entidades")
      .select("*")
      .order("razon_social", { ascending: true });
      
    if (error) {
      console.error('Error en getClientes:', error);
      throw new Error('Error al obtener clientes: ' + error.message);
    }
    
    return data as Cliente[];
  } catch (error) {
    console.error('Error en getClientes:', error);
    throw new Error('Error al obtener clientes: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

export async function createCliente(cliente: CreateClienteData): Promise<Cliente> {
  try {
    const usuario = await checkUserPermissions();
    
    // Verificar permisos específicos para crear clientes
    if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
      throw new Error('No tienes permisos para crear clientes');
    }
    
    // Validaciones básicas
    if (!cliente.razon_social?.trim()) {
      throw new Error('La razón social es requerida');
    }
    
    if (!cliente.email?.trim()) {
      throw new Error('El email es requerido');
    }
    
    if (!cliente.num_doc?.trim()) {
      throw new Error('El número de documento es requerido');
    }
    
    const { data, error } = await supabase
      .from("entidades")
      .insert([cliente])
      .select()
      .single();
      
    if (error) {
      console.error('Error en createCliente:', error);
      throw new Error('Error al crear cliente: ' + error.message);
    }
    
    return data as Cliente;
  } catch (error) {
    console.error('Error en createCliente:', error);
    throw new Error('Error al crear cliente: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

export async function updateCliente(id: number, cliente: Partial<CreateClienteData>): Promise<Cliente> {
  try {
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
      
    if (error) {
      console.error('Error en updateCliente:', error);
      throw new Error('Error al actualizar cliente: ' + error.message);
    }
    
    return data as Cliente;
  } catch (error) {
    console.error('Error en updateCliente:', error);
    throw new Error('Error al actualizar cliente: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

export async function deleteCliente(id: number): Promise<void> {
  try {
    const usuario = await checkUserPermissions();
    
    // Verificar permisos específicos para eliminar clientes
    if (usuario.rol !== 'admin') {
      throw new Error('No tienes permisos para eliminar clientes');
    }
    
    const { error } = await supabase
      .from("entidades")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error('Error en deleteCliente:', error);
      throw new Error('Error al eliminar cliente: ' + error.message);
    }
  } catch (error) {
    console.error('Error en deleteCliente:', error);
    throw new Error('Error al eliminar cliente: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

export async function getClienteById(id: number): Promise<Cliente | null> {
  try {
    await checkUserPermissions();
    
    const { data, error } = await supabase
      .from("entidades")
      .select("*")
      .eq("id", id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      console.error('Error en getClienteById:', error);
      throw new Error('Error al obtener cliente: ' + error.message);
    }
    
    return data as Cliente;
  } catch (error) {
    console.error('Error en getClienteById:', error);
    throw new Error('Error al obtener cliente: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
} 
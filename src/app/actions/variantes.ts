'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Variante, CreateVarianteData, UpdateVarianteData } from '@/types/variante';

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

export async function getVariantes(): Promise<Variante[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("variantes_articulos")
    .select(`*,
      articulo:fk_id_articulo(descripcion),
      talle:fk_id_talle(descripcion),
      color:fk_id_color(descripcion)
    `)
    .order("id", { ascending: true });
    
  if (error) throw error;
  
  return (data as any[]).map(v => ({
    ...v,
    articulo_descripcion: v.articulo?.descripcion || '',
    talle_descripcion: v.talle?.descripcion || '',
    color_descripcion: v.color?.descripcion || '',
  })) as Variante[];
}

export async function addVariante(variante: CreateVarianteData): Promise<Variante> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para crear variantes
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear variantes');
  }
  
  const { data, error } = await supabase
    .from("variantes_articulos")
    .insert([variante])
    .select()
    .single();
    
  if (error) throw error;
  return data as Variante;
}

export async function editVariante(id: number, variante: UpdateVarianteData): Promise<Variante> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para actualizar variantes
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar variantes');
  }
  
  const { data, error } = await supabase
    .from("variantes_articulos")
    .update(variante)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Variante;
}

export async function deleteVariante(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para eliminar variantes
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar variantes');
  }
  
  const { error } = await supabase
    .from("variantes_articulos")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getVarianteById(id: number): Promise<Variante | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("variantes_articulos")
    .select(`*,
      articulo:fk_id_articulo(descripcion),
      talle:fk_id_talle(descripcion),
      color:fk_id_color(descripcion)
    `)
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    throw error;
  }
  
  return {
    ...data,
    articulo_descripcion: data.articulo?.descripcion || '',
    talle_descripcion: data.talle?.descripcion || '',
    color_descripcion: data.color?.descripcion || '',
  } as Variante;
} 
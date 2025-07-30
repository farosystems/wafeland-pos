'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Article, CreateArticleData, UpdateArticleData } from '@/types/article';

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

export async function getArticles(): Promise<Article[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("articulos")
    .select(`*, fk_id_marca, fk_id_agrupador`)
    .order("id", { ascending: false });
    
  if (error) throw error;

  // Traer todas las marcas y agrupadores para mapear manualmente
  const { data: marcas } = await supabase.from("marcas").select("id, descripcion");
  const { data: agrupadores } = await supabase.from("agrupadores").select("id, nombre");

  // Mapear nombres/descripciones de foráneas
  const mapped = (data as unknown[]).map(a => {
    const marca = marcas?.find((m: any) => m.id === (a as any).fk_id_marca);
    const agrupador = agrupadores?.find((g: any) => g.id === (a as any).fk_id_agrupador);
    return {
      ...(a as Record<string, unknown>),
      marca_nombre: marca?.descripcion || '-',
      agrupador_nombre: agrupador?.nombre || '-',
    };
  });
  
  return mapped as Article[];
}

export async function createArticle(article: CreateArticleData): Promise<Article> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para crear artículos
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear artículos');
  }
  
  const { data, error } = await supabase
    .from("articulos")
    .insert([article])
    .select()
    .single();
    
  if (error) throw error;
  return data as Article;
}

export async function updateArticle(id: number, article: UpdateArticleData): Promise<Article> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para actualizar artículos
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar artículos');
  }
  
  const { data, error } = await supabase
    .from("articulos")
    .update(article)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Article;
}

export async function deleteArticle(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para eliminar artículos
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar artículos');
  }
  
  const { error } = await supabase
    .from("articulos")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getArticleById(id: number): Promise<Article | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("articulos")
    .select(`*, fk_id_marca, fk_id_agrupador`)
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    throw error;
  }
  
  // Mapear nombres de foráneas
  const { data: marcas } = await supabase.from("marcas").select("id, descripcion");
  const { data: agrupadores } = await supabase.from("agrupadores").select("id, nombre");
  
  const marca = marcas?.find((m: any) => m.id === (data as any).fk_id_marca);
  const agrupador = agrupadores?.find((g: any) => g.id === (data as any).fk_id_agrupador);
  
  return {
    ...data,
    marca_nombre: marca?.descripcion || '-',
    agrupador_nombre: agrupador?.nombre || '-',
  } as Article;
} 
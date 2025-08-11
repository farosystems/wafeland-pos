'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Article, CreateArticleData, UpdateArticleData } from '@/types/article';

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

export async function getArticles(): Promise<Article[]> {
  try {
    await checkUserPermissions();
    
    const { data, error } = await supabase
      .from("articulos")
      .select(`*, fk_id_marca, fk_id_agrupador`)
      .order("id", { ascending: false });
      
    if (error) {
      console.error('Error en getArticles:', error);
      throw new Error('Error al obtener artículos: ' + error.message);
    }

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
  } catch (error) {
    console.error('Error en getArticles:', error);
    throw new Error('Error al obtener artículos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

export async function createArticle(article: CreateArticleData): Promise<Article> {
  try {
    const usuario = await checkUserPermissions();
    
    // Verificar permisos específicos para crear artículos
    if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
      throw new Error('No tienes permisos para crear artículos. Solo administradores y supervisores pueden crear artículos.');
    }
    
    // Validaciones básicas
    if (!article.descripcion?.trim()) {
      throw new Error('La descripción del artículo es requerida');
    }
    
    if (!article.precio_unitario || article.precio_unitario <= 0) {
      throw new Error('El precio unitario debe ser mayor a 0');
    }
    
    if (!article.fk_id_agrupador) {
      throw new Error('El agrupador es requerido');
    }
    
    const { data, error } = await supabase
      .from("articulos")
      .insert([article])
      .select()
      .single();
      
    if (error) {
      console.error('Error en createArticle:', error);
      throw new Error('Error al crear artículo: ' + error.message);
    }
    
    return data as Article;
  } catch (error) {
    console.error('Error en createArticle:', error);
    throw new Error('Error al crear artículo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

export async function updateArticle(id: number, article: UpdateArticleData): Promise<Article> {
  try {
    const usuario = await checkUserPermissions();
    
    // Verificar permisos específicos para actualizar artículos
    if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
      throw new Error('No tienes permisos para actualizar artículos. Solo administradores y supervisores pueden actualizar artículos.');
    }
    
    const { data, error } = await supabase
      .from("articulos")
      .update(article)
      .eq("id", id)
      .select()
      .single();
      
    if (error) {
      console.error('Error en updateArticle:', error);
      throw new Error('Error al actualizar artículo: ' + error.message);
    }
    
    return data as Article;
  } catch (error) {
    console.error('Error en updateArticle:', error);
    throw new Error('Error al actualizar artículo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

export async function deleteArticle(id: number): Promise<void> {
  try {
    const usuario = await checkUserPermissions();
    
    // Verificar permisos específicos para eliminar artículos
    if (usuario.rol !== 'admin') {
      throw new Error('No tienes permisos para eliminar artículos. Solo administradores pueden eliminar artículos.');
    }
    
    const { error } = await supabase
      .from("articulos")
      .delete()
      .eq("id", id);
      
    if (error) {
      console.error('Error en deleteArticle:', error);
      throw new Error('Error al eliminar artículo: ' + error.message);
    }
  } catch (error) {
    console.error('Error en deleteArticle:', error);
    throw new Error('Error al eliminar artículo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
}

export async function getArticleById(id: number): Promise<Article | null> {
  try {
    await checkUserPermissions();
    
    const { data, error } = await supabase
      .from("articulos")
      .select(`*, fk_id_marca, fk_id_agrupador`)
      .eq("id", id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      console.error('Error en getArticleById:', error);
      throw new Error('Error al obtener artículo: ' + error.message);
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
  } catch (error) {
    console.error('Error en getArticleById:', error);
    throw new Error('Error al obtener artículo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
} 
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

    // Cargar artículos sin JOIN complejo
    const { data, error } = await supabase
      .from("articulos")
      .select(`*, fk_id_marca, fk_id_agrupador, equivalencia, es_combo`)
      .order("id", { ascending: false });
      
    if (error) {
      console.error('Error en getArticles:', error);
      throw new Error('Error al obtener artículos: ' + error.message);
    }

    // Traer todas las marcas y agrupadores para mapear manualmente
    const { data: marcas } = await supabase.from("marcas").select("id, descripcion");
    const { data: agrupadores } = await supabase.from("agrupadores").select("id, nombre");

    // Cargar componentes de todos los combos por separado (sin JOIN para evitar ambigüedades)
    const { data: componentesData } = await supabase
      .from('articulos_combo_detalle')
      .select('id, fk_articulo_combo, fk_articulo_componente, cantidad, created_at');

    console.log('🔍 Componentes cargados:', componentesData);

    // Cargar datos de artículos componentes por separado
    const articulosComponentesMap = new Map();
    if (componentesData && componentesData.length > 0) {
      const idsComponentes = [...new Set(componentesData.map(comp => comp.fk_articulo_componente))];
      const { data: articulosComponentes } = await supabase
        .from('articulos')
        .select('id, descripcion, stock, precio_unitario')
        .in('id', idsComponentes);

      articulosComponentes?.forEach(art => {
        articulosComponentesMap.set(art.id, art);
      });
    }

    // Mapear nombres/descripciones de foráneas y componentes
    const mapped = (data as unknown[]).map(a => {
      const marca = marcas?.find((m: any) => m.id === (a as any).fk_id_marca);
      const agrupador = agrupadores?.find((g: any) => g.id === (a as any).fk_id_agrupador);

      // Encontrar componentes de este artículo si es combo
      const componentesDelCombo = componentesData?.filter(comp => comp.fk_articulo_combo === (a as any).id) || [];
      const componentes = componentesDelCombo.map(comp => ({
        id: comp.id,
        fk_articulo_combo: comp.fk_articulo_combo,
        fk_articulo_componente: comp.fk_articulo_componente,
        cantidad: comp.cantidad,
        created_at: comp.created_at,
        articulo_componente: articulosComponentesMap.get(comp.fk_articulo_componente) || undefined
      }));

      console.log(`🔍 Artículo ${(a as any).id} (${(a as any).descripcion}):`, {
        es_combo: (a as any).es_combo,
        componentes_encontrados: componentes.length,
        componentes: componentes
      });

      return {
        ...(a as Record<string, unknown>),
        marca_nombre: marca?.descripcion || '-',
        agrupador_nombre: agrupador?.nombre || '-',
        componentes: componentes
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

    // Validar componentes si es combo
    if (article.es_combo && (!article.componentes || article.componentes.length === 0)) {
      throw new Error('Un combo debe tener al menos un componente');
    }

    console.log('🔧 CreateArticle llamado con:', article);

    const { componentes, ...articleData } = article;

    // Preparar los datos para insertar (solo campos válidos de la tabla)
    const datosInsercion = {
      descripcion: articleData.descripcion,
      precio_unitario: articleData.precio_unitario,
      fk_id_agrupador: articleData.fk_id_agrupador,
      fk_id_marca: articleData.fk_id_marca,
      activo: articleData.activo,
      stock: articleData.stock || 0,
      stock_minimo: articleData.stock_minimo || 0,
      equivalencia: articleData.equivalencia,
      mark_up: articleData.mark_up,
      precio_costo: articleData.precio_costo,
      es_combo: articleData.es_combo || false,
    };

    console.log('🔧 Datos de inserción:', datosInsercion);

    const { data, error } = await supabase
      .from("articulos")
      .insert([datosInsercion])
      .select()
      .single();

    if (error) {
      console.error('❌ Error en createArticle:', error);
      throw new Error('Error al crear artículo: ' + error.message);
    }

    console.log('✅ Artículo creado:', data);

    // Si es un combo y tiene componentes, insertarlos
    if (article.es_combo && componentes && componentes.length > 0) {
      console.log('🧩 Insertando componentes del combo...');
      console.log('🧩 Componentes:', componentes);

      const componentesData = componentes.map(comp => ({
        fk_articulo_combo: data.id,
        fk_articulo_componente: comp.fk_articulo_componente,
        cantidad: comp.cantidad
      }));

      console.log('🧩 Datos preparados para inserción:', componentesData);

      const { data: insertedComponents, error: componentesError } = await supabase
        .from("articulos_combo_detalle")
        .insert(componentesData)
        .select();

      if (componentesError) {
        console.error('❌ Error al insertar componentes:', componentesError);
        // Si falla la inserción de componentes, eliminar el artículo creado
        await supabase.from("articulos").delete().eq("id", data.id);
        throw new Error('Error al crear componentes del combo: ' + componentesError.message);
      }

      console.log('✅ Componentes insertados exitosamente:', insertedComponents);
    }

    return data as Article;
  } catch (error) {
    console.error('❌ Error en createArticle:', error);
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
    
    // Obtener el artículo actual para calcular el nuevo stock
    const { data: articuloActual, error: errorActual } = await supabase
      .from("articulos")
      .select("stock")
      .eq("id", id)
      .single();
      
    if (errorActual) {
      console.error('Error al obtener artículo actual:', errorActual);
      throw new Error('Error al obtener el artículo actual');
    }
    
    // Calcular el nuevo stock si se proporcionan ajustes
    let nuevoStock = articuloActual.stock;
    if (article.stock !== undefined) {
      nuevoStock = article.stock;
    }
    
    const { componentes, ...articleData } = article;

    // Preparar los datos para actualizar (sin los campos de ajuste)
    const datosActualizacion = {
      descripcion: articleData.descripcion,
      precio_unitario: articleData.precio_unitario,
      fk_id_agrupador: articleData.fk_id_agrupador,
      fk_id_marca: articleData.fk_id_marca,
      activo: articleData.activo,
      stock: nuevoStock,
      stock_minimo: articleData.stock_minimo,
      equivalencia: articleData.equivalencia,
      mark_up: articleData.mark_up,
      precio_costo: articleData.precio_costo,
      es_combo: articleData.es_combo,
    };
    
    const { data, error } = await supabase
      .from("articulos")
      .update(datosActualizacion)
      .eq("id", id)
      .select()
      .single();
      
    if (error) {
      console.error('Error en updateArticle:', error);
      throw new Error('Error al actualizar artículo: ' + error.message);
    }

    // Si es un combo, actualizar los componentes
    if (article.es_combo !== undefined) {
      console.log('🧩 Actualizando componentes del combo...');

      // Primero eliminar todos los componentes existentes
      const { error: deleteError } = await supabase
        .from("articulos_combo_detalle")
        .delete()
        .eq("fk_articulo_combo", id);

      if (deleteError) {
        console.error('❌ Error al eliminar componentes existentes:', deleteError);
        throw new Error('Error al actualizar componentes: ' + deleteError.message);
      }

      // Si es combo y tiene componentes, insertarlos
      if (article.es_combo && componentes && componentes.length > 0) {
        const componentesData = componentes.map(comp => ({
          fk_articulo_combo: id,
          fk_articulo_componente: comp.fk_articulo_componente,
          cantidad: comp.cantidad
        }));

        console.log('🧩 Datos de componentes para actualizar:', componentesData);

        const { data: insertedComponents, error: componentesError } = await supabase
          .from("articulos_combo_detalle")
          .insert(componentesData)
          .select();

        if (componentesError) {
          console.error('❌ Error al insertar componentes actualizados:', componentesError);
          throw new Error('Error al actualizar componentes: ' + componentesError.message);
        }

        console.log('✅ Componentes actualizados exitosamente:', insertedComponents);
      }
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
      .select(`*, fk_id_marca, fk_id_agrupador, equivalencia, es_combo`)
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

    // Cargar componentes del combo por separado (sin JOIN para evitar ambigüedades)
    const { data: componentesData } = await supabase
      .from('articulos_combo_detalle')
      .select('id, fk_articulo_combo, fk_articulo_componente, cantidad, created_at')
      .eq('fk_articulo_combo', id);

    // Cargar datos de los artículos componentes por separado
    const componentes = [];
    if (componentesData && componentesData.length > 0) {
      for (const comp of componentesData) {
        const { data: articuloComponente } = await supabase
          .from('articulos')
          .select('id, descripcion, stock, precio_unitario')
          .eq('id', comp.fk_articulo_componente)
          .single();

        componentes.push({
          id: comp.id,
          fk_articulo_combo: comp.fk_articulo_combo,
          fk_articulo_componente: comp.fk_articulo_componente,
          cantidad: comp.cantidad,
          created_at: comp.created_at,
          articulo_componente: articuloComponente || undefined
        });
      }
    }

    return {
      ...data,
      marca_nombre: marca?.descripcion || '-',
      agrupador_nombre: agrupador?.nombre || '-',
      componentes: componentes
    } as Article;
  } catch (error) {
    console.error('Error en getArticleById:', error);
    throw new Error('Error al obtener artículo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
} 
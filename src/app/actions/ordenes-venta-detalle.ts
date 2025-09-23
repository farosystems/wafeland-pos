'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUserPermissions() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('No autorizado');
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, rol, email')
    .eq('clerk_user_id', userId)
    .single();

  if (!usuario) {
    throw new Error('Usuario no encontrado en el sistema');
  }

  return usuario;
}

export async function getOrdenesVentaDetalle() {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .select("*")
    .order("idd", { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function createOrdenVentaDetalle(detalle: any) {
  const usuario = await checkUserPermissions();

  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear detalles de órdenes de venta');
  }

  // Insertar el detalle de venta
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .insert([detalle])
    .select()
    .single();

  if (error) throw error;

  // Procesar consumo de leche si el artículo tiene equivalencia > 0
  try {
    console.log('🥛 INICIO: Verificando consumo de leche para artículo:', detalle.fk_id_articulo);

    // Obtener la equivalencia del artículo vendido
    const { data: articulo, error: articuloError } = await supabase
      .from("articulos")
      .select("equivalencia, descripcion")
      .eq("id", detalle.fk_id_articulo)
      .single();

    console.log('🥛 ARTICULO:', articulo, 'ERROR:', articuloError);

    if (!articuloError && articulo && articulo.equivalencia && articulo.equivalencia > 0) {
      console.log('🥛 PROCESANDO CONSUMO:', {
        orden: detalle.fk_id_orden,
        articulo: detalle.fk_id_articulo,
        cantidad: detalle.cantidad,
        equivalencia: articulo.equivalencia
      });

      // Llamar a la función SQL para procesar el consumo de leche
      const { error: consumoError } = await supabase.rpc('procesar_consumo_leche', {
        p_orden_id: detalle.fk_id_orden,
        p_articulo_id: detalle.fk_id_articulo,
        p_cantidad: detalle.cantidad,
        p_equivalencia_ml: articulo.equivalencia
      });

      if (consumoError) {
        console.error('🥛 ERROR al procesar consumo de leche:', consumoError);
      } else {
        console.log('🥛 ÉXITO: Consumo de leche procesado correctamente');
      }
    } else {
      console.log('🥛 SKIP: Artículo sin equivalencia o equivalencia = 0');
    }
  } catch (error) {
    console.error('🥛 ERROR GENERAL al verificar equivalencia:', error);
  }

  return data;
}

export async function updateOrdenVentaDetalle(id: number, detalle: any) {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar detalles de órdenes de venta');
  }
  
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .update(detalle)
    .eq("idd", id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteOrdenVentaDetalle(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar detalles de órdenes de venta');
  }
  
  const { error } = await supabase
    .from("ordenes_venta_detalle")
    .delete()
    .eq("idd", id);
    
  if (error) throw error;
}

export async function getOrdenVentaDetalleById(id: number) {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .select("*")
    .eq("idd", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data;
} 
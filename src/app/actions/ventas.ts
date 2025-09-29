'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { OrdenVenta, CreateOrdenVentaData } from '@/types/ordenVenta';
import { descontarStockArticulo } from '@/services/combos';

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

export async function getOrdenesVenta(): Promise<OrdenVenta[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("ordenes_venta")
    .select("*")
    .order("id", { ascending: false });
    
  if (error) throw error;
  return data as OrdenVenta[];
}

export async function getOrdenVenta(id: number): Promise<OrdenVenta | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("ordenes_venta")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    throw error;
  }
  
  return data as OrdenVenta;
}

export async function createOrdenVenta(orden: CreateOrdenVentaData): Promise<OrdenVenta> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para crear ventas
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor' && usuario.rol !== 'cobrador') {
    throw new Error('No tienes permisos para crear ventas');
  }
  
  const { data, error } = await supabase
    .from("ordenes_venta")
    .insert([orden])
    .select()
    .single();
    
  if (error) throw error;
  return data as OrdenVenta;
}

export async function updateOrdenVenta(id: number, orden: Partial<CreateOrdenVentaData>): Promise<OrdenVenta> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para actualizar ventas
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para actualizar ventas');
  }
  
  const { data, error } = await supabase
    .from("ordenes_venta")
    .update(orden)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as OrdenVenta;
}

export async function deleteOrdenVenta(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para eliminar ventas
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar ventas');
  }
  
  const { error } = await supabase
    .from("ordenes_venta")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

// Funciones para detalles de venta
export async function createOrdenVentaDetalle(detalle: {
  fk_id_orden: number;
  fk_id_articulo: number;
  cantidad: number;
  precio_unitario: number;
  fk_id_talle?: number | null;
  fk_id_color?: number | null;
}) {
  const usuario = await checkUserPermissions();

  // Verificar permisos específicos para crear detalles de venta
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor' && usuario.rol !== 'cobrador') {
    throw new Error('No tienes permisos para crear detalles de venta');
  }

  // Insertar el detalle de venta
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .insert([detalle])
    .select()
    .single();

  if (error) throw error;

  // Descontar stock (con soporte para combos)
  try {
    console.log('🔥 INICIANDO DESCUENTO DE STOCK para artículo:', detalle.fk_id_articulo, 'cantidad:', detalle.cantidad);
    await descontarStockArticulo(
      detalle.fk_id_articulo,
      detalle.cantidad,
      detalle.fk_id_orden,
      'venta'
    );
    console.log('✅ STOCK DESCONTADO EXITOSAMENTE para artículo:', detalle.fk_id_articulo);
  } catch (error) {
    console.error('❌ ERROR CRÍTICO al descontar stock:', error);
    console.error('❌ Detalle del error:', {
      articuloId: detalle.fk_id_articulo,
      cantidad: detalle.cantidad,
      ordenId: detalle.fk_id_orden,
      error: error instanceof Error ? error.message : error
    });
    // TEMPORALMENTE: Lanzar el error para identificar el problema
    throw new Error(`Error al descontar stock del artículo ${detalle.fk_id_articulo}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }

  // Procesar consumo de leche si el artículo tiene equivalencia > 0
  try {
    // Obtener la equivalencia del artículo vendido
    const { data: articulo, error: articuloError } = await supabase
      .from("articulos")
      .select("equivalencia")
      .eq("id", detalle.fk_id_articulo)
      .single();

    if (!articuloError && articulo && articulo.equivalencia && articulo.equivalencia > 0) {
      // Llamar a la función SQL para procesar el consumo de leche
      const { error: consumoError } = await supabase.rpc('procesar_consumo_leche', {
        p_orden_id: detalle.fk_id_orden,
        p_articulo_id: detalle.fk_id_articulo,
        p_cantidad: detalle.cantidad,
        p_equivalencia_ml: articulo.equivalencia
      });

      if (consumoError) {
        console.error('Error al procesar consumo de leche:', consumoError);
        // No lanzamos error para que no falle la venta, solo logeamos
      }
    }
  } catch (error) {
    console.error('Error al verificar equivalencia para consumo de leche:', error);
    // No lanzamos error para que no falle la venta
  }

  return data;
}

// Funciones para medios de pago
export async function createOrdenVentaMedioPago(medioPago: {
  fk_id_orden: number;
  fk_id_cuenta_tesoreria: number;
  monto: number;
}) {
  const usuario = await checkUserPermissions();
  
  // Verificar permisos específicos para crear medios de pago
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor' && usuario.rol !== 'cobrador') {
    throw new Error('No tienes permisos para crear medios de pago');
  }
  
  const { data, error } = await supabase
    .from("ordenes_venta_medios_pago")
    .insert([medioPago])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Función para obtener ventas por usuario
export async function getOrdenesVentaByUser(userId: number): Promise<OrdenVenta[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("ordenes_venta")
    .select("*")
    .eq("fk_id_usuario", userId)
    .order("id", { ascending: false });
    
  if (error) throw error;
  return data as OrdenVenta[];
} 
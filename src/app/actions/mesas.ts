'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import {
  Mesa,
  CreateMesaData,
  UpdateMesaData,
  SesionMesa,
  CreateSesionMesaData,
  PedidoMesa,
  CreatePedidoMesaData,
  DetallePedidoMesa,
  CreateDetallePedidoMesaData,
  UpdateDetallePedidoMesaData,
  EstadoMesaTablero
} from '@/types/mesa';

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

// =====================================================
// ACCIONES PARA GESTIÓN DE MESAS
// =====================================================

export async function getMesas(): Promise<Mesa[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("mesas")
    .select("*")
    .eq("activo", true)
    .order("numero", { ascending: true });
    
  if (error) throw error;
  return data as Mesa[];
}

export async function createMesa(mesa: CreateMesaData): Promise<Mesa> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
    throw new Error('No tienes permisos para crear mesas');
  }
  
  const { data, error } = await supabase
    .from("mesas")
    .insert([mesa])
    .select()
    .single();
    
  if (error) throw error;
  return data as Mesa;
}

export async function updateMesa(id: number, mesa: UpdateMesaData): Promise<Mesa> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor' && usuario.rol !== 'cobrador') {
    throw new Error('No tienes permisos para actualizar mesas');
  }
  
  const { data, error } = await supabase
    .from("mesas")
    .update(mesa)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Mesa;
}

export async function deleteMesa(id: number): Promise<void> {
  const usuario = await checkUserPermissions();
  
  if (usuario.rol !== 'admin') {
    throw new Error('No tienes permisos para eliminar mesas');
  }

  // Verificar que no haya sesión activa en la mesa
  const { data: sesionActiva } = await supabase
    .from("sesiones_mesa")
    .select("id")
    .eq("fk_id_mesa", id)
    .eq("abierta", true)
    .single();

  if (sesionActiva) {
    throw new Error('No se puede eliminar una mesa con sesión activa');
  }
  
  // Soft delete - marcar como inactivo
  const { error } = await supabase
    .from("mesas")
    .update({ activo: false })
    .eq("id", id);
    
  if (error) throw error;
}

// =====================================================
// ACCIONES PARA SESIONES DE MESA
// =====================================================

export async function getEstadoTablero(): Promise<EstadoMesaTablero[]> {
  await checkUserPermissions();
  
  // Obtener todas las mesas activas
  const { data: mesas, error: mesasError } = await supabase
    .from("mesas")
    .select("*")
    .eq("activo", true)
    .order("numero", { ascending: true });
  
  if (mesasError) throw mesasError;

  // Obtener sesiones activas con información completa
  const { data: sesionesActivas, error: sesionesError } = await supabase
    .from("vista_sesiones_mesa_activas")
    .select("*");
  
  if (sesionesError) throw sesionesError;

  // Combinar información
  const estadoTablero: EstadoMesaTablero[] = (mesas || []).map(mesa => {
    const sesionActiva = sesionesActivas?.find(s => s.fk_id_mesa === mesa.id);
    
    let estado: 'libre' | 'ocupada' | 'por_cobrar' = 'libre';
    
    if (sesionActiva) {
      console.log(`Mesa ${mesa.numero}: lista_para_cobro = ${sesionActiva.lista_para_cobro}, total_sesion = ${sesionActiva.total_sesion}, total_consumido = ${sesionActiva.total_consumido}`);
      
      // Si existe el campo lista_para_cobro, úsalo
      if (sesionActiva.lista_para_cobro !== undefined) {
        if (sesionActiva.lista_para_cobro) {
          estado = 'por_cobrar';
        } else {
          estado = 'ocupada';
        }
      } 
      // Fallback: usar total_sesion > 0 como indicador de que está lista para cobro
      else if (sesionActiva.total_sesion && sesionActiva.total_sesion > 0) {
        estado = 'por_cobrar';
      } else {
        estado = 'ocupada';
      }
    }
    
    return {
      mesa,
      sesion_activa: sesionActiva,
      estado
    };
  });
  
  return estadoTablero;
}

export async function abrirMesa(sesionData: CreateSesionMesaData): Promise<SesionMesa> {
  const usuario = await checkUserPermissions();
  
  // Verificar que la mesa no esté ocupada
  const { data: sesionExistente } = await supabase
    .from("sesiones_mesa")
    .select("id")
    .eq("fk_id_mesa", sesionData.fk_id_mesa)
    .eq("abierta", true)
    .single();

  if (sesionExistente) {
    throw new Error("La mesa ya está ocupada");
  }

  // Verificar que existe un lote abierto
  const { data: loteAbierto } = await supabase
    .from("lotes_operaciones")
    .select("id_lote")
    .eq("abierto", true)
    .eq("fk_id_usuario", usuario.id)
    .single();

  if (!loteAbierto) {
    throw new Error("No hay un lote de operaciones abierto");
  }

  const sesionCompleta = {
    ...sesionData,
    fk_id_usuario: usuario.id,
    fk_id_lote: loteAbierto.id_lote
  };

  const { data, error } = await supabase
    .from("sesiones_mesa")
    .insert([sesionCompleta])
    .select()
    .single();
  
  if (error) throw error;
  return data as SesionMesa;
}

// Función para marcar mesa como lista para cobro (no la cierra completamente)
export async function cerrarMesaParaCobro(sesionId: number): Promise<SesionMesa> {
  const usuario = await checkUserPermissions();
  
  // Obtener el total actual de la sesión
  const { data: sesionActual, error: sesionError } = await supabase
    .from("sesiones_mesa")
    .select("total_sesion, fk_id_usuario")
    .eq("id", sesionId)
    .eq("abierta", true)
    .single();

  if (sesionError || !sesionActual) {
    throw new Error("Sesión no encontrada o ya cerrada");
  }

  // Verificar permisos (solo el usuario que abrió o admin/supervisor puede cerrar)
  if (sesionActual.fk_id_usuario !== usuario.id && usuario.rol === 'cobrador') {
    throw new Error("No tienes permisos para cerrar esta mesa");
  }

  // Calcular total de consumo actual
  const { data: totalConsumo } = await supabase
    .from('pedidos_mesa')
    .select(`
      detalle_pedidos_mesa(cantidad, precio_unitario)
    `)
    .eq('fk_id_sesion_mesa', sesionId);

  let totalCalculado = 0;
  if (totalConsumo) {
    totalCalculado = totalConsumo.reduce((sum, pedido) => {
      const subtotalPedido = pedido.detalle_pedidos_mesa.reduce((subSum: number, detalle: { cantidad: number; precio_unitario: number }) => {
        return subSum + (detalle.cantidad * detalle.precio_unitario);
      }, 0);
      return sum + subtotalPedido;
    }, 0);
  }

  // Intentar actualizar con los nuevos campos, pero tener fallback
  const updateData: Record<string, unknown> = {
    total_sesion: totalCalculado,
  };
  
  // Si los nuevos campos existen, incluirlos
  try {
    updateData.lista_para_cobro = true;
    updateData.fecha_cierre_pedido = new Date().toISOString();
  } catch {
    console.log("Usando fallback sin nuevos campos");
  }

  const { data, error } = await supabase
    .from("sesiones_mesa")
    .update(updateData)
    .eq("id", sesionId)
    .select()
    .single();
  
  if (error) {
    console.error("Error al actualizar sesión:", error);
    throw error;
  }
  
  console.log("Sesión actualizada:", data);
  return data as SesionMesa;
}

// Función para cerrar completamente la mesa (se usa después del cobro)
export async function cerrarMesa(sesionId: number): Promise<SesionMesa> {
  const usuario = await checkUserPermissions();
  
  // Obtener el total actual de la sesión
  const { data: sesionActual, error: sesionError } = await supabase
    .from("sesiones_mesa")
    .select("total_sesion, fk_id_usuario")
    .eq("id", sesionId)
    .eq("abierta", true)
    .single();

  if (sesionError || !sesionActual) {
    throw new Error("Sesión no encontrada o ya cerrada");
  }

  // Verificar permisos (solo el usuario que abrió o admin/supervisor puede cerrar)
  if (sesionActual.fk_id_usuario !== usuario.id && usuario.rol === 'cobrador') {
    throw new Error("No tienes permisos para cerrar esta mesa");
  }

  const { data, error } = await supabase
    .from("sesiones_mesa")
    .update({
      abierta: false,
      fecha_cierre: new Date().toISOString(),
    })
    .eq("id", sesionId)
    .select()
    .single();
  
  if (error) throw error;
  return data as SesionMesa;
}

// =====================================================
// ACCIONES PARA PEDIDOS DE MESA
// =====================================================

export async function getPedidosDeSesion(sesionId: number): Promise<PedidoMesa[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("pedidos_mesa")
    .select("*")
    .eq("fk_id_sesion_mesa", sesionId)
    .order("numero_pedido", { ascending: true });
    
  if (error) throw error;
  return data as PedidoMesa[];
}

export async function createPedidoMesa(pedido: CreatePedidoMesaData): Promise<PedidoMesa> {
  await checkUserPermissions();
  
  // Obtener el siguiente número de pedido para la sesión
  const { data: ultimoPedido } = await supabase
    .from("pedidos_mesa")
    .select("numero_pedido")
    .eq("fk_id_sesion_mesa", pedido.fk_id_sesion_mesa)
    .order("numero_pedido", { ascending: false })
    .limit(1)
    .single();

  const siguienteNumero = (ultimoPedido?.numero_pedido || 0) + 1;

  const pedidoCompleto = {
    ...pedido,
    numero_pedido: siguienteNumero
  };

  const { data, error } = await supabase
    .from("pedidos_mesa")
    .insert([pedidoCompleto])
    .select()
    .single();
    
  if (error) throw error;
  return data as PedidoMesa;
}

export async function updateEstadoPedido(id: number, estado: PedidoMesa['estado']): Promise<PedidoMesa> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("pedidos_mesa")
    .update({ estado })
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as PedidoMesa;
}

// =====================================================
// ACCIONES PARA DETALLE DE PEDIDOS
// =====================================================

export async function getDetallePedido(pedidoId: number): Promise<DetallePedidoMesa[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("detalle_pedidos_mesa")
    .select(`
      *,
      articulos!fk_id_articulo (
        descripcion
      )
    `)
    .eq("fk_id_pedido_mesa", pedidoId)
    .order("fecha_creado", { ascending: true });
  
  if (error) throw error;
  
  // Mapear los datos para incluir descripción del artículo
  const mapped = data.map(item => ({
    ...item,
    articulo_descripcion: (item.articulos as { descripcion?: string })?.descripcion || 'N/A'
  }));
  
  return mapped as DetallePedidoMesa[];
}

export async function addProductoAPedido(detalle: CreateDetallePedidoMesaData): Promise<DetallePedidoMesa> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("detalle_pedidos_mesa")
    .insert([detalle])
    .select()
    .single();
  
  if (error) throw error;
  
  // Actualizar subtotal del pedido automáticamente vía trigger o función
  await actualizarSubtotales(detalle.fk_id_pedido_mesa);
  
  return data as DetallePedidoMesa;
}

export async function updateDetallePedido(id: number, detalle: UpdateDetallePedidoMesaData): Promise<DetallePedidoMesa> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("detalle_pedidos_mesa")
    .update(detalle)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  
  // Obtener pedido_id para actualizar subtotales
  const { data: pedidoData } = await supabase
    .from("detalle_pedidos_mesa")
    .select("fk_id_pedido_mesa")
    .eq("id", id)
    .single();
  
  if (pedidoData) {
    await actualizarSubtotales(pedidoData.fk_id_pedido_mesa);
  }
  
  return data as DetallePedidoMesa;
}

export async function removeProductoDePedido(id: number): Promise<void> {
  await checkUserPermissions();
  
  // Obtener pedido_id antes de eliminar
  const { data: detalleData } = await supabase
    .from("detalle_pedidos_mesa")
    .select("fk_id_pedido_mesa")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("detalle_pedidos_mesa")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
  
  // Actualizar subtotales
  if (detalleData) {
    await actualizarSubtotales(detalleData.fk_id_pedido_mesa);
  }
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

async function actualizarSubtotales(pedidoId: number) {
  // Calcular nuevo subtotal del pedido
  const { data } = await supabase
    .from("detalle_pedidos_mesa")
    .select("subtotal")
    .eq("fk_id_pedido_mesa", pedidoId);
  
  const subtotal = data?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
  
  // Actualizar pedido
  await supabase
    .from("pedidos_mesa")
    .update({ subtotal })
    .eq("id", pedidoId);
    
  // Obtener sesión para actualizar total
  const { data: pedidoData } = await supabase
    .from("pedidos_mesa")
    .select("fk_id_sesion_mesa")
    .eq("id", pedidoId)
    .single();
    
  if (pedidoData) {
    // Calcular nuevo total de la sesión
    const { data: pedidosSesion } = await supabase
      .from("pedidos_mesa")
      .select("subtotal")
      .eq("fk_id_sesion_mesa", pedidoData.fk_id_sesion_mesa)
      .neq("estado", "cancelado");
    
    const totalSesion = pedidosSesion?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
    
    // Actualizar sesión
    await supabase
      .from("sesiones_mesa")
      .update({ total_sesion: totalSesion })
      .eq("id", pedidoData.fk_id_sesion_mesa);
  }
}
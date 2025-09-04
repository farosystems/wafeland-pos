import { supabase } from "@/lib/supabaseClient";
import {
  Mesa,
  CreateMesaData,
  UpdateMesaData,
  SesionMesa,
  CreateSesionMesaData,
  UpdateSesionMesaData,
  PedidoMesa,
  CreatePedidoMesaData,
  UpdatePedidoMesaData,
  DetallePedidoMesa,
  CreateDetallePedidoMesaData,
  UpdateDetallePedidoMesaData,
  SesionMesaActiva,
  EstadoMesaTablero
} from "@/types/mesa";

// =====================================================
// OPERACIONES CRUD PARA MESAS
// =====================================================

export async function getMesas() {
  const { data, error } = await supabase
    .from("mesas")
    .select("*")
    .eq("activo", true)
    .order("numero", { ascending: true });
  
  if (error) throw error;
  return data as Mesa[];
}

export async function createMesa(mesa: CreateMesaData) {
  const { data, error } = await supabase
    .from("mesas")
    .insert([mesa])
    .select()
    .single();
  
  if (error) throw error;
  return data as Mesa;
}

export async function updateMesa(id: number, mesa: UpdateMesaData) {
  const { data, error } = await supabase
    .from("mesas")
    .update(mesa)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Mesa;
}

export async function deleteMesa(id: number) {
  // Soft delete - marcar como inactivo
  const { error } = await supabase
    .from("mesas")
    .update({ activo: false })
    .eq("id", id);
  
  if (error) throw error;
}

// =====================================================
// OPERACIONES PARA SESIONES DE MESA
// =====================================================

export async function getSesionesActivas() {
  const { data, error } = await supabase
    .from("vista_sesiones_mesa_activas")
    .select("*");
  
  if (error) throw error;
  return data as SesionMesaActiva[];
}

export async function getSesionMesa(id: number) {
  const { data, error } = await supabase
    .from("sesiones_mesa")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return data as SesionMesa;
}

export async function abrirMesa(sesionData: CreateSesionMesaData) {
  // Verificar que la mesa no esté ya ocupada
  const { data: sesionExistente } = await supabase
    .from("sesiones_mesa")
    .select("id")
    .eq("fk_id_mesa", sesionData.fk_id_mesa)
    .eq("abierta", true)
    .single();

  if (sesionExistente) {
    throw new Error("La mesa ya está ocupada");
  }

  const { data, error } = await supabase
    .from("sesiones_mesa")
    .insert([sesionData])
    .select()
    .single();
  
  if (error) throw error;
  return data as SesionMesa;
}

export async function cerrarMesa(sesionId: number, totalFinal: number) {
  const { data, error } = await supabase
    .from("sesiones_mesa")
    .update({
      abierta: false,
      fecha_cierre: new Date().toISOString(),
      total_sesion: totalFinal
    })
    .eq("id", sesionId)
    .select()
    .single();
  
  if (error) throw error;
  return data as SesionMesa;
}

export async function updateSesionMesa(id: number, sesion: UpdateSesionMesaData) {
  const { data, error } = await supabase
    .from("sesiones_mesa")
    .update(sesion)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data as SesionMesa;
}

// =====================================================
// OPERACIONES PARA PEDIDOS DE MESA
// =====================================================

export async function getPedidosDeSesion(sesionId: number) {
  const { data, error } = await supabase
    .from("pedidos_mesa")
    .select("*")
    .eq("fk_id_sesion_mesa", sesionId)
    .order("numero_pedido", { ascending: true });
  
  if (error) throw error;
  return data as PedidoMesa[];
}

export async function createPedidoMesa(pedido: CreatePedidoMesaData) {
  const { data, error } = await supabase
    .from("pedidos_mesa")
    .insert([pedido])
    .select()
    .single();
  
  if (error) throw error;
  return data as PedidoMesa;
}

export async function updatePedidoMesa(id: number, pedido: UpdatePedidoMesaData) {
  const { data, error } = await supabase
    .from("pedidos_mesa")
    .update(pedido)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data as PedidoMesa;
}

// =====================================================
// OPERACIONES PARA DETALLE DE PEDIDOS
// =====================================================

export async function getDetallePedido(pedidoId: number) {
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
    articulo_descripcion: (item.articulos as any)?.descripcion || 'N/A'
  }));
  
  return mapped as DetallePedidoMesa[];
}

export async function addProductoAPedido(detalle: CreateDetallePedidoMesaData) {
  const { data, error } = await supabase
    .from("detalle_pedidos_mesa")
    .insert([detalle])
    .select()
    .single();
  
  if (error) throw error;
  
  // Actualizar subtotal del pedido
  await actualizarSubtotalPedido(detalle.fk_id_pedido_mesa);
  
  return data as DetallePedidoMesa;
}

export async function updateDetallePedido(id: number, detalle: UpdateDetallePedidoMesaData) {
  const { data, error } = await supabase
    .from("detalle_pedidos_mesa")
    .update(detalle)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  
  // Actualizar subtotal del pedido
  const { data: pedidoData } = await supabase
    .from("detalle_pedidos_mesa")
    .select("fk_id_pedido_mesa")
    .eq("id", id)
    .single();
  
  if (pedidoData) {
    await actualizarSubtotalPedido(pedidoData.fk_id_pedido_mesa);
  }
  
  return data as DetallePedidoMesa;
}

export async function removeProductoDePedido(id: number) {
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
  
  // Actualizar subtotal del pedido
  if (detalleData) {
    await actualizarSubtotalPedido(detalleData.fk_id_pedido_mesa);
  }
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

async function actualizarSubtotalPedido(pedidoId: number) {
  // Calcular nuevo subtotal
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
    
  // Actualizar total de la sesión
  const { data: pedidoData } = await supabase
    .from("pedidos_mesa")
    .select("fk_id_sesion_mesa")
    .eq("id", pedidoId)
    .single();
    
  if (pedidoData) {
    await actualizarTotalSesion(pedidoData.fk_id_sesion_mesa);
  }
}

async function actualizarTotalSesion(sesionId: number) {
  // Calcular nuevo total de la sesión
  const { data } = await supabase
    .from("pedidos_mesa")
    .select("subtotal")
    .eq("fk_id_sesion_mesa", sesionId)
    .neq("estado", "cancelado");
  
  const total = data?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0;
  
  // Actualizar sesión
  await supabase
    .from("sesiones_mesa")
    .update({ total_sesion: total })
    .eq("id", sesionId);
}

// =====================================================
// FUNCIÓN PRINCIPAL PARA OBTENER ESTADO DEL TABLERO
// =====================================================

export async function getEstadoTablero(): Promise<EstadoMesaTablero[]> {
  // Obtener todas las mesas
  const mesas = await getMesas();
  
  // Obtener sesiones activas
  const sesionesActivas = await getSesionesActivas();
  
  // Combinar información
  const estadoTablero: EstadoMesaTablero[] = mesas.map(mesa => {
    const sesionActiva = sesionesActivas.find(s => s.fk_id_mesa === mesa.id);
    
    let estado: 'libre' | 'ocupada' | 'por_cobrar' = 'libre';
    
    if (sesionActiva) {
      // Si hay consumo pendiente de cobrar
      if (sesionActiva.total_consumido > 0) {
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
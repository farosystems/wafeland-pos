import { supabase } from "@/lib/supabaseClient";
import { OrdenVentaDetalle, CreateOrdenVentaDetalleData } from "@/types/ordenVenta";
import { descontarStockArticulo } from "@/services/combos";

export async function getOrdenesVentaDetalle(fk_id_orden: number) {
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .select("*")
    .eq("fk_id_orden", fk_id_orden)
    .order("idd", { ascending: true });
  if (error) throw error;
  return data as OrdenVentaDetalle[];
}

export async function createOrdenVentaDetalle(detalle: CreateOrdenVentaDetalleData) {
  // Insertar el detalle de venta
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .insert([detalle])
    .select()
    .single();
  if (error) throw error;

  // Descontar stock (con soporte para combos)
  try {
    console.log('🔥 SERVICIOS FRONTEND - INICIANDO DESCUENTO DE STOCK para artículo:', detalle.fk_id_articulo, 'cantidad:', detalle.cantidad);
    await descontarStockArticulo(
      detalle.fk_id_articulo,
      detalle.cantidad,
      detalle.fk_id_orden,
      'venta_frontend'
    );
    console.log('✅ SERVICIOS FRONTEND - STOCK DESCONTADO EXITOSAMENTE para artículo:', detalle.fk_id_articulo);
  } catch (error) {
    console.error('❌ SERVICIOS FRONTEND - ERROR CRÍTICO al descontar stock:', error);
    console.error('❌ Detalle del error:', {
      articuloId: detalle.fk_id_articulo,
      cantidad: detalle.cantidad,
      ordenId: detalle.fk_id_orden,
      error: error instanceof Error ? error.message : error
    });
    // TEMPORALMENTE: Lanzar el error para identificar el problema
    throw new Error(`Error al descontar stock del artículo ${detalle.fk_id_articulo}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }

  return data as OrdenVentaDetalle;
}

export async function updateOrdenVentaDetalle(idd: number, detalle: Partial<CreateOrdenVentaDetalleData>) {
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .update(detalle)
    .eq("idd", idd)
    .select()
    .single();
  if (error) throw error;
  return data as OrdenVentaDetalle;
}

export async function deleteOrdenVentaDetalle(idd: number) {
  const { error } = await supabase.from("ordenes_venta_detalle").delete().eq("idd", idd);
  if (error) throw error;
} 
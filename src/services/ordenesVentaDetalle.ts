import { supabase } from "@/lib/supabaseClient";
import { OrdenVentaDetalle, CreateOrdenVentaDetalleData } from "@/types/ordenVenta";

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
  const { data, error } = await supabase
    .from("ordenes_venta_detalle")
    .insert([detalle])
    .select()
    .single();
  if (error) throw error;
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
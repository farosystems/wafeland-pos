import { supabase } from "@/lib/supabaseClient";
import { OrdenVentaImpuestos, CreateOrdenVentaImpuestosData } from "@/types/ordenVenta";

export async function getOrdenesVentaImpuestos(id_orden: number) {
  const { data, error } = await supabase
    .from("ordenes_venta_impuestos")
    .select("*")
    .eq("fk_id_orden", id_orden)
    .order("id", { ascending: true });
  if (error) throw error;
  return data as OrdenVentaImpuestos[];
}

export async function createOrdenVentaImpuestos(impuesto: CreateOrdenVentaImpuestosData) {
  const { data, error } = await supabase
    .from("ordenes_venta_impuestos")
    .insert([impuesto])
    .select()
    .single();
  if (error) throw error;
  return data as OrdenVentaImpuestos;
}

export async function updateOrdenVentaImpuestos(id: number, impuesto: Partial<CreateOrdenVentaImpuestosData>) {
  const { data, error } = await supabase
    .from("ordenes_venta_impuestos")
    .update(impuesto)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as OrdenVentaImpuestos;
}

export async function deleteOrdenVentaImpuestos(id: number) {
  const { error } = await supabase.from("ordenes_venta_impuestos").delete().eq("id", id);
  if (error) throw error;
} 
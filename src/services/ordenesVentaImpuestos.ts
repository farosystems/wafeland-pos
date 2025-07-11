import { supabase } from "@/lib/supabaseClient";
import { OrdenVentaImpuestos, CreateOrdenVentaImpuestosData } from "@/types/ordenVenta";

export async function getOrdenesVentaImpuestos(id_orden: number) {
  const { data, error } = await supabase
    .from("ordenes_venta_impuestos")
    .select("*")
    .eq("id_orden", id_orden)
    .order("idd", { ascending: true });
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

export async function updateOrdenVentaImpuestos(idd: number, impuesto: Partial<CreateOrdenVentaImpuestosData>) {
  const { data, error } = await supabase
    .from("ordenes_venta_impuestos")
    .update(impuesto)
    .eq("idd", idd)
    .select()
    .single();
  if (error) throw error;
  return data as OrdenVentaImpuestos;
}

export async function deleteOrdenVentaImpuestos(idd: number) {
  const { error } = await supabase.from("ordenes_venta_impuestos").delete().eq("idd", idd);
  if (error) throw error;
} 
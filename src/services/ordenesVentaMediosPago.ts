import { supabase } from "@/lib/supabaseClient";
import { OrdenVentaMediosPago, CreateOrdenVentaMediosPagoData } from "@/types/ordenVenta";

export async function getOrdenesVentaMediosPago(fk_id_orden: number) {
  const { data, error } = await supabase
    .from("ordenes_venta_medios_pago")
    .select("*")
    .eq("fk_id_orden", fk_id_orden)
    .order("idd", { ascending: true });
  if (error) throw error;
  return data as OrdenVentaMediosPago[];
}

export async function createOrdenVentaMediosPago(medio: CreateOrdenVentaMediosPagoData) {
  const { data, error } = await supabase
    .from("ordenes_venta_medios_pago")
    .insert([medio])
    .select()
    .single();
  if (error) throw error;
  return data as OrdenVentaMediosPago;
}

export async function updateOrdenVentaMediosPago(idd: number, medio: Partial<CreateOrdenVentaMediosPagoData>) {
  const { data, error } = await supabase
    .from("ordenes_venta_medios_pago")
    .update(medio)
    .eq("idd", idd)
    .select()
    .single();
  if (error) throw error;
  return data as OrdenVentaMediosPago;
}

export async function deleteOrdenVentaMediosPago(idd: number) {
  const { error } = await supabase.from("ordenes_venta_medios_pago").delete().eq("idd", idd);
  if (error) throw error;
} 
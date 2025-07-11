import { supabase } from "@/lib/supabaseClient";
import { OrdenVenta, CreateOrdenVentaData } from "@/types/ordenVenta";

export async function getOrdenesVenta() {
  const { data, error } = await supabase
    .from("ordenes_venta")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw error;
  return data as OrdenVenta[];
}

export async function getOrdenVenta(id: number) {
  const { data, error } = await supabase
    .from("ordenes_venta")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as OrdenVenta;
}

export async function createOrdenVenta(orden: CreateOrdenVentaData) {
  const { data, error } = await supabase
    .from("ordenes_venta")
    .insert([orden])
    .select()
    .single();
  if (error) throw error;
  return data as OrdenVenta;
}

export async function updateOrdenVenta(id: number, orden: Partial<CreateOrdenVentaData>) {
  const { data, error } = await supabase
    .from("ordenes_venta")
    .update(orden)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as OrdenVenta;
}

export async function deleteOrdenVenta(id: number) {
  const { error } = await supabase.from("ordenes_venta").delete().eq("id", id);
  if (error) throw error;
} 
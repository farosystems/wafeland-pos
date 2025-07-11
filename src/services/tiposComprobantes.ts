import { supabase } from "@/lib/supabaseClient";
import { TipoComprobante, CreateTipoComprobanteData } from "@/types/tipoComprobante";

export async function getTiposComprobantes() {
  const { data, error } = await supabase
    .from("tipos_comprobantes")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data as TipoComprobante[];
}

export async function createTipoComprobante(tipo: CreateTipoComprobanteData) {
  const { data, error } = await supabase
    .from("tipos_comprobantes")
    .insert([tipo])
    .select()
    .single();
  if (error) throw error;
  return data as TipoComprobante;
}

export async function updateTipoComprobante(id: number, tipo: Partial<CreateTipoComprobanteData>) {
  const { data, error } = await supabase
    .from("tipos_comprobantes")
    .update(tipo)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as TipoComprobante;
}

export async function deleteTipoComprobante(id: number) {
  const { error } = await supabase.from("tipos_comprobantes").delete().eq("id", id);
  if (error) throw error;
} 
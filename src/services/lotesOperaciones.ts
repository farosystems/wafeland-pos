import { supabase } from "@/lib/supabaseClient";
import { LoteOperacion, CreateLoteOperacionData } from "@/types/loteOperacion";

export async function getLotesOperaciones() {
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .select("*")
    .order("id_lote", { ascending: false });
  if (error) throw error;
  return data as LoteOperacion[];
}

export async function createLoteOperacion(lote: CreateLoteOperacionData) {
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .insert([lote])
    .select()
    .single();
  if (error) throw error;
  return data as LoteOperacion;
}

export async function updateLoteOperacion(id_lote: number, lote: Partial<CreateLoteOperacionData>) {
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .update(lote)
    .eq("id_lote", id_lote)
    .select()
    .single();
  if (error) throw error;
  return data as LoteOperacion;
}

export async function deleteLoteOperacion(id_lote: number) {
  const { error } = await supabase.from("lotes_operaciones").delete().eq("id_lote", id_lote);
  if (error) throw error;
}

export async function getLoteCajaAbiertaPorUsuario(fk_id_usuario: number) {
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .select("*")
    .eq("fk_id_usuario", fk_id_usuario)
    .eq("tipo_lote", "apertura")
    .eq("abierto", true)
    .order("fecha_apertura", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows found
  return data || null;
}

export async function cerrarLoteApertura(id_lote: number, fecha_cierre: string, hora_cierre: string) {
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .update({ abierto: false, fecha_cierre, hora_cierre })
    .eq("id_lote", id_lote)
    .select()
    .single();
  if (error) throw error;
  return data;
} 

export async function getLoteAbierto() {
  const { data, error } = await supabase
    .from("lotes_operaciones")
    .select("id_lote")
    .eq("abierto", true)
    .order("fecha_apertura", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id_lote as number | null;
} 
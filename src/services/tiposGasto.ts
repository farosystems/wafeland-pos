import { supabase } from "@/lib/supabaseClient";
import { TipoGasto } from "@/types/tipoGasto";

export async function getTiposGasto() {
  const { data, error } = await supabase
    .from("tipo_gasto")
    .select("*")
    .order("descripcion", { ascending: true });
  if (error) throw error;
  return data as TipoGasto[];
}

export async function createTipoGasto(data: Omit<TipoGasto, "id" | "created_at">) {
  const { data: result, error } = await supabase
    .from("tipo_gasto")
    .insert([{ ...data }])
    .select()
    .single();
  if (error) throw error;
  return result as TipoGasto;
}

export async function updateTipoGasto(id: number, data: Partial<Omit<TipoGasto, "id" | "created_at">>) {
  const { data: result, error } = await supabase
    .from("tipo_gasto")
    .update({ ...data })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as TipoGasto;
}

export async function deleteTipoGasto(id: number) {
  const { error } = await supabase.from("tipo_gasto").delete().eq("id", id);
  if (error) throw error;
} 
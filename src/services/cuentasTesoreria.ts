import { supabase } from "@/lib/supabaseClient";
import { CreateCuentaTesoreriaData } from "@/types/cuentaTesoreria";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";

export async function getCuentasTesoreria() {
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .select("id, descripcion, activo")
    .eq("activo", true)
    .order("descripcion", { ascending: true });
  if (error) throw error;
  return data as { id: number; descripcion: string; activo: boolean }[];
}

export async function createCuentaTesoreria(cuenta: CreateCuentaTesoreriaData) {
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .insert([cuenta])
    .select()
    .single();
  if (error) throw error;
  return data as CuentaTesoreria;
}

export async function updateCuentaTesoreria(id: number, cuenta: Partial<CreateCuentaTesoreriaData>) {
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .update(cuenta)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CuentaTesoreria;
}

export async function deleteCuentaTesoreria(id: number) {
  const { error } = await supabase.from("cuentas_tesoreria").delete().eq("id", id);
  if (error) throw error;
} 
import { supabase } from "@/lib/supabaseClient";
import { CuentaTesoreria, CreateCuentaTesoreriaData } from "@/types/cuentaTesoreria";

export async function getCuentasTesoreria() {
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data as CuentaTesoreria[];
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
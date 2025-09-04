import { supabase } from "@/lib/supabaseClient";

export interface CuentaTesoreria {
  id: number;
  descripcion: string;
  activo: boolean;
}

export async function getCuentasTesoreria(): Promise<CuentaTesoreria[]> {
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .select("*")
    .eq("activo", true)
    .order("descripcion", { ascending: true });
  
  if (error) throw error;
  return data as CuentaTesoreria[];
}

export async function createCuentaTesoreria(cuenta: { descripcion: string; activo?: boolean }) {
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .insert([{ ...cuenta, activo: cuenta.activo ?? true }])
    .select()
    .single();
  
  if (error) throw error;
  return data as CuentaTesoreria;
}

export async function updateCuentaTesoreria(id: number, cuenta: Partial<CuentaTesoreria>) {
  const { data, error } = await supabase
    .from("cuentas_tesoreria")
    .update(cuenta)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data as CuentaTesoreria;
}
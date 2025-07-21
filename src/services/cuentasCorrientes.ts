import { supabase } from "@/lib/supabaseClient";

export async function getCuentasCorrientes() {
  const { data, error } = await supabase
    .from("cuentas_corrientes")
    .select("*");
  if (error) throw error;
  return data;
}

export async function cancelarCuentaCorriente(id: number) {
  const { error } = await supabase
    .from("cuentas_corrientes")
    .update({ estado: "cancelado" })
    .eq("id", id);
  if (error) throw error;
}

export async function efectuarPagoCuentaCorriente(id: number) {
  const { error } = await supabase
    .from("cuentas_corrientes")
    .update({ estado: "pagada", saldo: 0 })
    .eq("id", id);
  if (error) throw error;
}

export async function createCuentaCorriente(data: { fk_id_orden: number; fk_id_cliente: number; total: number; saldo: number; estado: string; }) {
  const { error } = await supabase
    .from("cuentas_corrientes")
    .insert([data]);
  if (error) throw error;
} 
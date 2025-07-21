import { supabase } from "@/lib/supabaseClient";
import { DetalleLoteOperacion, CreateDetalleLoteOperacionData } from "@/types/loteOperacion";

export async function getDetalleLotesOperaciones(fk_id_lote: number) {
  const { data, error } = await supabase
    .from("detalle_lotes_operaciones")
    .select("*")
    .eq("fk_id_lote", fk_id_lote)
    .order("idd", { ascending: true });
  if (error) throw error;
  return data as DetalleLoteOperacion[];
}

export async function createDetalleLoteOperacion(detalle: CreateDetalleLoteOperacionData) {
  // Si es egreso, el monto debe ser negativo
  const monto = detalle.tipo === "egreso" ? -Math.abs(detalle.monto) : Math.abs(detalle.monto);
  const { data, error } = await supabase
    .from("detalle_lotes_operaciones")
    .insert([{ ...detalle, monto }])
    .select()
    .single();
  if (error) throw error;
  return data as DetalleLoteOperacion;
}

export async function updateDetalleLoteOperacion(idd: number, detalle: Partial<CreateDetalleLoteOperacionData>) {
  const { data, error } = await supabase
    .from("detalle_lotes_operaciones")
    .update(detalle)
    .eq("idd", idd)
    .select()
    .single();
  if (error) throw error;
  return data as DetalleLoteOperacion;
}

export async function deleteDetalleLoteOperacion(idd: number) {
  const { error } = await supabase.from("detalle_lotes_operaciones").delete().eq("idd", idd);
  if (error) throw error;
}

// Función para registrar movimiento de caja
export async function registrarMovimientoCaja({ fk_id_lote, fk_id_cuenta_tesoreria, tipo, monto }: { fk_id_lote: number, fk_id_cuenta_tesoreria: number, tipo: 'ingreso' | 'egreso', monto: number }) {
  return createDetalleLoteOperacion({ fk_id_lote, fk_id_cuenta_tesoreria, tipo, monto });
}

export async function getSaldoCajaPorLote(fk_id_lote: number): Promise<number> {
  const { data, error } = await supabase
    .from("detalle_lotes_operaciones")
    .select("monto")
    .eq("fk_id_lote", fk_id_lote);
  if (error) throw error;
  return (data as { monto: number }[]).reduce((sum, mov) => sum + (mov.monto || 0), 0);
} 
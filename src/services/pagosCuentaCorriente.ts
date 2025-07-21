import { supabase } from "@/lib/supabaseClient";

export interface PagoCuentaCorriente {
  id: number;
  fk_id_cuenta_corriente: number;
  monto: number;
  fk_id_cuenta_tesoreria: number;
  creado_el: string;
  fk_id_lote: number;
}

export interface CreatePagoCuentaCorrienteData {
  fk_id_cuenta_corriente: number;
  monto: number;
  fk_id_cuenta_tesoreria: number;
  fk_id_lote: number;
}

export async function getPagosCuentaCorriente() {
  const { data, error } = await supabase
    .from("pagos_cuenta_corriente")
    .select("*")
    .order("creado_el", { ascending: false });
  if (error) throw error;
  return data as PagoCuentaCorriente[];
}

export async function createPagoCuentaCorriente(pago: CreatePagoCuentaCorrienteData) {
  const { data, error } = await supabase
    .from("pagos_cuenta_corriente")
    .insert([pago])
    .select()
    .single();
  if (error) throw error;
  return data as PagoCuentaCorriente;
}

export async function efectuarPagoCuentaCorriente(
  cuentaCorrienteId: number, 
  monto: number, 
  cuentaTesoreriaId: number,
  fk_id_lote: number
) {
  // Iniciar transacción
  const { data: cuentaCorriente, error: errorCuenta } = await supabase
    .from("cuentas_corrientes")
    .select("saldo, estado")
    .eq("id", cuentaCorrienteId)
    .single();
  
  if (errorCuenta) throw errorCuenta;
  
  const nuevoSaldo = cuentaCorriente.saldo - monto;
  const nuevoEstado = nuevoSaldo <= 0 ? "pagada" : "pendiente";
  
  // Crear el pago
  const { error: errorPago } = await supabase
    .from("pagos_cuenta_corriente")
    .insert([{
      fk_id_cuenta_corriente: cuentaCorrienteId,
      monto: monto,
      fk_id_cuenta_tesoreria: cuentaTesoreriaId,
      fk_id_lote: fk_id_lote
    }]);
  
  if (errorPago) throw errorPago;
  
  // Actualizar la cuenta corriente
  const { error: errorUpdate } = await supabase
    .from("cuentas_corrientes")
    .update({ 
      saldo: Math.max(0, nuevoSaldo), // No permitir saldo negativo
      estado: nuevoEstado
    })
    .eq("id", cuentaCorrienteId);
  
  if (errorUpdate) throw errorUpdate;
} 
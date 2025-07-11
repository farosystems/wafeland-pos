import { supabase } from "@/lib/supabaseClient";
import { Caja, CreateCajaData } from "@/types/caja";

export async function getCajas() {
  const { data, error } = await supabase
    .from("cajas")
    .select("*");
  if (error) throw error;
  return data as Caja[];
}

export async function createCaja(caja: CreateCajaData) {
  // Solo enviar los campos válidos para la tabla
  console.log("Insertando caja:", caja);
  const { descripcion, turno } = caja;
  const { data, error } = await supabase
    .from("cajas")
    .insert([{ descripcion, turno }])
    .select()
    .single();
  if (error) throw error;
  return data as Caja;
}

export async function updateCaja(id: number, caja: Partial<CreateCajaData>) {
  const { descripcion, turno } = caja;
  const { data, error } = await supabase
    .from("cajas")
    .update({ descripcion, turno })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Caja;
}

export async function deleteCaja(id: number) {
  const { error } = await supabase
    .from("cajas")
    .delete()
    .eq("id", id);
  if (error) throw error;
} 
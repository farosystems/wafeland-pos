import { supabase } from "@/lib/supabaseClient";
import { Liquidacion, CreateLiquidacionData } from "@/types/liquidacion";

export async function getLiquidaciones() {
  const { data, error } = await supabase
    .from("liquidaciones")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw error;
  return data as Liquidacion[];
}

export async function createLiquidacion(liquidacion: CreateLiquidacionData) {
  const { data, error } = await supabase
    .from("liquidaciones")
    .insert([liquidacion])
    .select()
    .single();
  if (error) throw error;
  return data as Liquidacion;
}

export async function checkExistingLiquidacion(empleadoId: number, desde: string, hasta: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('liquidaciones')
    .select('*', { count: 'exact', head: true })
    .eq('fk_empleado', empleadoId)
    .eq('desde', desde)
    .eq('hasta', hasta);

  if (error) {
    console.error('Error checking for existing liquidation:', error);
    throw error;
  }

  return (count ?? 0) > 0;
} 
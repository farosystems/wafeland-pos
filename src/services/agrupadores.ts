import { supabase } from "@/lib/supabaseClient";
import { Agrupador, CreateAgrupadorData, UpdateAgrupadorData } from "@/types/agrupador";

export async function getAgrupadores() {
  const { data, error } = await supabase
    .from("agrupadores")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw error;
  return data as Agrupador[];
}

export async function createAgrupador(agrupador: CreateAgrupadorData) {
  const { data, error } = await supabase
    .from("agrupadores")
    .insert([agrupador])
    .select()
    .single();
  if (error) throw error;
  return data as Agrupador;
}

export async function updateAgrupador(id: number, agrupador: UpdateAgrupadorData) {
  const { data, error } = await supabase
    .from("agrupadores")
    .update(agrupador)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Agrupador;
}

export async function deleteAgrupador(id: number) {
  const { error } = await supabase.from("agrupadores").delete().eq("id", id);
  if (error) throw error;
} 
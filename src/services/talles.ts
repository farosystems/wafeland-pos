import { supabase } from "@/lib/supabaseClient";
import { Talle, CreateTalleData, UpdateTalleData } from "@/types/talle";

export async function getTalles(): Promise<Talle[]> {
  const { data, error } = await supabase
    .from("talles")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data as Talle[];
}

export async function addTalle(talle: CreateTalleData): Promise<Talle> {
  const { data, error } = await supabase
    .from("talles")
    .insert([talle])
    .select()
    .single();
  if (error) throw error;
  return data as Talle;
}

export async function editTalle(id: number, talle: UpdateTalleData): Promise<Talle> {
  const { data, error } = await supabase
    .from("talles")
    .update(talle)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Talle;
}

export async function deleteTalle(id: number): Promise<void> {
  const { error } = await supabase
    .from("talles")
    .delete()
    .eq("id", id);
  if (error) throw error;
} 
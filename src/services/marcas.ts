import { supabase } from "@/lib/supabaseClient";
import { Marca, CreateMarcaData, UpdateMarcaData } from "@/types/marca";

export async function getMarcas(): Promise<Marca[]> {
  const { data, error } = await supabase
    .from("marcas")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data as Marca[];
}

export async function addMarca(marca: CreateMarcaData): Promise<Marca> {
  const { data, error } = await supabase
    .from("marcas")
    .insert([marca])
    .select()
    .single();
  if (error) throw error;
  return data as Marca;
}

export async function editMarca(id: number, marca: UpdateMarcaData): Promise<Marca> {
  const { data, error } = await supabase
    .from("marcas")
    .update(marca)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Marca;
}

export async function deleteMarca(id: number): Promise<void> {
  const { error } = await supabase
    .from("marcas")
    .delete()
    .eq("id", id);
  if (error) throw error;
} 
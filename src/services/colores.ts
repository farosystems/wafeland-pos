import { supabase } from "@/lib/supabaseClient";
import { Color, CreateColorData, UpdateColorData } from "@/types/color";

export async function getColores(): Promise<Color[]> {
  const { data, error } = await supabase
    .from("color")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data as Color[];
}

export async function addColor(color: CreateColorData): Promise<Color> {
  const { data, error } = await supabase
    .from("color")
    .insert([color])
    .select()
    .single();
  if (error) throw error;
  return data as Color;
}

export async function editColor(id: number, color: UpdateColorData): Promise<Color> {
  const { data, error } = await supabase
    .from("color")
    .update(color)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Color;
}

export async function deleteColor(id: number): Promise<void> {
  const { error } = await supabase
    .from("color")
    .delete()
    .eq("id", id);
  if (error) throw error;
} 
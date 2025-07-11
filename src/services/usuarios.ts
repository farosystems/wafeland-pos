import { supabase } from "@/lib/supabaseClient";
import { Usuario, CreateUsuarioData } from "@/types/usuario";

export async function getUsuarios() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw error;
  return data as Usuario[];
}

export async function createUsuario(usuario: CreateUsuarioData) {
  const { data, error } = await supabase
    .from("usuarios")
    .insert([usuario])
    .select()
    .single();
  if (error) throw error;
  return data as Usuario;
}

export async function updateUsuario(id: number, usuario: Partial<CreateUsuarioData>) {
  const { data, error } = await supabase
    .from("usuarios")
    .update(usuario)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Usuario;
}

export async function deleteUsuario(id: number) {
  const { error } = await supabase.from("usuarios").delete().eq("id", id);
  if (error) throw error;
} 
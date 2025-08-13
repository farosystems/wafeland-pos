import { supabase } from "@/lib/supabaseClient";
import { Usuario, CreateUsuarioData } from "@/types/usuario";

export async function getUsuarios() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("id", { ascending: false });
  
  if (error) {
    console.error("Error obteniendo usuarios:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
  
  return data as Usuario[];
}

export async function createUsuario(usuario: CreateUsuarioData) {
  const { data, error } = await supabase
    .from("usuarios")
    .insert([usuario])
    .select()
    .single();
  
  if (error) {
    console.error("Error creando usuario:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
  
  return data as Usuario;
}

export async function updateUsuario(id: number, usuario: Partial<CreateUsuarioData>) {
  const { data, error } = await supabase
    .from("usuarios")
    .update(usuario)
    .eq("id", id)
    .select()
    .single();
  
  if (error) {
    console.error("Error actualizando usuario:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
  
  return data as Usuario;
}

export async function deleteUsuario(id: number) {
  const { error } = await supabase.from("usuarios").delete().eq("id", id);
  
  if (error) {
    console.error("Error eliminando usuario:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
}

// Función para verificar si un email ya existe
export async function verificarEmailExistente(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .single();
  
  if (error && error.code !== "PGRST116") {
    console.error("Error verificando email:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
  
  return !!data; // Retorna true si el email existe, false si no
} 
import { supabase } from "@/lib/supabaseClient";

export interface ConfiguracionEmpresa {
  id: number;
  nombre: string;
  imagen: string | null;
  color_primario?: string;
  creado_el?: string;
}

export async function getConfiguracionEmpresa(): Promise<ConfiguracionEmpresa | null> {
  const { data, error } = await supabase
    .from("configuracion")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) return null;
  return data as ConfiguracionEmpresa;
}

export async function updateConfiguracionEmpresa(nombre: string, imagen: string | null, color_primario?: string) {
  const { data, error } = await supabase
    .from("configuracion")
    .update({ nombre, imagen, color_primario })
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return data as ConfiguracionEmpresa;
}

export async function uploadLogoEmpresa(file: File): Promise<string> {
  console.log("Subiendo archivo:", file, "Nombre:", file.name, "Tipo:", file.type, "Tamaño:", file.size);
  // Usa el nombre original del archivo
  const filePath = file.name;
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const { error } = await supabase.storage.from('configuracion').upload(filePath, blob, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('configuracion').getPublicUrl(filePath);
  return data.publicUrl;
} 
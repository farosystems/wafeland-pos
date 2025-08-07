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
  try {
    console.log("Subiendo archivo:", file, "Nombre:", file.name, "Tipo:", file.type, "Tamaño:", file.size);
    
    // Verificar que el archivo sea válido
    if (!file || file.size === 0) {
      throw new Error("El archivo está vacío o no es válido");
    }
    
    // Verificar el tipo de archivo
    if (!file.type.startsWith('image/')) {
      throw new Error("El archivo debe ser una imagen");
    }
    
    // Usa un nombre único para evitar conflictos
    const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    console.log("Ruta del archivo:", filePath);
    
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    console.log("Blob creado, tamaño:", blob.size);
    
    // Subir al bucket 'configuracion'
    const { data, error } = await supabase.storage.from('configuracion').upload(filePath, blob, {
      upsert: true,
      contentType: file.type || undefined,
    });
    
    if (error) {
      console.error("Error al subir archivo:", error);
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }
    
    console.log("Archivo subido exitosamente:", data);
    const { data: urlData } = supabase.storage.from('configuracion').getPublicUrl(filePath);
    console.log("URL pública generada:", urlData.publicUrl);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error completo en uploadLogoEmpresa:", error);
    throw error;
  }
} 
import { supabase } from "@/lib/supabaseClient";

export interface TipoComprobante {
  id: number;
  descripcion: string;
  descuenta_stock: boolean;
  reingresa_stock: boolean;
  imprime_pdf: boolean;
  activo: boolean;
  creado_el: string;
}

export async function getTiposComprobantes(): Promise<TipoComprobante[]> {
  const { data, error } = await supabase
    .from("tipos_comprobantes")
    .select("*")
    .eq("activo", true)
    .neq("descripcion", "Nota de Crédito") // Excluir Nota de Crédito
    .order("descripcion", { ascending: true });
  
  if (error) throw error;
  return data as TipoComprobante[];
}

export async function createTipoComprobante(tipo: {
  descripcion: string;
  descuenta_stock?: boolean;
  reingresa_stock?: boolean;
  imprime_pdf?: boolean;
  activo?: boolean;
}) {
  const { data, error } = await supabase
    .from("tipos_comprobantes")
    .insert([{
      ...tipo,
      descuenta_stock: tipo.descuenta_stock ?? false,
      reingresa_stock: tipo.reingresa_stock ?? false,
      imprime_pdf: tipo.imprime_pdf ?? true,
      activo: tipo.activo ?? true,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data as TipoComprobante;
}

export async function updateTipoComprobante(id: number, tipo: Partial<TipoComprobante>) {
  const { data, error } = await supabase
    .from("tipos_comprobantes")
    .update(tipo)
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return data as TipoComprobante;
}
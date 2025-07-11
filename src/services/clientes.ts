import { supabase } from "@/lib/supabaseClient";
import { Cliente, CreateClienteData } from "@/types/cliente";

export async function getClientes() {
  const { data, error } = await supabase
    .from("entidades")
    .select("*");
  if (error) throw error;
  return data as Cliente[];
}

export async function createCliente(cliente: CreateClienteData) {
  const { razon_social, tipo, email, tipo_doc, num_doc, telefono, categoria_iva } = cliente;
  const { data, error } = await supabase
    .from("entidades")
    .insert([{ razon_social, tipo, email, tipo_doc, num_doc, telefono, categoria_iva }])
    .select()
    .single();
  if (error) throw error;
  return data as Cliente;
}

export async function updateCliente(id: number, cliente: Partial<CreateClienteData>) {
  const { razon_social, tipo, email, tipo_doc, num_doc, telefono, categoria_iva } = cliente;
  const { data, error } = await supabase
    .from("entidades")
    .update({ razon_social, tipo, email, tipo_doc, num_doc, telefono, categoria_iva })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Cliente;
}

export async function deleteCliente(id: number) {
  const { error } = await supabase
    .from("entidades")
    .delete()
    .eq("id", id);
  if (error) throw error;
} 
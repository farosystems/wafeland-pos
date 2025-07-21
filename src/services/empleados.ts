import { supabase } from "@/lib/supabaseClient";
import { Empleado, CreateEmpleadoData } from "@/types/empleado";

export async function getEmpleados() {
  const { data, error } = await supabase
    .from("empleados")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data as Empleado[];
}

export async function createEmpleado(empleado: CreateEmpleadoData): Promise<Empleado> {
  const { data, error } = await supabase
    .from("empleados")
    .insert([empleado])
    .select()
    .single();
  if (error) throw error;
  return data as Empleado;
}

export async function getEmpleadoById(id: number): Promise<Empleado | null> {
  const { data, error } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Empleado;
}

export async function updateEmpleado(id: number, empleado: Partial<CreateEmpleadoData>): Promise<Empleado> {
  const { data, error } = await supabase
    .from("empleados")
    .update(empleado)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Empleado;
} 
import { supabase } from "@/lib/supabaseClient";
import { GastoEmpleado, CreateGastoEmpleadoData } from "@/types/gastoEmpleado";

export async function getGastosEmpleados() {
  const { data, error } = await supabase
    .from("gastos_empleados")
    .select("*")
    .order("creado_el", { ascending: false });
  if (error) throw error;
  return data as GastoEmpleado[];
}

export async function getGastosLoteActivo() {
  // Primero obtener el lote activo del usuario actual
  const { data: loteActivo, error: loteError } = await supabase
    .from("lotes_operaciones")
    .select("id_lote")
    .eq("abierto", true)
    .single();

  if (loteError) {
    console.error("Error al obtener lote activo:", loteError);
    throw new Error("No hay un lote activo disponible");
  }

  if (!loteActivo) {
    throw new Error("No se encontró un lote activo");
  }

  // Obtener gastos del lote activo con información relacionada
  const { data, error } = await supabase
    .from("gastos_empleados")
    .select(`
      *,
      tipo_gasto:fk_tipo_gasto(id, descripcion),
      empleado:fk_empleado(id, nombre, apellido),
      usuario:fk_usuario(id, nombre),
      cuenta_tesoreria:fk_cuenta_tesoreria(id, descripcion)
    `)
    .eq("fk_lote_operaciones", loteActivo.id_lote)
    .order("creado_el", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createGastoEmpleado(gasto: CreateGastoEmpleadoData) {
  const { data, error } = await supabase
    .from("gastos_empleados")
    .insert([gasto])
    .select()
    .single();
  if (error) throw error;
  return data as GastoEmpleado;
}

export async function getGastosPorPeriodo(empleadoId: number, desde: string, hasta: string) {
  // 1. Obtener los IDs de los tipos de gasto 'adelanto' y 'falta'
  const { data: tiposGasto, error: tiposError } = await supabase
    .from('tipo_gasto')
    .select('id, descripcion')
    .in('descripcion', ['adelanto', 'falta']);
  
  if (tiposError) {
    console.error("Error fetching tipos de gasto:", tiposError);
    throw tiposError;
  }

  const adelantoId = tiposGasto.find(t => t.descripcion === 'adelanto')?.id;
  const faltaId = tiposGasto.find(t => t.descripcion === 'falta')?.id;
  
  const tiposIds = tiposGasto.map(t => t.id);

  // 2. Consultar gastos usando los IDs
  const { data, error } = await supabase
    .from('gastos_empleados')
    .select('fk_tipo_gasto, monto')
    .eq('fk_empleado', empleadoId)
    .in('fk_tipo_gasto', tiposIds)
    .gte('creado_el', desde)
    .lte('creado_el', hasta);

  if (error) {
    console.error("Error fetching gastos por periodo:", error);
    throw error;
  }
  
  // 3. Calcular totales
  const adelantos = data
    .filter(g => g.fk_tipo_gasto === adelantoId)
    .reduce((sum, g) => sum + (g.monto || 0), 0);
  
  const faltas = data
    .filter(g => g.fk_tipo_gasto === faltaId)
    .reduce((sum, g) => sum + (g.monto || 0), 0);

  return { adelantos, faltas };
}

export async function getGastosAdelantoEmpleadoPeriodo(fk_empleado: number, tipo_liquidacion: string): Promise<number> {
  // Calcular fecha de inicio del periodo según tipo_liquidacion
  const now = new Date();
  let fechaInicio: Date;
  if (tipo_liquidacion === 'mensual') {
    fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (tipo_liquidacion === 'quincenal') {
    if (now.getDate() <= 15) {
      fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      fechaInicio = new Date(now.getFullYear(), now.getMonth(), 16);
    }
  } else if (tipo_liquidacion === 'semanal') {
    const day = now.getDay();
    fechaInicio = new Date(now);
    fechaInicio.setDate(now.getDate() - day);
  } else {
    fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
  const { data, error } = await supabase
    .from("gastos_empleados")
    .select("monto")
    .eq("fk_empleado", fk_empleado)
    .eq("tipo_gasto", "adelanto")
    .gte("creado_el", fechaInicioStr);
  if (error) throw error;
  const total = (data as { monto: number }[]).reduce((sum, g) => sum + (g.monto || 0), 0);
  return total;
} 

export async function getTotalAdelantosEnPeriodo(empleadoId: number, desde: string, hasta: string, adelantoTipoGastoId: number): Promise<number> {
    const { data, error } = await supabase
        .from("gastos_empleados")
        .select("monto")
        .eq("fk_empleado", empleadoId)
        .eq("fk_tipo_gasto", adelantoTipoGastoId)
        .gte("creado_el", desde)
        .lte("creado_el", hasta);

    if (error) {
      console.error("Error fetching total adelantos:", error);
      throw error;
    }
    const total = data.reduce((sum, g) => sum + (g.monto || 0), 0);
    return total;
} 

export async function getGastosPorLote(idLote: number) {
  const { data, error } = await supabase
    .from("gastos_empleados")
    .select(`
      *,
      tipo_gasto:fk_tipo_gasto(id, descripcion),
      empleado:fk_empleado(id, nombre, apellido),
      usuario:fk_usuario(id, nombre),
      cuenta_tesoreria:fk_cuenta_tesoreria(id, descripcion)
    `)
    .eq("fk_lote_operaciones", idLote)
    .order("creado_el", { ascending: false });
  
  if (error) throw error;
  return data;
} 
import { supabase } from "@/lib/supabaseClient";
import { Liquidacion, CreateLiquidacionData } from "@/types/liquidacion";

export async function getLiquidaciones() {
  const { data, error } = await supabase
    .from("liquidaciones")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw error;
  
  // Mapear los datos de la estructura real a la estructura esperada
  const liquidaciones = data.map((item: any) => ({
    id: item.id,
    creado_el: item.creado_el,
    fk_empleado: item.fk_empleado,
    desde: item.desde,
    hasta: item.hasta,
    sueldo_base: item.sueldo_base || 0,
    total_adelantos: item.total_adelantos || 0,
    total_faltas: item.total_faltas || 0,
    neto_liquidado: item.neto_liquidado || 0,
    // Campos opcionales que pueden no existir en la tabla
    total_ventas: item.total_ventas || 0,
    comision: item.comision || 0,
    total_liquidacion: item.total_liquidacion || 0,
    estado: item.estado || 'pendiente'
  }));
  
  return liquidaciones as Liquidacion[];
}

export async function createLiquidacion(liquidacion: CreateLiquidacionData) {
  // Usar solo los campos que existen en la tabla real
  const liquidacionData = {
    fk_empleado: liquidacion.fk_empleado,
    desde: liquidacion.desde,
    hasta: liquidacion.hasta,
    sueldo_base: liquidacion.sueldo_base,
    total_adelantos: liquidacion.total_adelantos,
    total_faltas: liquidacion.total_faltas,
    neto_liquidado: liquidacion.neto_liquidado
  };

  console.log('Datos que se van a insertar:', liquidacionData);

  const { data, error } = await supabase
    .from("liquidaciones")
    .insert([liquidacionData])
    .select()
    .single();
    
  if (error) {
    console.error('Error al crear liquidación:', error);
    throw error;
  }
  
  return data as Liquidacion;
}

export async function checkExistingLiquidacion(empleadoId: number, desde: string, hasta: string): Promise<boolean> {
  try {
    console.log('Verificando liquidación existente:', { empleadoId, desde, hasta });
    
    // Usar la estructura real de la tabla
    const { count, error } = await supabase
      .from('liquidaciones')
      .select('*', { count: 'exact', head: true })
      .eq('fk_empleado', empleadoId)
      .eq('desde', desde)
      .eq('hasta', hasta);

    if (error) {
      console.error('Error checking for existing liquidation:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        empleadoId,
        desde,
        hasta
      });
      throw new Error(`Error al verificar liquidación existente: ${error.message}`);
    }

    const exists = (count ?? 0) > 0;
    console.log('Resultado de verificación:', { count, exists });
    return exists;
  } catch (error) {
    console.error('Error in checkExistingLiquidacion:', {
      empleadoId,
      desde,
      hasta,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
} 
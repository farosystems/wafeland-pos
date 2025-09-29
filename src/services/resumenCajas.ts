import { supabase } from "@/lib/supabaseClient";
import { MovimientoGasto, ResumenPorTipo, FiltrosFecha, ResumenGeneral } from "@/types/resumenCajas";

export async function getMovimientosGastos(filtros?: FiltrosFecha): Promise<MovimientoGasto[]> {
  let query = supabase
    .from("gastos_empleados")
    .select(`
      *,
      lotes_operaciones!inner(
        id_lote,
        fk_id_caja,
        fecha_apertura,
        hora_apertura,
        cajas!inner(
          id,
          descripcion,
          turno
        )
      ),
      tipos_gastos!fk_tipo_gasto(
        id,
        descripcion,
        tipo_movimiento
      ),
      empleados(
        id,
        nombre,
        apellido
      ),
      cuentas_tesoreria!inner(
        id,
        descripcion
      ),
      usuarios!inner(
        id,
        nombre
      )
    `)
    .order("creado_el", { ascending: false });

  if (filtros?.fecha_desde) {
    query = query.gte("creado_el", filtros.fecha_desde);
  }

  if (filtros?.fecha_hasta) {
    query = query.lte("creado_el", filtros.fecha_hasta + " 23:59:59");
  }

  const { data, error } = await query;

  if (error) throw error;

  return data?.map(item => ({
    id: item.id,
    fk_lote_operaciones: item.fk_lote_operaciones,
    fk_tipo_gasto: item.fk_tipo_gasto,
    fk_empleado: item.fk_empleado,
    fk_cuenta_tesoreria: item.fk_cuenta_tesoreria,
    fk_usuario: item.fk_usuario,
    monto: item.monto,
    descripcion: item.descripcion,
    creado_el: item.creado_el,
    lote: {
      id_lote: item.lotes_operaciones.id_lote,
      fk_id_caja: item.lotes_operaciones.fk_id_caja,
      fecha_apertura: item.lotes_operaciones.fecha_apertura,
      hora_apertura: item.lotes_operaciones.hora_apertura,
      caja: {
        id: item.lotes_operaciones.cajas.id,
        descripcion: item.lotes_operaciones.cajas.descripcion,
        turno: item.lotes_operaciones.cajas.turno,
      }
    },
    tipo_gasto: {
      id: item.tipos_gastos.id,
      descripcion: item.tipos_gastos.descripcion,
      tipo_movimiento: item.tipos_gastos.tipo_movimiento,
    },
    empleado: item.empleados ? {
      id: item.empleados.id,
      nombre: item.empleados.nombre,
      apellido: item.empleados.apellido,
    } : undefined,
    cuenta_tesoreria: {
      id: item.cuentas_tesoreria.id,
      descripcion: item.cuentas_tesoreria.descripcion,
    },
    usuario: {
      id: item.usuarios.id,
      nombre: item.usuarios.nombre,
    }
  })) || [];
}

export async function getResumenPorTipos(filtros?: FiltrosFecha): Promise<ResumenPorTipo[]> {
  // Consulta simplificada sin JOIN para evitar ambigüedades
  let query = supabase
    .from("gastos_empleados")
    .select("monto, fk_tipo_gasto");

  if (filtros?.fecha_desde) {
    query = query.gte("creado_el", filtros.fecha_desde);
  }

  if (filtros?.fecha_hasta) {
    query = query.lte("creado_el", filtros.fecha_hasta + " 23:59:59");
  }

  const { data, error } = await query;

  if (error) throw error;

  // Obtener tipos de gasto por separado
  const { data: tiposGasto, error: tiposError } = await supabase
    .from("tipos_gastos")
    .select("id, descripcion, tipo_movimiento");

  if (tiposError) throw tiposError;

  // Crear mapa de tipos para acceso rápido
  const tiposMap = new Map();
  tiposGasto?.forEach(tipo => {
    tiposMap.set(tipo.id, tipo);
  });

  // Agrupamos por tipo de gasto
  const agrupado = data?.reduce((acc: Record<string, ResumenPorTipo>, item) => {
    const tipoGasto = tiposMap.get(item.fk_tipo_gasto);
    if (!tipoGasto) return acc;

    const key = tipoGasto.descripcion;

    if (!acc[key]) {
      acc[key] = {
        tipo_descripcion: tipoGasto.descripcion,
        tipo_movimiento: tipoGasto.tipo_movimiento,
        total_monto: 0,
        cantidad_movimientos: 0,
      };
    }

    acc[key].total_monto += item.monto;
    acc[key].cantidad_movimientos += 1;

    return acc;
  }, {}) || {};

  return Object.values(agrupado);
}

export async function getResumenGeneral(filtros?: FiltrosFecha): Promise<ResumenGeneral> {
  let query = supabase
    .from("gastos_empleados")
    .select("monto, fk_tipo_gasto");

  if (filtros?.fecha_desde) {
    query = query.gte("creado_el", filtros.fecha_desde);
  }

  if (filtros?.fecha_hasta) {
    query = query.lte("creado_el", filtros.fecha_hasta + " 23:59:59");
  }

  const { data, error } = await query;

  if (error) throw error;

  // Obtener tipos de gasto por separado
  const { data: tiposGasto, error: tiposError } = await supabase
    .from("tipos_gastos")
    .select("id, tipo_movimiento");

  if (tiposError) throw tiposError;

  // Crear mapa de tipos para acceso rápido
  const tiposMap = new Map();
  tiposGasto?.forEach(tipo => {
    tiposMap.set(tipo.id, tipo);
  });

  const resumen = data?.reduce(
    (acc, item) => {
      const tipoGasto = tiposMap.get(item.fk_tipo_gasto);
      if (!tipoGasto) return acc;

      if (tipoGasto.tipo_movimiento === 'ingreso') {
        acc.total_ingresos += item.monto;
      } else if (tipoGasto.tipo_movimiento === 'egreso') {
        acc.total_egresos += item.monto;
      } else {
        // Si no está definido, lo consideramos egreso por defecto (compatibilidad)
        acc.total_egresos += item.monto;
      }
      acc.cantidad_movimientos += 1;
      return acc;
    },
    {
      total_ingresos: 0,
      total_egresos: 0,
      balance: 0,
      cantidad_movimientos: 0,
    }
  ) || {
    total_ingresos: 0,
    total_egresos: 0,
    balance: 0,
    cantidad_movimientos: 0,
  };

  resumen.balance = resumen.total_ingresos - resumen.total_egresos;

  return resumen;
}
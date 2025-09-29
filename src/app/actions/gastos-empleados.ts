'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { GastoEmpleado, CreateGastoEmpleadoData } from '@/types/gastoEmpleado';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUserPermissions() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('No autorizado');
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, rol, email')
    .eq('clerk_user_id', userId)
    .single();

  if (!usuario) {
    throw new Error('Usuario no encontrado en el sistema');
  }

  return usuario;
}

export async function getGastosEmpleados(): Promise<GastoEmpleado[]> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("gastos_empleados")
    .select("*")
    .order("id", { ascending: false });
    
  if (error) throw error;
  return data as GastoEmpleado[];
}

export async function createGastoEmpleado(gasto: CreateGastoEmpleadoData): Promise<GastoEmpleado> {
  await checkUserPermissions();
  
  // Validar campos requeridos
  if (!gasto.fk_tipo_gasto) {
    throw new Error('El tipo de gasto es requerido');
  }
  if (!gasto.monto || gasto.monto <= 0) {
    throw new Error('El monto es requerido y debe ser mayor a 0');
  }
  if (!gasto.fk_lote_operaciones) {
    throw new Error('El lote de operaciones es requerido');
  }
  if (!gasto.fk_usuario) {
    throw new Error('El usuario es requerido');
  }
  if (!gasto.fk_cuenta_tesoreria) {
    throw new Error('La cuenta de tesorería es requerida');
  }
  
  // Verificar si el tipo de gasto requiere empleado y obtener el tipo de movimiento
  const { data: tipoGasto, error: errorTipo } = await supabase
    .from('tipo_gasto')
    .select('obliga_empleado, afecta_caja, tipo_movimiento')
    .eq('id', gasto.fk_tipo_gasto)
    .single();
    
  if (errorTipo) {
    throw new Error('Error al verificar el tipo de gasto');
  }
  
  console.log('Datos del tipo de gasto:', {
    id: gasto.fk_tipo_gasto,
    obliga_empleado: tipoGasto.obliga_empleado,
    afecta_caja: tipoGasto.afecta_caja,
    tipo_movimiento: tipoGasto.tipo_movimiento
  });
  
  // Solo validar empleado si el tipo de gasto lo requiere
  if (tipoGasto.obliga_empleado && !gasto.fk_empleado) {
    throw new Error('El empleado es requerido para este tipo de gasto');
  }
  
  // Crear el gasto
  const { data, error } = await supabase
    .from("gastos_empleados")
    .insert([gasto])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating gasto empleado:', error);
    throw new Error(`Error al crear el gasto: ${error.message}`);
  }
  
  // Registrar movimiento en detalle_lotes_operaciones si el tipo de gasto afecta la caja
  if (tipoGasto.afecta_caja && gasto.fk_lote_operaciones && gasto.fk_cuenta_tesoreria) {
    // Determinar el tipo de movimiento basado en el tipo_movimiento del tipo de gasto
    // Si no está definido, usar "egreso" como comportamiento por defecto (compatibilidad)
    const tipoMovimiento = tipoGasto.tipo_movimiento || 'egreso';

    console.log('Intentando registrar movimiento en detalle_lotes_operaciones:', {
      fk_id_lote: gasto.fk_lote_operaciones,
      fk_id_cuenta_tesoreria: gasto.fk_cuenta_tesoreria,
      tipo: tipoMovimiento,
      monto: gasto.monto,
      afecta_caja: tipoGasto.afecta_caja,
      tipo_movimiento_definido: tipoGasto.tipo_movimiento
    });

    const { error: errorDetalle } = await supabase
      .from("detalle_lotes_operaciones")
      .insert([{
        fk_id_lote: gasto.fk_lote_operaciones,
        fk_id_cuenta_tesoreria: gasto.fk_cuenta_tesoreria,
        tipo: tipoMovimiento,
        monto: gasto.monto
      }]);

    if (errorDetalle) {
      console.error('Error creating detalle lote operacion:', errorDetalle);
      // No lanzamos error aquí para no revertir el gasto ya creado
      // Solo loggeamos el error
    } else {
      console.log(`${tipoMovimiento.toUpperCase()} registrado exitosamente en detalle_lotes_operaciones`);
    }
  } else {
    console.log('No se registra movimiento porque:', {
      afecta_caja: tipoGasto.afecta_caja,
      tiene_lote: !!gasto.fk_lote_operaciones,
      tiene_cuenta: !!gasto.fk_cuenta_tesoreria
    });
  }
  
  return data as GastoEmpleado;
}

export async function updateGastoEmpleado(id: number, gasto: Partial<CreateGastoEmpleadoData>): Promise<GastoEmpleado> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("gastos_empleados")
    .update(gasto)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data as GastoEmpleado;
}

export async function deleteGastoEmpleado(id: number): Promise<void> {
  await checkUserPermissions();
  
  const { error } = await supabase
    .from("gastos_empleados")
    .delete()
    .eq("id", id);
    
  if (error) throw error;
}

export async function getGastoEmpleadoById(id: number): Promise<GastoEmpleado | null> {
  await checkUserPermissions();
  
  const { data, error } = await supabase
    .from("gastos_empleados")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return data as GastoEmpleado;
} 
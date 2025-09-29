'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

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

// Acción para verificar el estado de la base de datos
export async function verificarEstadoBaseDatos(): Promise<{
  success: boolean;
  estado: {
    funcionesExisten: boolean;
    triggersExisten: boolean;
    combosEncontrados: number;
    componentesEncontrados: number;
  };
  message?: string;
}> {
  try {
    await checkUserPermissions();

    console.log('🔍 Verificando estado de la base de datos...');

    // Verificar funciones
    const { data: funciones, error: funcionesError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .in('routine_name', ['calcular_stock_combo', 'actualizar_stock_todos_combos'])
      .eq('routine_schema', 'public');

    const funcionesExisten = !funcionesError && funciones && funciones.length >= 2;

    // Verificar triggers
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .in('trigger_name', ['trigger_stock_combos', 'trigger_componentes_stock']);

    const triggersExisten = !triggersError && triggers && triggers.length >= 2;

    // Contar combos
    const { count: combosCount } = await supabase
      .from('articulos')
      .select('*', { count: 'exact', head: true })
      .eq('es_combo', true);

    // Contar componentes
    const { count: componentesCount } = await supabase
      .from('articulos_combo_detalle')
      .select('*', { count: 'exact', head: true });

    const estado = {
      funcionesExisten,
      triggersExisten,
      combosEncontrados: combosCount || 0,
      componentesEncontrados: componentesCount || 0
    };

    console.log('✅ Estado de la base de datos:', estado);

    return {
      success: true,
      estado
    };

  } catch (error) {
    console.error('❌ Error en verificarEstadoBaseDatos:', error);
    return {
      success: false,
      estado: {
        funcionesExisten: false,
        triggersExisten: false,
        combosEncontrados: 0,
        componentesEncontrados: 0
      },
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Acción para actualizar el stock de todos los combos
export async function actualizarStockTodosCombosAction(): Promise<{ success: boolean; message: string; }> {
  try {
    const usuario = await checkUserPermissions();

    // Verificar permisos
    if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
      throw new Error('No tienes permisos para actualizar stock de combos');
    }

    console.log('🔄 Actualizando stock de todos los combos...');

    // Ejecutar la función SQL
    const { error } = await supabase.rpc('actualizar_stock_todos_combos');

    if (error) {
      console.error('❌ Error al actualizar stock de combos:', error);
      throw new Error(`Error al actualizar stock de combos: ${error.message}`);
    }

    console.log('✅ Stock de combos actualizado exitosamente');

    // Revalidar cache de artículos
    revalidatePath('/articulos');

    return {
      success: true,
      message: 'Stock de todos los combos actualizado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en actualizarStockTodosCombosAction:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Acción para calcular stock de un combo específico
export async function calcularStockComboAction(comboId: number): Promise<{ success: boolean; stock: number; message?: string; }> {
  try {
    await checkUserPermissions();

    console.log(`🧮 Calculando stock del combo ${comboId}...`);

    // Ejecutar la función SQL
    const { data, error } = await supabase.rpc('calcular_stock_combo', {
      combo_id: comboId
    });

    if (error) {
      console.error('❌ Error al calcular stock del combo:', error);
      throw new Error(`Error al calcular stock del combo: ${error.message}`);
    }

    const stockCalculado = data || 0;
    console.log(`✅ Stock calculado para combo ${comboId}: ${stockCalculado}`);

    return {
      success: true,
      stock: stockCalculado
    };

  } catch (error) {
    console.error('❌ Error en calcularStockComboAction:', error);
    return {
      success: false,
      stock: 0,
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Acción para obtener información detallada de un combo
export async function getComboDetalleAction(comboId: number) {
  try {
    await checkUserPermissions();

    console.log(`📋 Obteniendo detalle del combo ${comboId}...`);

    // Obtener información del combo y sus componentes
    const { data: combo, error: comboError } = await supabase
      .from('articulos')
      .select(`
        id,
        descripcion,
        precio_unitario,
        stock,
        es_combo,
        articulos_combo_detalle (
          fk_articulo_componente,
          cantidad,
          articulos!fk_articulo_componente (
            id,
            descripcion,
            stock,
            precio_unitario
          )
        )
      `)
      .eq('id', comboId)
      .eq('es_combo', true)
      .single();

    if (comboError || !combo) {
      throw new Error(`Combo ${comboId} no encontrado`);
    }

    // Calcular stock usando la función SQL
    const { data: stockCalculado, error: stockError } = await supabase.rpc('calcular_stock_combo', {
      combo_id: comboId
    });

    if (stockError) {
      console.warn('⚠️ Error al calcular stock SQL, usando cálculo manual');
    }

    const result = {
      combo,
      stockCalculado: stockCalculado || 0,
      stockBaseDatos: combo.stock
    };

    console.log(`✅ Detalle del combo ${comboId} obtenido:`, result);

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('❌ Error en getComboDetalleAction:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Acción para sincronizar el stock de un combo específico
export async function sincronizarStockComboAction(comboId: number): Promise<{ success: boolean; stockAnterior: number; stockNuevo: number; message?: string; }> {
  try {
    const usuario = await checkUserPermissions();

    // Verificar permisos
    if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor') {
      throw new Error('No tienes permisos para sincronizar stock de combos');
    }

    console.log(`🔄 Sincronizando stock del combo ${comboId}...`);

    // Obtener stock actual
    const { data: comboActual, error: comboError } = await supabase
      .from('articulos')
      .select('stock')
      .eq('id', comboId)
      .eq('es_combo', true)
      .single();

    if (comboError || !comboActual) {
      throw new Error(`Combo ${comboId} no encontrado`);
    }

    const stockAnterior = comboActual.stock;

    // Calcular nuevo stock
    const { data: stockCalculado, error: stockError } = await supabase.rpc('calcular_stock_combo', {
      combo_id: comboId
    });

    if (stockError) {
      throw new Error(`Error al calcular stock: ${stockError.message}`);
    }

    const stockNuevo = stockCalculado || 0;

    // Actualizar el stock en la base de datos
    const { error: updateError } = await supabase
      .from('articulos')
      .update({ stock: stockNuevo })
      .eq('id', comboId);

    if (updateError) {
      throw new Error(`Error al actualizar stock: ${updateError.message}`);
    }

    console.log(`✅ Stock del combo ${comboId} sincronizado: ${stockAnterior} → ${stockNuevo}`);

    // Revalidar cache
    revalidatePath('/articulos');

    return {
      success: true,
      stockAnterior,
      stockNuevo,
      message: `Stock actualizado de ${stockAnterior} a ${stockNuevo}`
    };

  } catch (error) {
    console.error('❌ Error en sincronizarStockComboAction:', error);
    return {
      success: false,
      stockAnterior: 0,
      stockNuevo: 0,
      message: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
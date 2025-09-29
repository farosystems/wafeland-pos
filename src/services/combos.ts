import { supabase } from "@/lib/supabaseClient";

// Tipo para componente de combo
interface ComponenteCombo {
  cantidad: number;
  articulos?: {
    id: number;
    descripcion: string;
    stock: number;
    precio_unitario?: number;
  };
  articulo_componente?: {
    id: number;
    descripcion: string;
    stock: number;
    precio_unitario?: number;
  };
}

// Función para descontar stock de combos y artículos individuales
export async function descontarStockArticulo(articuloId: number, cantidad: number, ordenId: number, origen: string = 'venta') {
  // Usar el cliente de supabase existente desde el navegador

  console.log('Descontando stock para artículo:', articuloId, 'cantidad:', cantidad);

  // Obtener información del artículo
  const { data: articulo, error: articuloError } = await supabase
    .from('articulos')
    .select('id, descripcion, stock, es_combo')
    .eq('id', articuloId)
    .single();

  if (articuloError || !articulo) {
    throw new Error(`No se pudo obtener información del artículo ${articuloId}`);
  }

  if (articulo.es_combo) {
    // Si es un combo, obtener componentes por separado (sin JOIN para evitar ambigüedades)
    const { data: componentesData, error: componentesError } = await supabase
      .from('articulos_combo_detalle')
      .select('fk_articulo_componente, cantidad')
      .eq('fk_articulo_combo', articuloId);

    if (componentesError) {
      throw new Error(`Error al obtener componentes del combo: ${componentesError.message}`);
    }

    const componentes = componentesData || [];

    console.log('Componentes del combo encontrados:', componentes);

    for (const componente of componentes) {
      const cantidadADescontar = componente.cantidad * cantidad;

      // Obtener información del artículo componente por separado
      const { data: articuloComponente, error: articuloError } = await supabase
        .from('articulos')
        .select('id, descripcion, stock')
        .eq('id', componente.fk_articulo_componente)
        .single();

      if (articuloError || !articuloComponente) {
        console.warn(`Componente ${componente.fk_articulo_componente} no encontrado`);
        continue;
      }

      const nuevoStock = articuloComponente.stock - cantidadADescontar;

      console.log(`Descontando ${cantidadADescontar} de ${articuloComponente.descripcion} (stock actual: ${articuloComponente.stock} -> ${Math.max(0, nuevoStock)})`);

      // Actualizar stock del componente
      const { error: updateError } = await supabase
        .from('articulos')
        .update({ stock: Math.max(0, nuevoStock) })
        .eq('id', articuloComponente.id);

      if (updateError) {
        console.error(`Error al actualizar stock del componente ${articuloComponente.id}:`, updateError);
        throw new Error(`Error al actualizar stock del componente ${articuloComponente.descripcion}: ${updateError.message}`);
      }

      // Registrar movimiento de stock del componente
      const { error: movimientoError } = await supabase
        .from('movimientos_stock')
        .insert([{
          fk_id_articulos: articuloComponente.id,
          fk_id_orden: ordenId,
          origen: `${origen}_combo`,
          tipo: 'salida',
          cantidad: cantidadADescontar,
          stock_actual: Math.max(0, nuevoStock),
        }]);

      if (movimientoError) {
        console.error(`Error al registrar movimiento de stock del componente ${articuloComponente.id}:`, movimientoError);
        // No fallar aquí, solo logear el error
      }
    }

    // También descontar 1 del stock del combo principal
    const nuevoStockCombo = articulo.stock - cantidad;
    await supabase
      .from('articulos')
      .update({ stock: Math.max(0, nuevoStockCombo) })
      .eq('id', articulo.id);

    // Registrar movimiento de stock del combo
    await supabase
      .from('movimientos_stock')
      .insert([{
        fk_id_articulos: articulo.id,
        fk_id_orden: ordenId,
        origen: origen,
        tipo: 'salida',
        cantidad: cantidad,
        stock_actual: Math.max(0, nuevoStockCombo),
      }]);

  } else {
    // Si es un artículo individual, descontar stock normalmente
    const nuevoStock = articulo.stock - cantidad;

    // Actualizar stock
    await supabase
      .from('articulos')
      .update({ stock: Math.max(0, nuevoStock) })
      .eq('id', articulo.id);

    // Registrar movimiento de stock
    await supabase
      .from('movimientos_stock')
      .insert([{
        fk_id_articulos: articulo.id,
        fk_id_orden: ordenId,
        origen: origen,
        tipo: 'salida',
        cantidad: cantidad,
        stock_actual: Math.max(0, nuevoStock),
      }]);
  }
}

// Función para verificar disponibilidad de stock antes de la venta
export async function verificarStockDisponible(articuloId: number, cantidadSolicitada: number): Promise<{
  disponible: boolean;
  mensaje?: string;
  stockDisponible?: number;
}> {
  // Obtener información del artículo
  const { data: articulo, error: articuloError } = await supabase
    .from('articulos')
    .select('id, descripcion, stock, es_combo')
    .eq('id', articuloId)
    .single();

  if (articuloError || !articulo) {
    return {
      disponible: false,
      mensaje: `Artículo ${articuloId} no encontrado`
    };
  }

  if (articulo.es_combo) {
    // Si es un combo, obtener componentes por separado
    const { data: componentesData, error: componentesError } = await supabase
      .from('articulos_combo_detalle')
      .select('fk_articulo_componente, cantidad')
      .eq('fk_articulo_combo', articuloId);

    if (componentesError) {
      return {
        disponible: false,
        mensaje: `Error al obtener componentes del combo: ${componentesError.message}`
      };
    }

    const componentes = componentesData || [];

    if (componentes.length === 0) {
      return {
        disponible: false,
        mensaje: `El combo "${articulo.descripcion}" no tiene componentes configurados`
      };
    }

    let stockMinimoCombo = Infinity;

    for (const componente of componentes) {
      // Obtener información del artículo componente por separado
      const { data: articuloComponente, error: articuloError } = await supabase
        .from('articulos')
        .select('id, descripcion, stock')
        .eq('id', componente.fk_articulo_componente)
        .single();

      if (articuloError || !articuloComponente) {
        return {
          disponible: false,
          mensaje: `Componente del combo no encontrado: ${componente.fk_articulo_componente}`
        };
      }

      const cantidadNecesaria = componente.cantidad * cantidadSolicitada;

      if (articuloComponente.stock < cantidadNecesaria) {
        return {
          disponible: false,
          mensaje: `Stock insuficiente de "${articuloComponente.descripcion}". Disponible: ${articuloComponente.stock}, necesario: ${cantidadNecesaria}`
        };
      }

      // Calcular cuántos combos se pueden hacer con este componente
      const combosConEsteComponente = Math.floor(articuloComponente.stock / componente.cantidad);
      if (combosConEsteComponente < stockMinimoCombo) {
        stockMinimoCombo = combosConEsteComponente;
      }
    }

    // También verificar stock del combo principal
    if (articulo.stock < cantidadSolicitada) {
      return {
        disponible: false,
        mensaje: `Stock insuficiente del combo "${articulo.descripcion}". Disponible: ${articulo.stock}, solicitado: ${cantidadSolicitada}`
      };
    }

    return {
      disponible: cantidadSolicitada <= Math.min(stockMinimoCombo, articulo.stock),
      stockDisponible: Math.min(stockMinimoCombo, articulo.stock)
    };

  } else {
    // Si es un artículo individual, verificar stock normalmente
    return {
      disponible: articulo.stock >= cantidadSolicitada,
      stockDisponible: articulo.stock,
      mensaje: articulo.stock < cantidadSolicitada ?
        `Stock insuficiente de "${articulo.descripcion}". Disponible: ${articulo.stock}, solicitado: ${cantidadSolicitada}` :
        undefined
    };
  }
}

// Función para obtener combos con información de componentes
export async function getCombosConComponentes() {
  const { data, error } = await supabase
    .from('articulos')
    .select(`
      id,
      descripcion,
      precio_unitario,
      stock,
      es_combo,
      activo,
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
    .eq('es_combo', true)
    .eq('activo', true)
    .order('descripcion');

  if (error) throw error;
  return data;
}

// Función para calcular stock disponible de un combo en el frontend
export function calcularStockComboFrontend(componentes: ComponenteCombo[]): number {
  if (!componentes || componentes.length === 0) {
    return 0;
  }

  let stockMinimo = Infinity;

  for (const componente of componentes) {
    const articuloComponente = componente.articulos || componente.articulo_componente;

    if (!articuloComponente) {
      return 0; // Si no se puede obtener info del componente, no se puede hacer el combo
    }

    const combosConEsteComponente = Math.floor(articuloComponente.stock / componente.cantidad);

    if (combosConEsteComponente < stockMinimo) {
      stockMinimo = combosConEsteComponente;
    }
  }

  return stockMinimo === Infinity ? 0 : Math.max(0, stockMinimo);
}

// Función para obtener información detallada de stock de un combo
export function getDetalleStockCombo(componentes: ComponenteCombo[]): {
  stockCalculado: number;
  componenteLimitante: string | null;
  detalleComponentes: Array<{
    nombre: string;
    stockDisponible: number;
    cantidadNecesaria: number;
    combosConEsteComponente: number;
  }>;
} {
  if (!componentes || componentes.length === 0) {
    return {
      stockCalculado: 0,
      componenteLimitante: null,
      detalleComponentes: []
    };
  }

  let stockMinimo = Infinity;
  let componenteLimitante = null;
  const detalleComponentes = [];

  for (const componente of componentes) {
    const articuloComponente = componente.articulos || componente.articulo_componente;

    if (!articuloComponente) {
      continue;
    }

    const combosConEsteComponente = Math.floor(articuloComponente.stock / componente.cantidad);

    detalleComponentes.push({
      nombre: articuloComponente.descripcion,
      stockDisponible: articuloComponente.stock,
      cantidadNecesaria: componente.cantidad,
      combosConEsteComponente
    });

    if (combosConEsteComponente < stockMinimo) {
      stockMinimo = combosConEsteComponente;
      componenteLimitante = articuloComponente.descripcion;
    }
  }

  return {
    stockCalculado: stockMinimo === Infinity ? 0 : Math.max(0, stockMinimo),
    componenteLimitante,
    detalleComponentes
  };
}

// Función para actualizar el stock de todos los combos
export async function actualizarStockTodosCombos() {
  const { error } = await supabase.rpc('actualizar_stock_todos_combos');

  if (error) {
    throw new Error(`Error al actualizar stock de combos: ${error.message}`);
  }

  return true;
}

// Función para calcular stock de un combo específico usando la función SQL
export async function calcularStockComboSQL(comboId: number): Promise<number> {
  const { data, error } = await supabase.rpc('calcular_stock_combo', { combo_id: comboId });

  if (error) {
    throw new Error(`Error al calcular stock del combo ${comboId}: ${error.message}`);
  }

  return data || 0;
}
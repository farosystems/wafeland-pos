import { supabase } from "@/lib/supabaseClient";
import { OrdenCompra, CreateOrdenCompraData, UpdateOrdenCompraData, OrdenCompraItem } from "@/types/ordenCompra";

export async function getOrdenesCompra(): Promise<OrdenCompra[]> {
  const { data, error } = await supabase
    .from('ordenes_compra')
    .select(`
      *,
      proveedor:clientes!fk_id_proveedor(razon_social),
      empresa:configuracion_empresa!fk_id_empresa(nombre),
      items:ordenes_compra_items(
        *,
        variante:variantes_articulos!fk_id_variante(
          articulo:articulos(descripcion),
          talle:talles(descripcion),
          color:colores(descripcion)
        )
      )
    `)
    .order('creado_el', { ascending: false });

  if (error) throw error;

  return data.map(orden => ({
    ...orden,
    proveedor_razon_social: orden.proveedor?.razon_social,
    empresa_nombre: orden.empresa?.nombre,
    items: orden.items?.map(item => ({
      ...item,
      articulo_descripcion: item.variante?.articulo?.descripcion,
      talle_descripcion: item.variante?.talle?.descripcion,
      color_descripcion: item.variante?.color?.descripcion,
    }))
  }));
}

export async function createOrdenCompra(ordenData: CreateOrdenCompraData): Promise<OrdenCompra> {
  // Crear la orden principal
  const { data: orden, error: ordenError } = await supabase
    .from('ordenes_compra')
    .insert({
      numero_orden: ordenData.numero_orden,
      fecha: ordenData.fecha,
      fk_id_proveedor: ordenData.fk_id_proveedor,
      fk_id_empresa: ordenData.fk_id_empresa,
      subtotal: ordenData.subtotal,
      descuento_porcentaje: ordenData.descuento_porcentaje,
      subtotal_menos_descuento: ordenData.subtotal_menos_descuento,
      tasa_impuestos: ordenData.tasa_impuestos,
      total_impuestos: ordenData.total_impuestos,
      envio_almacenaje: ordenData.envio_almacenaje,
      total: ordenData.total,
      estado: ordenData.estado,
      notas: ordenData.notas,
    })
    .select()
    .single();

  if (ordenError) throw ordenError;

  // Crear los items de la orden
  if (ordenData.items.length > 0) {
    const itemsToInsert = ordenData.items.map(item => ({
      fk_id_orden_compra: orden.id,
      fk_id_variante: item.fk_id_variante,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from('ordenes_compra_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;
  }

  return orden;
}

export async function editOrdenCompra(id: number, ordenData: UpdateOrdenCompraData): Promise<void> {
  const { error } = await supabase
    .from('ordenes_compra')
    .update(ordenData)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteOrdenCompra(id: number): Promise<void> {
  // Primero eliminar los items
  const { error: itemsError } = await supabase
    .from('ordenes_compra_items')
    .delete()
    .eq('fk_id_orden_compra', id);

  if (itemsError) throw itemsError;

  // Luego eliminar la orden
  const { error } = await supabase
    .from('ordenes_compra')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getProveedores(): Promise<any[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('tipo', 'proveedor')
    .order('razon_social');

  if (error) throw error;
  return data;
}

export async function getConfiguracionEmpresa(): Promise<any> {
  const { data, error } = await supabase
    .from('configuracion_empresa')
    .select('*')
    .single();

  if (error) throw error;
  return data;
} 
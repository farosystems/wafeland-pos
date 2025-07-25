import { supabase } from "@/lib/supabaseClient";
import { Variante, CreateVarianteData, UpdateVarianteData } from "@/types/variante";
import { createMovimientoStock } from "@/services/movimientosStock";
import { updateArticle } from "@/services/articles";

export async function getVariantes(): Promise<Variante[]> {
  const { data, error } = await supabase
    .from("variantes-articulos")
    .select(`*,
      articulo:fk_id_articulo(descripcion),
      talle:fk_id_talle(descripcion),
      color:fk_id_color(descripcion)
    `)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as any[]).map(v => ({
    ...v,
    articulo_descripcion: v.articulo?.descripcion || '',
    talle_descripcion: v.talle?.descripcion || '',
    color_descripcion: v.color?.descripcion || '',
  })) as Variante[];
}

export async function addVariante(variante: CreateVarianteData): Promise<Variante> {
  const { data, error } = await supabase
    .from("variantes-articulos")
    .insert([variante])
    .select()
    .single();
  if (error) throw error;
  return data as Variante;
}

export async function editVariante(id: number, variante: UpdateVarianteData): Promise<Variante> {
  const { data, error } = await supabase
    .from("variantes-articulos")
    .update(variante)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  
  // Si se actualizó el stock_unitario, crear un nuevo movimiento de stock con el ajuste
  if (typeof variante.stock_unitario === 'number') {
    const varianteCompleta = data as any;
    // Buscar el stock_unitario anterior
    const { data: varianteAnterior } = await supabase
      .from("variantes-articulos")
      .select("stock_unitario")
      .eq("id", id)
      .single();
    const stockAnterior = varianteAnterior?.stock_unitario ?? 0;
    const diferencia = variante.stock_unitario - stockAnterior;
    if (diferencia !== 0) {
      await createMovimientoStock({
        fk_id_orden: null,
        fk_id_articulos: varianteCompleta.fk_id_articulo,
        origen: "AJUSTE",
        tipo: diferencia > 0 ? "entrada" : "salida",
        cantidad: diferencia,
        fk_id_talle: varianteCompleta.fk_id_talle,
        fk_id_color: varianteCompleta.fk_id_color,
        stock_actual: variante.stock_unitario,
      });
    }
    // Recalcular el stock total del artículo sumando todas sus variantes
    const { data: variantesArticulo } = await supabase
      .from("variantes-articulos")
      .select("stock_unitario")
      .eq("fk_id_articulo", varianteCompleta.fk_id_articulo);
    const stockTotal = (variantesArticulo || []).reduce((acc, v) => acc + (v.stock_unitario ?? 0), 0);
    await updateArticle(varianteCompleta.fk_id_articulo, { stock: stockTotal });
  }
  
  return data as Variante;
}

export async function deleteVariante(id: number): Promise<void> {
  const { error } = await supabase
    .from("variantes-articulos")
    .delete()
    .eq("id", id);
  if (error) throw error;
} 
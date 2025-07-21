import { supabase } from "@/lib/supabaseClient";
import { MovimientoStock } from "@/types/movimientoStock";
import { getArticles, updateArticle } from "@/services/articles";

export async function getMovimientosStock(): Promise<MovimientoStock[]> {
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select("*")
    .order("creado_el", { ascending: false });
  if (error) throw error;
  return data as MovimientoStock[];
}

export interface MovimientoStockInsert {
  fk_id_orden: number | null;
  fk_id_articulos: number;
  origen: "FACTURA" | "NOTA DE CREDITO" | "AJUSTE";
  tipo: "entrada" | "salida";
  cantidad: number;
  creado_el?: string; // opcional, por defecto Date.now
}

export async function createMovimientoStock(mov: MovimientoStockInsert): Promise<void> {
  // Obtener el artículo actual para conocer el stock
  const articles = await getArticles();
  const articulo = articles.find(a => a.id === mov.fk_id_articulos);
  if (!articulo) throw new Error("Artículo no encontrado");
  let nuevoStock = articulo.stock + mov.cantidad;
  if (nuevoStock < 0) nuevoStock = 0;
  // Actualizar el stock del artículo
  await updateArticle(articulo.id, { stock: nuevoStock });
  // Insertar el movimiento con el stock_actual
  const { error } = await supabase
    .from("movimientos_stock")
    .insert([
      {
        fk_id_orden: mov.fk_id_orden,
        fk_id_articulos: mov.fk_id_articulos,
        origen: mov.origen,
        tipo: mov.tipo,
        cantidad: mov.cantidad,
        creado_el: mov.creado_el || new Date().toISOString(),
        stock_actual: nuevoStock,
      },
    ]);
  if (error) throw error;
} 
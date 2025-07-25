import { supabase } from "@/lib/supabaseClient";
import { MovimientoStock } from "@/types/movimientoStock";
import { getArticles, updateArticle } from "@/services/articles";

export async function getMovimientosStock() {
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select(`*, talle:fk_id_talle(descripcion), color:fk_id_color(descripcion)`) // join a talles y color
    .order("id", { ascending: false });
  if (error) throw error;
  return (data as any[]).map(m => ({
    ...m,
    talle_descripcion: m.talle?.descripcion || '-',
    color_descripcion: m.color?.descripcion || '-',
  }));
}

export interface MovimientoStockInsert {
  fk_id_orden: number | null;
  fk_id_articulos: number;
  origen: "FACTURA" | "NOTA DE CREDITO" | "AJUSTE";
  tipo: "entrada" | "salida";
  cantidad: number;
  creado_el?: string; // opcional, por defecto Date.now
}

export async function createMovimientoStock(mov: {
  fk_id_orden: number | null;
  fk_id_articulos: number;
  origen: string;
  tipo: string;
  cantidad: number;
  fk_id_talle?: number | null;
  fk_id_color?: number | null;
  stock_actual?: number | null;
}) {
  const { data, error } = await supabase
    .from("movimientos_stock")
    .insert([
      {
        fk_id_orden: mov.fk_id_orden,
        fk_id_articulos: mov.fk_id_articulos,
        origen: mov.origen,
        tipo: mov.tipo,
        cantidad: mov.cantidad,
        fk_id_talle: mov.fk_id_talle ?? null,
        fk_id_color: mov.fk_id_color ?? null,
        stock_actual: mov.stock_actual ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
} 
import { supabase } from "@/lib/supabaseClient";

export async function getMovimientosStock() {
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select(`*`)
    .order("id", { ascending: false });
  if (error) throw error;
  return (data as Array<{
    id: number;
    fk_id_orden: number | null;
    fk_id_articulos: number;
    origen: string;
    tipo: string;
    cantidad: number;
    stock_actual: number | null;
    creado_el: string;
  }>).map(m => ({
    ...m,
    stock_actual: m.stock_actual ?? undefined,
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
        stock_actual: mov.stock_actual ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
} 
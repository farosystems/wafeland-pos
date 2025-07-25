export interface MovimientoStock {
  id: number;
  fk_id_articulos: number | null;
  fk_id_orden: number | null;
  origen: string;
  tipo: string;
  cantidad: number | null;
  stock_actual?: number;
  creado_el: string;
  talle_descripcion?: string;
  color_descripcion?: string;
} 
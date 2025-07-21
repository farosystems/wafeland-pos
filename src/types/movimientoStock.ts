export interface MovimientoStock {
  id: number;
  fk_id_articulos: number;
  origen: string;
  fk_id_orden: number;
  tipo: string[];
  cantidad: number;
  creado_el: string; // ISO timestamp
  stock_actual?: number;
} 
export interface Variante {
  id: number;
  creado_el: string;
  fk_id_articulo: number;
  stock_unitario: number;
  fk_id_talle: number;
  fk_id_color: number;
  articulo_descripcion?: string;
  talle_descripcion?: string;
  color_descripcion?: string;
}

export interface CreateVarianteData {
  fk_id_articulo: number;
  stock_unitario: number;
  fk_id_talle: number;
  fk_id_color: number;
}

export interface UpdateVarianteData {
  stock_unitario?: number;
  fk_id_talle?: number;
  fk_id_color?: number;
} 
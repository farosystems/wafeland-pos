export interface Variante {
  id: number;
  creado_el: string;
  fk_id_articulo: number;
  articulo_id?: number; // Alias para fk_id_articulo
  stock_unitario: number;
  stock_minimo: number;
  stock_maximo: number;
  fk_id_talle: number;
  talle_id?: number; // Alias para fk_id_talle
  fk_id_color: number;
  color_id?: number; // Alias para fk_id_color
  precio_venta?: number;
  articulo_descripcion?: string;
  talle_descripcion?: string;
  color_descripcion?: string;
  codigo_barras?: string;
}

export interface CreateVarianteData {
  fk_id_articulo: number;
  stock_unitario: number;
  stock_minimo: number;
  stock_maximo: number;
  fk_id_talle: number;
  fk_id_color: number;
  codigo_barras?: string;
}

export interface UpdateVarianteData {
  stock_unitario?: number;
  stock_minimo?: number;
  stock_maximo?: number;
  fk_id_talle?: number;
  fk_id_color?: number;
  codigo_barras?: string;
} 
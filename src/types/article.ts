export interface Article {
  id: number;
  descripcion: string;
  precio_unitario: number;
  fk_id_agrupador: number;
  fk_id_marca: number | null;
  activo: boolean;
  stock: number;
  stock_minimo: number;
  agrupador_nombre?: string;
  marca_nombre?: string;
  mark_up?: number;
  precio_costo?: number;
}

export interface CreateArticleData {
  descripcion: string;
  precio_unitario: number;
  fk_id_agrupador: number;
  fk_id_marca: number | null;
  activo: boolean;
  stock: number;
  stock_minimo: number;
  mark_up?: number;
  precio_costo?: number;
}

export interface UpdateArticleData {
  descripcion?: string;
  precio_unitario?: number;
  fk_id_agrupador?: number;
  fk_id_marca?: number | null;
  activo?: boolean;
  stock?: number;
  stock_minimo?: number;
  mark_up?: number;
  precio_costo?: number;
} 
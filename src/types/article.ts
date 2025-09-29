export interface Article {
  id: number;
  descripcion: string;
  precio_unitario: number;
  fk_id_agrupador: number;
  fk_id_marca: number | null;
  activo: boolean;
  stock: number;
  stock_minimo: number;
  equivalencia?: number;
  agrupador_nombre?: string;
  marca_nombre?: string;
  mark_up?: number;
  precio_costo?: number;
  es_combo: boolean;
  componentes?: ArticleComboComponent[];
}

export interface CreateArticleData {
  descripcion: string;
  precio_unitario: number;
  fk_id_agrupador: number;
  fk_id_marca: number | null;
  activo: boolean;
  stock: number;
  stock_minimo: number;
  equivalencia: number;
  mark_up?: number;
  precio_costo?: number;
  es_combo: boolean;
  componentes?: CreateComboComponentData[];
}

export interface UpdateArticleData {
  descripcion?: string;
  precio_unitario?: number;
  fk_id_agrupador?: number;
  fk_id_marca?: number | null;
  activo?: boolean;
  stock?: number;
  stock_minimo?: number;
  equivalencia: number;
  mark_up?: number;
  precio_costo?: number;
  es_combo?: boolean;
  componentes?: CreateComboComponentData[];
}

export interface ArticleComboComponent {
  id: number;
  fk_articulo_combo: number;
  fk_articulo_componente: number;
  cantidad: number;
  created_at: string;
  articulo_componente?: {
    id: number;
    descripcion: string;
    stock: number;
    precio_unitario: number;
  };
}

export interface CreateComboComponentData {
  fk_articulo_componente: number;
  cantidad: number;
} 
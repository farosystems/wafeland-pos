export interface Article {
  id: number;
  descripcion: string;
  precio_unitario: number;
  fk_id_agrupador: number;
  activo: boolean;
  porcentaje_iva: number;
}

export interface CreateArticleData {
  descripcion: string;
  precio_unitario: number;
  fk_id_agrupador: number;
  activo: boolean;
  porcentaje_iva: number;
}

export interface UpdateArticleData {
  descripcion?: string;
  precio_unitario?: number;
  fk_id_agrupador?: number;
  activo?: boolean;
  porcentaje_iva?: number;
} 
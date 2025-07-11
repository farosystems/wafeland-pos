export interface Article {
  id: number;
  descripcion: string;
  precio_unitario: number;
  fk_id_agrupador: number;
  activo: boolean;
  porcentaje_iva: number;
  stock: number; // Nuevo campo para stock
  agrupador_nombre?: string; // Nombre del agrupador (opcional, para joins)
}

export interface CreateArticleData {
  descripcion: string;
  precio_unitario: number;
  fk_id_agrupador: number;
  activo: boolean;
  porcentaje_iva: number;
  stock: number; // Nuevo campo para stock
}

export interface UpdateArticleData {
  descripcion?: string;
  precio_unitario?: number;
  fk_id_agrupador?: number;
  activo?: boolean;
  porcentaje_iva?: number;
  stock?: number; // Nuevo campo para stock
} 
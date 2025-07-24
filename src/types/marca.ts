export interface Marca {
  id: number;
  creado_el: string;
  descripcion: string;
}

export interface CreateMarcaData {
  descripcion: string;
}

export interface UpdateMarcaData {
  descripcion?: string;
} 
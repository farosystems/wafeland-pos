export interface Color {
  id: number;
  creado_el: string;
  descripcion: string;
}

export interface CreateColorData {
  descripcion: string;
}

export interface UpdateColorData {
  descripcion?: string;
} 
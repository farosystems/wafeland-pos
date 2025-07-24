export interface Talle {
  id: number;
  creado_el: string;
  descripcion: string;
}

export interface CreateTalleData {
  descripcion: string;
}

export interface UpdateTalleData {
  descripcion?: string;
} 
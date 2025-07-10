export interface Agrupador {
  id: number;
  nombre: string;
}

export interface CreateAgrupadorData {
  nombre: string;
}

export interface UpdateAgrupadorData {
  nombre?: string;
} 
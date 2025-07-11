export interface Caja {
  id: number;
  descripcion: string;
  turno: string;
  saldo_inicial?: number;
  fecha_apertura?: string;
  hora_apertura?: string;
}

export interface CreateCajaData {
  descripcion: string;
  turno: string;
  saldo_inicial?: number;
  fecha_apertura?: string;
  hora_apertura?: string;
} 
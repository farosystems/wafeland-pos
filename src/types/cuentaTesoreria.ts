export interface CuentaTesoreria {
  id: number;
  descripcion: string;
  tipo: string;
  activo: boolean | null;
}

export type CreateCuentaTesoreriaData = Omit<CuentaTesoreria, "id">; 
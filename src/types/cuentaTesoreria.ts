export interface CuentaTesoreria {
  id: number;
  descripcion: string;
  activo: boolean | null;
}

export type CreateCuentaTesoreriaData = Omit<CuentaTesoreria, "id">; 
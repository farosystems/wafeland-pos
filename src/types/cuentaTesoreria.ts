export interface CuentaTesoreria {
  id: number;
  descripcion: string;
  tipo: string;
  activo: boolean;
}

export interface CreateCuentaTesoreriaData extends Omit<CuentaTesoreria, 'id'> {} 
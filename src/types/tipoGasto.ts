export interface TipoGasto {
  id: number;
  created_at: string;
  descripcion: string | null;
  obliga_empleado: boolean | null;
  afecta_caja: boolean | null;
  tipo_movimiento: 'ingreso' | 'egreso' | null;
}

export type CreateTipoGastoData = Omit<TipoGasto, "id" | "created_at">; 
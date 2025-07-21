export interface TipoGasto {
  id: number;
  created_at: string;
  descripcion: string | null;
  obliga_empleado: boolean | null;
  afecta_caja: boolean | null;
}

export type CreateTipoGastoData = Omit<TipoGasto, "id" | "created_at">; 
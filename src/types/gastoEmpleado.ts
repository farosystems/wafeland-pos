export interface GastoEmpleado {
  id: number;
  creado_el: string;
  fk_tipo_gasto: number;
  monto: number;
  descripcion: string | null;
  fk_empleado: number | null;
  fk_lote_operaciones: number | null;
  fk_usuario: number | null;
  fk_cuenta_tesoreria: number | null;
}

export type CreateGastoEmpleadoData = Omit<GastoEmpleado, "id" | "creado_el">; 
export interface Liquidacion {
  id: number;
  creado_el?: string;
  fk_empleado: number;
  desde: string;
  hasta: string;
  sueldo_base: number;
  total_adelantos: number;
  total_faltas: number;
  neto_liquidado: number;
  total_ventas?: number;
  comision?: number;
  total_liquidacion?: number;
  estado?: string;
}

export type CreateLiquidacionData = {
  fk_empleado: number;
  desde: string;
  hasta: string;
  sueldo_base: number;
  total_adelantos: number;
  total_faltas: number;
  neto_liquidado: number;
}; 
export interface Empleado {
  id: number;
  creado_el: string;
  nombre: string;
  apellido: string;
  tipo_liquidacion: 'semanal' | 'quincenal' | 'mensual';
  sueldo: number | null;
  tope_adelanto: number | null;
  dni: number | null;
  telefono: number | null;
}

export type CreateEmpleadoData = Omit<Empleado, "id" | "creado_el">; 
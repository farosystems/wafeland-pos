export interface MovimientoGasto {
  id: number;
  fk_lote_operaciones: number;
  fk_tipo_gasto: number;
  fk_empleado: number | null;
  fk_cuenta_tesoreria: number;
  fk_usuario: number;
  monto: number;
  descripcion: string;
  creado_el: string;

  // Datos relacionados
  lote?: {
    id_lote: number;
    fk_id_caja: number;
    fecha_apertura: string;
    hora_apertura: string;
    caja?: {
      id: number;
      descripcion: string;
      turno: string;
    };
  };
  tipo_gasto?: {
    id: number;
    descripcion: string;
    tipo_movimiento: 'ingreso' | 'egreso' | null;
  };
  empleado?: {
    id: number;
    nombre: string;
    apellido: string;
  };
  cuenta_tesoreria?: {
    id: number;
    descripcion: string;
  };
  usuario?: {
    id: number;
    nombre: string;
  };
}

export interface ResumenPorTipo {
  tipo_descripcion: string;
  tipo_movimiento: 'ingreso' | 'egreso' | null;
  total_monto: number;
  cantidad_movimientos: number;
}

export interface FiltrosFecha {
  fecha_desde: string;
  fecha_hasta: string;
}

export interface ResumenGeneral {
  total_ingresos: number;
  total_egresos: number;
  balance: number;
  cantidad_movimientos: number;
}
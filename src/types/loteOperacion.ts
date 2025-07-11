export interface LoteOperacion {
  id_lote: number;
  fk_id_usuario: number;
  fk_id_caja: number;
  abierto: boolean | null;
  tipo_lote: 'apertura' | 'cierre';
  fecha_apertura: string; // ISO
  hora_apertura: string | null;
  fecha_cierre: string; // ISO
  hora_cierre: string | null;
  observaciones: string | null;
}

export interface CreateLoteOperacionData extends Omit<LoteOperacion, 'id_lote'> {}

export interface DetalleLoteOperacion {
  idd: number;
  fk_id_lote: number;
  fk_id_cuenta_tesoreria: number;
  tipo: 'ingreso' | 'egreso';
  monto: number;
}

export interface CreateDetalleLoteOperacionData extends Omit<DetalleLoteOperacion, 'idd'> {} 
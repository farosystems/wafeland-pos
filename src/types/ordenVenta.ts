export interface OrdenVenta {
  id: number;
  fk_id_entidades: number | null;
  fk_id_usuario: number;
  fk_id_lote: number;
  fk_id_tipo_comprobante: number;
  fecha: string; // ISO
  total: number;
  subtotal: number;
  anulada: boolean;
  fk_id_orden_anulada?: number | null;
}
export type CreateOrdenVentaData = Omit<OrdenVenta, 'id' | 'anulada'> & {
  fk_id_orden_anulada?: number | null;
}

export interface OrdenVentaDetalle {
  idd: number;
  fk_id_orden: number;
  fk_id_articulo: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}
export type CreateOrdenVentaDetalleData = Omit<OrdenVentaDetalle, 'idd' | 'subtotal'>

export interface OrdenVentaImpuestos {
  id: number;
  fk_id_orden: number;
  tipo_impuesto: string;
  porcentaje: number;
  monto: number;
}
export type CreateOrdenVentaImpuestosData = Omit<OrdenVentaImpuestos, 'id'>

export interface OrdenVentaMediosPago {
  idd: number;
  fk_id_orden: number;
  fk_id_cuenta_tesoreria: number;
  monto_pagado: number;
}
export type CreateOrdenVentaMediosPagoData = Omit<OrdenVentaMediosPago, 'idd'> 
export interface OrdenVenta {
  id: number;
  fk_id_entidades: number | null;
  fk_id_usuario: number;
  fk_id_lote: number;
  fk_id_tipo_comprobante: number;
  fecha: string; // ISO
  total: number;
  subtotal: number;
  anulada?: boolean;
  fk_id_orden_anulada?: number;
}
export type CreateOrdenVentaData = Omit<OrdenVenta, 'id'>

export interface OrdenVentaDetalle {
  idd: number;
  fk_id_orden: number;
  fk_id_articulo: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  fk_id_talle?: number | null;
  fk_id_color?: number | null;
}
export type CreateOrdenVentaDetalleData = Omit<OrdenVentaDetalle, 'idd' | 'subtotal'>

export interface OrdenVentaImpuestos {
  idd: number;
  id_orden: number;
  porcentaje_iva: number;
  base_gravada: number;
  monto_iva: number;
}
export type CreateOrdenVentaImpuestosData = Omit<OrdenVentaImpuestos, 'idd'>

export interface OrdenVentaMediosPago {
  idd: number;
  fk_id_orden: number;
  fk_id_cuenta_tesoreria: number;
  monto_pagado: number;
}
export type CreateOrdenVentaMediosPagoData = Omit<OrdenVentaMediosPago, 'idd'> 
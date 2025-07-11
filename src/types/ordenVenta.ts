export interface OrdenVenta {
  id: number;
  fk_id_entidades: number | null;
  fk_id_usuario: number;
  fk_id_lote: number;
  fk_id_tipo_comprobante: number;
  fecha: string; // ISO
  total: number;
  subtotal: number;
}
export interface CreateOrdenVentaData extends Omit<OrdenVenta, 'id'> {}

export interface OrdenVentaDetalle {
  idd: number;
  fk_id_orden: number;
  fk_id_articulo: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}
export interface CreateOrdenVentaDetalleData extends Omit<OrdenVentaDetalle, 'idd' | 'subtotal'> {}

export interface OrdenVentaImpuestos {
  idd: number;
  id_orden: number;
  porcentaje_iva: number;
  base_gravada: number;
  monto_iva: number;
}
export interface CreateOrdenVentaImpuestosData extends Omit<OrdenVentaImpuestos, 'idd'> {}

export interface OrdenVentaMediosPago {
  idd: number;
  fk_id_orden: number;
  fk_id_cuenta_tesoreria: number;
  monto_pagado: number;
}
export interface CreateOrdenVentaMediosPagoData extends Omit<OrdenVentaMediosPago, 'idd'> {} 
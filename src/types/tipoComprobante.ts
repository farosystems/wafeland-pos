export interface TipoComprobante {
  id: number;
  descripcion: string;
  descuenta_stock: boolean;
  reingresa_stock: boolean;
  admite_impuestos: boolean;
  imprime_pdf: boolean;
  activo: boolean;
  creado_el: string;
}

export interface CreateTipoComprobanteData extends Omit<TipoComprobante, 'id' | 'creado_el'> {
  // Add specific properties here if needed
} 
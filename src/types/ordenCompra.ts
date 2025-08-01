export interface OrdenCompraItem {
  id?: number;
  fk_id_orden_compra?: number;
  fk_id_variante: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  // Campos adicionales para mostrar en la UI
  articulo_descripcion?: string;
  talle_descripcion?: string;
  color_descripcion?: string;
}

export interface OrdenCompra {
  id?: number;
  creado_el?: string;
  numero_orden: string;
  fecha: string;
  fk_id_proveedor: number;
  fk_id_empresa: number;
  subtotal: number;
  descuento_porcentaje: number;
  subtotal_menos_descuento: number;
  tasa_impuestos: number;
  total_impuestos: number;
  envio_almacenaje: number;
  total: number;
  estado: 'borrador' | 'generando' | 'completada' | 'cancelada';
  notas?: string;
  // Campos adicionales para mostrar en la UI
  proveedor_razon_social?: string;
  empresa_nombre?: string;
  items?: OrdenCompraItem[];
}

export interface CreateOrdenCompraData {
  numero_orden: string;
  fecha: string;
  fk_id_proveedor: number;
  fk_id_empresa: number;
  subtotal: number;
  descuento_porcentaje: number;
  subtotal_menos_descuento: number;
  tasa_impuestos: number;
  total_impuestos: number;
  envio_almacenaje: number;
  total: number;
  estado: 'borrador' | 'generando' | 'completada' | 'cancelada';
  notas?: string;
  items: Omit<OrdenCompraItem, 'id' | 'fk_id_orden_compra'>[];
}

export interface UpdateOrdenCompraData {
  numero_orden?: string;
  fecha?: string;
  fk_id_proveedor?: number;
  fk_id_empresa?: number;
  subtotal?: number;
  descuento_porcentaje?: number;
  subtotal_menos_descuento?: number;
  tasa_impuestos?: number;
  total_impuestos?: number;
  envio_almacenaje?: number;
  total?: number;
  estado?: 'borrador' | 'generando' | 'completada' | 'cancelada';
  notas?: string;
} 
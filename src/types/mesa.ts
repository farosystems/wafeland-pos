// Types para el módulo de Mesas

export interface Mesa {
  id: number;
  numero: string;
  descripcion?: string;
  capacidad: number;
  posicion_x: number;
  posicion_y: number;
  activo: boolean;
  creado_el: string;
}

export interface CreateMesaData {
  numero: string;
  descripcion?: string;
  capacidad?: number;
  posicion_x?: number;
  posicion_y?: number;
  activo?: boolean;
}

export interface UpdateMesaData {
  numero?: string;
  descripcion?: string;
  capacidad?: number;
  posicion_x?: number;
  posicion_y?: number;
  activo?: boolean;
}

export interface SesionMesa {
  id: number;
  fk_id_mesa: number;
  fk_id_usuario: number;
  fk_id_lote: number;
  comensales: number;
  abierta: boolean;
  fecha_apertura: string;
  fecha_cierre?: string;
  observaciones?: string;
  total_sesion: number;
}

export interface CreateSesionMesaData {
  fk_id_mesa: number;
  fk_id_usuario: number;
  fk_id_lote: number;
  comensales: number;
  observaciones?: string;
}

export interface UpdateSesionMesaData {
  comensales?: number;
  observaciones?: string;
  total_sesion?: number;
}

export interface PedidoMesa {
  id: number;
  fk_id_sesion_mesa: number;
  numero_pedido: number;
  estado: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
  fecha_pedido: string;
  subtotal: number;
  observaciones?: string;
}

export interface CreatePedidoMesaData {
  fk_id_sesion_mesa: number;
  numero_pedido: number;
  observaciones?: string;
}

export interface UpdatePedidoMesaData {
  estado?: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
  observaciones?: string;
}

export interface DetallePedidoMesa {
  id: number;
  fk_id_pedido_mesa: number;
  fk_id_articulo: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones?: string;
  entregado: boolean;
  fecha_creado: string;
  // Datos del artículo (cuando se hace JOIN)
  articulo_descripcion?: string;
}

export interface CreateDetallePedidoMesaData {
  fk_id_pedido_mesa: number;
  fk_id_articulo: number;
  cantidad: number;
  precio_unitario: number;
  observaciones?: string;
}

export interface UpdateDetallePedidoMesaData {
  cantidad?: number;
  precio_unitario?: number;
  observaciones?: string;
  entregado?: boolean;
}

// Tipo para la vista completa de sesiones activas
export interface SesionMesaActiva {
  sesion_id: number;
  fk_id_mesa: number;
  mesa_numero: string;
  mesa_descripcion?: string;
  capacidad: number;
  posicion_x: number;
  posicion_y: number;
  comensales: number;
  fecha_apertura: string;
  total_sesion: number;
  observaciones?: string;
  usuario_nombre: string;
  total_pedidos: number;
  total_consumido: number;
}

// Tipo para el estado de una mesa en el tablero
export interface EstadoMesaTablero {
  mesa: Mesa;
  sesion_activa?: SesionMesaActiva;
  estado: 'libre' | 'ocupada' | 'por_cobrar';
}
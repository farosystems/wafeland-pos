export interface CuentaCorriente {
  id: number;
  creada_el: string;
  fk_id_orden: number;
  fk_id_cliente: number;
  total: number;
  saldo: number;
  estado: "pendiente" | "pagada" | "cancelado";
} 
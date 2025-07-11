export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  password_hash: string;
  rol: 'vendedor' | 'cobrador' | 'supervisor';
  creado_el: string; // timestamp ISO
}

export interface CreateUsuarioData extends Omit<Usuario, 'id' | 'creado_el'> {} 
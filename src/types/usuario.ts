export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  password_hash: string;
  rol: 'admin' | 'vendedor' | 'cobrador' | 'supervisor';
  creado_el: string; // timestamp ISO
  prueba_gratis: boolean;
}

export interface CreateUsuarioData extends Omit<Usuario, 'id' | 'creado_el'> {
  prueba_gratis: boolean;
} 
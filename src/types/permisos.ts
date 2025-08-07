export interface Modulo {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  ruta: string;
  activo: boolean;
  orden: number;
  creado_el: string;
}

export interface PermisoUsuario {
  id: number;
  fk_id_usuario: number;
  fk_id_modulo: number;
  puede_ver: boolean;
  creado_el: string;
  actualizado_el: string;
  // Campos adicionales para la UI
  modulo?: Modulo;
  usuario?: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
  };
}

export interface PermisoUsuarioConDetalles extends PermisoUsuario {
  modulo: Modulo;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
  };
}

export interface CreatePermisoUsuarioData {
  fk_id_usuario: number;
  fk_id_modulo: number;
  puede_ver: boolean;
}

export interface UpdatePermisoUsuarioData {
  puede_ver?: boolean;
}

// Tipos para la gestión de permisos en lote
export interface PermisosUsuarioLote {
  usuario_id: number;
  permisos: {
    [modulo_id: number]: {
      puede_ver: boolean;
    };
  };
} 
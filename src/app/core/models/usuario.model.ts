export type Rol = 'ADMIN' | 'RESIDENTE' | 'DUEÑO';

export interface Usuario {
  id_usuario?: number;
  username?: string;
  rol?: Rol;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  correo?: string;
  estado?: boolean;
  enabled?: boolean;
}

export interface UsuarioCrearRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  rol: Rol;
}

export interface UsuarioEditarRequest {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  rol?: Rol;
  estado?: boolean;
  id_Usuario?: number;
}


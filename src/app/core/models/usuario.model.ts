export type Rol = 'ADMIN' | 'RESIDENTE' | 'DUE\u00D1O';

export interface Usuario {
  id_usuario?: number;
  username?: string;
  rol?: Rol;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  correo?: string;
  email?: string;
  estado?: boolean;
  enabled?: boolean;
  avatarUrl?: string;
}

export interface UsuarioCrearRequest {
  email: string;
  password?: string;
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

export interface UsuarioPerfilRequest {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}

export interface UsuarioCredencialesClienteRequest {
  idUsuario: number;
  email?: string;
  password?: string;
}

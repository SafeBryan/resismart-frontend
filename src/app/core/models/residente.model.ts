import { UnidadDTO } from './unidad.model';

export type RolUsuario = 'ADMIN' | 'RESIDENTE' | 'DUEÑO';

export interface UsuarioDTO {
  id_usuario?: number;
  username?: string;
  rol?: RolUsuario;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  correo?: string;
  estado?: boolean;
}

export interface ResidenteRespuestaDTO {
  id_Cliente?: number;
  telefono?: string;
  cedula?: string;
  usuario?: UsuarioDTO | null;
  unidad?: UnidadDTO | null;
}

export interface ResidenteDTO {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  cedula: string;
  idUnidad?: number | null;
}


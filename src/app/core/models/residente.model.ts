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
  activo?: boolean;
}

export interface ResidenteRespuestaDTO {
  id?: number;
  id_Cliente?: number; // compatibilidad con back anterior
  telefono?: string;
  cedula?: string;
  usuarioId?: number | null;
  usuario?: UsuarioDTO | null;
  usuarioNombre?: string | null;
  usuarioApellido?: string | null;
  usuarioEmail?: string | null;
  usuarioRol?: RolUsuario | null;
  usuarioEstado?: boolean | null;
  usuarioActivo?: boolean | null;
  avatarUrl?: string | null;
  condominioId?: number | null;
  condominioNombre?: string | null;
}

export interface ResidenteDTO {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  cedula: string;
  usuarioId?: number | null;
  condominioId: number;
}

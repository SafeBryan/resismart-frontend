export type Role = 'ADMIN' | 'DUE\u00D1O' | 'RESIDENTE' | string;

export interface LoginResponse {
  token: string;
}

export interface JwtPayload {
  rol?: Role | string;
  role?: Role | string;
  idUsuario?: string | number;
  user_id?: string | number;
  id?: string | number;
  [k: string]: any;
}

export interface AuthState {
  token: string | null;
  role: Role | null;
  idUsuario: string | number | null;
}

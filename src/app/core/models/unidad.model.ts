export type UnidadEstado = 'OCUPADA' | 'LIBRE' | 'MANTENIMIENTO';

export interface UnidadDTO {
  id?: number;
  numero?: string;
  estado?: UnidadEstado;
  condominioId?: number;
  condominioNombre?: string;
  condominio?: {
    id?: number;
    nombre?: string;
  };
}

export interface UnidadCreateDTO {
  numero: string;
  estado?: UnidadEstado;
  idCondominio: number;
}

export interface UnidadUpdateDTO {
  numero?: string;
  estado?: UnidadEstado;
}

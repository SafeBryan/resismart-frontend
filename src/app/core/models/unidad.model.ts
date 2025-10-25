export type UnidadEstado = 'OCUPADA' | 'LIBRE' | 'MANTENIMIENTO';

export interface UnidadDTO {
  id?: number;
  numero?: string;
  estado?: UnidadEstado;
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

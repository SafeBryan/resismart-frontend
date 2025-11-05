export type EventoTipo = 'REUNION' | 'MANTENIMIENTO' | 'SOCIAL' | 'OTRO';
export type EventoEstado = 'PROGRAMADO' | 'EN_CURSO' | 'FINALIZADO' | 'CANCELADO';

export interface EventoDTO {
  id?: number;
  titulo?: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string | null;
  lugar?: string | null;
  tipo?: EventoTipo | string | null;
  estado?: EventoEstado | string | null;
  idCondominio?: number | null;
}

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
  idCreador?: number | null;
}

export interface EventoDetalleDTO extends EventoDTO {
  participantes?: EventoParticipanteDTO[];
  noAsisten?: EventoParticipanteDTO[];
  asistentesConfirmados?: number;
  totalInvitados?: number;
}

export interface EventoDetalladoResponse {
  evento?: EventoDTO;
  participantes?: EventoParticipanteDTO[];
  noAsisten?: EventoParticipanteDTO[];
}

export interface EventoCreateDTO {
  titulo: string;
  descripcion?: string | null;
  fechaInicio: string;
  fechaFin?: string | null;
  lugar?: string | null;
  tipo?: EventoTipo | string | null;
  estado?: EventoEstado | string | null;
  idCondominio: number;
  idCreador?: number;
}

export type EventoUpdateDTO = Partial<EventoCreateDTO>;

export interface EventoParticipanteDTO {
  id?: number;
  usuarioId?: number;
  idUsuario?: number;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  estado?: 'INVITADO' | 'CONFIRMADO' | 'RECHAZADO';
  asistencia?: 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'ASISTIO' | 'NO_ASISTIO';
  fechaRespuesta?: string;
}

export interface EventoParticipanteRequest {
  usuarioId: number;
  estado?: 'INVITADO' | 'CONFIRMADO' | 'RECHAZADO';
}

export interface EventoAsistenciaRequest {
  estado: 'CONFIRMADO' | 'RECHAZADO' | 'PENDIENTE' | 'ASISTIO' | 'NO_ASISTIO';
  participanteId?: number;
}

export type AvisoTipo =
  | 'EVENTO_NUEVO'
  | 'EVENTO_ACTUALIZADO'
  | 'EVENTO_CANCELADO'
  | 'ORDEN_PAGO_GENERADA'
  | 'ORDEN_PAGO_PROX_VENCER'
  | 'ORDEN_PAGO_PAGADA'
  | 'DOCUMENTO_ASOCIADO'
  | 'DOCUMENTO_RECHAZADO'
  | 'DOCUMENTO_APROBADO'
  | 'ALERTA_GENERAL';

export type AvisoDestino = 'USUARIO' | 'CONDOMINIO' | 'ROL' | 'TODOS';

export interface AvisoRequest {
  tipo: AvisoTipo;
  titulo?: string | null;
  mensaje?: string | null;
  destino: AvisoDestino;
  destinoReferencia?: string | number | null;
  metadata?: Record<string, unknown> | null;
}

export interface AvisoPayload {
  id: number;
  tipo: AvisoTipo;
  titulo: string;
  mensaje: string;
  destino: AvisoDestino;
  destinoReferencia?: string | null;
  emitidoEn: string;
  metadata?: Record<string, unknown> | null;
}

export interface AvisoListaResponse extends Array<AvisoPayload> {}

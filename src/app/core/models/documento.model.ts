export type DocumentoTipo = 'CONTRATO' | 'COMPROBANTE' | 'OTRO';
export type DocumentoEstado = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface DocumentoDetalleDTO {
  idDocumento: number;
  tipo: DocumentoTipo;
  nombreOriginal: string;
  storageKey?: string;
  fechaSubida?: string;
  subidoPor?: string;
  estadoValidacion?: DocumentoEstado;
  validadoPor?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  sha256?: string | null;
}

export interface DocumentoFiltroDTO {
  tipo?: DocumentoTipo;
  estadoValidacion?: DocumentoEstado;
  fechaDesde?: string;
  fechaHasta?: string;
  subidoPor?: string;
  idContrato?: number;
  idOrden?: number;
  tipoRelacion?: 'ANEXO' | 'COMPROBANTE' | 'OTRO';
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
  flat?: boolean;
  withLinks?: boolean;
}

export interface DocumentoUploadResponse extends DocumentoDetalleDTO {}

export interface DocumentoAsociacionDTO {
  idDocumento: number;
  idContrato?: number;
  idOrden?: number;
  tipoRelacion: 'ANEXO' | 'COMPROBANTE' | 'OTRO';
}

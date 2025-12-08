// Estados de orden y transaccion
export type OrdenPagoEstado = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'EN_MORA' | 'RECHAZADA' | string;
export type MetodoPago = 'TRANSFERENCIA' | 'EFECTIVO' | 'DEPOSITO';
export type EstadoTransaccion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | string;

// DTO principal: resumen de orden
export interface OrdenPagoResumenDTO {
  id: number;
  idContrato: number;
  contratoId?: number | null;
  periodo: string;
  monto: number;
  montoBase?: number | null;
  mora?: number | null;
  moraAcumulada?: number | null;
  saldoPendiente?: number | null;
  estado: OrdenPagoEstado;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  inquilino?: string | null;
  condominio?: string | null;
  unidad?: string | null;
  ultimaTransaccionEstado?: EstadoTransaccion | null;
  ultimaTransaccionId?: number | null;
  ultimaTransaccionFecha?: string | null;
  ultimaTransaccionMonto?: number | null;
}

export interface OrdenPagoGeneracionMensualResponseDTO {
  creadas: number;
  existentes: number;
}

export interface IngresoMensualDTO {
  mes: string;
  montoTotal: number;
}

export interface OrdenPagoDetalleDTO {
  id: number;
  estado: OrdenPagoEstado;
  periodo?: string | null;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  montoBase?: number | null;
  impuesto?: number | null;
  mora?: number | null;
  saldoPendiente?: number | null;
  total?: number | null;
  contratoId?: number | null;
  contratoCodigo?: string | null;
  inquilinoNombre?: string | null;
  inquilinoCorreo?: string | null;
  unidad?: string | null;
  condominio?: string | null;
  transacciones?: import('./pago.model').TransaccionPagoDTO[];
}

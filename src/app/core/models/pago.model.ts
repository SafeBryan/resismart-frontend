import { MetodoPago as BackendMetodoPago } from './orden-pago.model';

export type MetodoPago = BackendMetodoPago | 'DEPOSITO' | 'TRANSFERENCIA' | 'EFECTIVO';

export type EstadoTransaccion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | string;

export interface TransaccionPagoCreateDTO {
  ordenId: number;
  monto: number;
  referencia?: string;
  metodoPago: MetodoPago;
  comprobante?: File;
}

export interface TransaccionPagoDTO {
  id: number;
  monto: number;
  fechaPago: string;
  referencia?: string;
  metodoPago: MetodoPago;
  estado: EstadoTransaccion;
  inquilinoNombre?: string | null;
   motivoRechazo?: string | null;
   fechaAprobacion?: string | null;
   fechaRechazo?: string | null;
   comprobanteStorageKey?: string | null;
   aprobadoPorAdminId?: number | null;
   rechazadoPorAdminId?: number | null;
  ordenPago?: {
    id: number;
    contrato?: { id: number };
  };
}

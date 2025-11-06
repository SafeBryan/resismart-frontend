export type OrdenPagoEstado = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'EN_MORA';

export interface OrdenPagoResumenDTO {
  id: number;
  idContrato: number;
  periodo: string;
  monto: number;
  estado: OrdenPagoEstado;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
}

export interface IngresoMensualDTO {
  mes: {
    year: number;
    month: string;
    monthValue: number;
    leapYear?: boolean;
  };
  montoTotal: number;
}

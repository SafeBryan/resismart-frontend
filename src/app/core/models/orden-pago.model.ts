<<<<<<< HEAD
export type OrdenPagoEstado = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'EN_MORA' | 'RECHAZADA' | string;
export type MetodoPago = 'TRANSFERENCIA' | 'EFECTIVO' | 'DEPOSITO';
export type EstadoTransaccion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | string;
=======
// ===========================
// Estados de la orden de pago
// ===========================
export type OrdenPagoEstado = "PENDIENTE" | "PAGADA" | "VENCIDA" | "EN_MORA";
>>>>>>> 98f67ccd7c00017fca0cf5be3e50f83cf390309a

// ===========================
// DTO principal: resumen de orden
// (mapea a OrdenPagoResumenDTO del backend)
// ===========================
export interface OrdenPagoResumenDTO {
  id: number;
  idContrato: number;
  periodo: string; // LocalDate -> "YYYY-MM-DD"
  monto: number;
  montoBase?: number | null;
  mora?: number | null;
  moraAcumulada?: number | null;
  saldoPendiente?: number | null;
  estado: OrdenPagoEstado;
<<<<<<< HEAD
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  ultimaTransaccionEstado?: EstadoTransaccion | null;
  ultimaTransaccionId?: number | null;
  ultimaTransaccionFecha?: string | null;
  ultimaTransaccionMonto?: number | null;
=======
  fechaEmision: string; // LocalDate -> "YYYY-MM-DD"
  fechaVencimiento: string; // LocalDate -> "YYYY-MM-DD"
>>>>>>> 98f67ccd7c00017fca0cf5be3e50f83cf390309a
}

// ===========================
// DTO: respuesta de generación mensual
// (GeneracionMensualResponseDTO del backend)
// ===========================
export interface OrdenPagoGeneracionMensualResponseDTO {
  creadas: number;
  existentes: number;
}

// ===========================
// DTO: ingresos mensuales
// (IngresoMensualDTO del backend: YearMonth + BigDecimal)
// normalmente se serializa como "YYYY-MM"
// ===========================
export interface IngresoMensualDTO {
  mes: string; // Ej: "2025-01"
  montoTotal: number;
}

<<<<<<< HEAD
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
=======
// ===========================
// Resumen por estado (KPIs)
// Backend devuelve un Map<String, Long>:
// { "PAGADA": 10, "PENDIENTE": 5, ... }
// ===========================
export type OrdenPagoResumenEstados = Partial<Record<OrdenPagoEstado, number>>;

// ===========================
// Paginación genérica
// (PageResponse<T> local de tu controlador)
// ===========================
export interface PageResponse<T> {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  content: T[];
}

// ===========================
// DTO opcional para marcar pago
// (por si algún día decides usar body en /{id}/pagar)
// ===========================
export interface OrdenPagoPagarDTO {
  pagada: boolean;
>>>>>>> 98f67ccd7c00017fca0cf5be3e50f83cf390309a
}

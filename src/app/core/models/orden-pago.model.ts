// ===========================
// Estados de la orden de pago
// ===========================
export type OrdenPagoEstado = "PENDIENTE" | "PAGADA" | "VENCIDA" | "EN_MORA";

// ===========================
// DTO principal: resumen de orden
// (mapea a OrdenPagoResumenDTO del backend)
// ===========================
export interface OrdenPagoResumenDTO {
  id: number;
  idContrato: number;
  periodo: string; // LocalDate -> "YYYY-MM-DD"
  monto: number;
  estado: OrdenPagoEstado;
  fechaEmision: string; // LocalDate -> "YYYY-MM-DD"
  fechaVencimiento: string; // LocalDate -> "YYYY-MM-DD"
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
}

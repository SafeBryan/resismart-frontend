// src/app/core/models/dashboard.model.ts
// Modelos del Dashboard de Órdenes & Comprobantes (solo tipos/interfaces)

export type Id = number | string;

/** Estados posibles de una orden de pago (alineado a tu backend). */
export type OrdenEstado = "pendiente" | "pagada" | "vencida" | "en_mora";

/** Filtros del dashboard. */
export interface DashboardFilters {
  condominioId?: number;
  residenteId?: number;
  contratoId?: number;
  q?: string; // búsqueda por número de orden u otra clave
  from?: string; // ISO date (yyyy-MM-dd o ISO completo)
  to?: string; // ISO date
}

/** KPIs calculados/locales en el dashboard. */
export interface DashboardKpis {
  totalOrdenes: number;
  pendientes: number;
  pagadas: number;
  vencidas: number;
  enMora: number;
  conComprobante: number;
}

/** Entidades base (para selects/filtros). */
export interface CondominioBasic {
  id: number;
  nombre: string;
}

export interface ResidenteBasic {
  id: number;
  nombres: string;
  apellidos: string;
}

export interface ContratoBasic {
  id: number;
  estado: string;
  residenteId: number;
}

/** Orden de pago (mapeable desde /OrdenesPago o /OrdenesPago/contrato/{idContrato}). */
export interface DashboardOrden {
  id: number;
  numero?: string;
  contratoId: number;

  fechaEmision?: string; // ISO
  fechaVencimiento?: string; // ISO

  total?: number;
  estado?: OrdenEstado;

  /** Si existe asociación con documento/comprobante. */
  documentoId?: number;
}

/** Documento (mapeable desde /documentos). */
export interface DashboardDocumento {
  id: number;
  nombre: string;
  tipo?: string; // ej: 'COMPROBANTE', 'PDF'
  creadoEn?: string; // ISO
}

/** Actividad/Auditoría de descargas (desde /documentos/{id}/auditoria). */
export interface DashboardActividad {
  id: Id;
  documentoId: number;
  usuario?: string; // quien descargó
  fecha: string; // ISO
  accion?: string; // ej: 'DESCARGA', 'VISUALIZACION'
  meta?: Record<string, unknown>;
}

/** Paquete de datos del dashboard (estado en memoria). */
export interface DashboardData {
  filtros: DashboardFilters;
  kpis: DashboardKpis;
  ordenes: DashboardOrden[];
  documentos: DashboardDocumento[];
  actividad: DashboardActividad[];
  condominios?: CondominioBasic[];
  residentes?: ResidenteBasic[];
  contratos?: ContratoBasic[];
}

/** Estado inicial conveniente para el store/component. */
export const DASHBOARD_INITIAL_STATE: DashboardData = {
  filtros: {},
  kpis: {
    totalOrdenes: 0,
    pendientes: 0,
    pagadas: 0,
    vencidas: 0,
    enMora: 0,
    conComprobante: 0,
  },
  ordenes: [],
  documentos: [],
  actividad: [],
  condominios: [],
  residentes: [],
  contratos: [],
};

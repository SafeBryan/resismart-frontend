// ==============================
// MODELO: Contrato (ResiSmart)
// ==============================

export interface ContratoResumen {
  id: number;
  fechaInicio: string; // ISO (YYYY-MM-DD)
  fechaFin?: string | null; // puede venir null
  monto: number;
  estado: EstadoContrato;
  idUnidad: number | null;
  numeroUnidad?: string | null;

  idResidente: number | null;
  nombreResidente?: string | null;
}

export interface ContratoDetalle {
  id: number;
  fechaInicio: string;
  fechaFin?: string;
  monto: number;
  estado: EstadoContrato;

  // Existentes (no se tocan)
  idUnidad: number;
  unidadNumero: string;
  idResidente: number;
  residenteNombre: string; // nombre completo

  // 🔧 NUEVOS CAMPOS (para soportar la nueva respuesta del backend)
  numeroUnidad?: string | null; // alias de unidadNumero
  nombreResidente?: string | null; // alias de residenteNombre
}

export enum EstadoContrato {
  PENDIENTE = "PENDIENTE",
  ACTIVO = "ACTIVO",
  RESCINDIDO = "RESCINDIDO",
  FINALIZADO = "FINALIZADO",
}

// ==============================
// MÉTRICAS (para el dashboard inferior)
// ==============================
export interface ContratosStats {
  total: number;
  activos: number;
  proximosAVencer: number;
  ingresosMensuales: number;
}

// ==============================
// FILTROS (para la barra superior)
// ==============================
export interface ContratosFiltro {
  buscar?: string; // texto libre (nombre o unidad)
  estado?: EstadoContrato | ""; // filtro de estado
}

// ==============================
// MODELO: Contrato (ResiSmart)
// ==============================

export interface ContratoResumen {
  id: number;
  idUnidad: number;
  idResidente: number;
  fechaInicio: string; // ISO-8601 (YYYY-MM-DD)
  fechaFin?: string; // opcional si aún no termina
  monto: number;
  estado: EstadoContrato;
}

export interface ContratoDetalle {
  id: number;
  fechaInicio: string;
  fechaFin?: string;
  monto: number;
  estado: EstadoContrato;
  idUnidad: number;
  unidadNumero: string;
  idResidente: number;
  residenteNombre: string; // nombre completo
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

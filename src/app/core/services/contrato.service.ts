import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, forkJoin, map, of } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  ContratoDetalle,
  ContratoResumen,
  ContratosFiltro,
  ContratosStats,
  EstadoContrato,
} from "../models/contrato.model";

const API = environment.apiUrl || "http://localhost:8080";

// ====== Payloads usados por los endpoints ======
export interface ContratoCreateInput {
  idUnidad: number;
  idResidente: number; // Long en back, number en TS
  fechaInicio: string; // 'YYYY-MM-DD'
  fechaFin?: string; // opcional
  monto: number; // BigDecimal -> number
  montoAlquiler: number;
  montoAlicuota: number;
}

export interface ContratoUpdateInput {
  fechaInicio?: string;
  fechaFin?: string;
  monto?: number;
  montoAlquiler?: number;
  montoAlicuota?: number;
  idUnidad?: number;
  idResidente?: number; // Long en back
}

export interface ContratoRenovarInput {
  nuevaFechaFin: string; // 'YYYY-MM-DD'
}

export interface ContratoRescindirInput {
  motivo?: string;
}

@Injectable({ providedIn: "root" })
export class ContratoService {
  private http = inject(HttpClient);

  // ===========================
  // Lectura
  // ===========================
  getById(id: number): Observable<ContratoDetalle> {
    return this.http.get<ContratoDetalle>(`${API}/Contratos/${id}`);
  }

  listByEstado(estado: EstadoContrato): Observable<ContratoResumen[]> {
    return this.http.get<ContratoResumen[]>(
      `${API}/Contratos/estado/${estado}`
    );
  }

  listByResidente(idResidente: number): Observable<ContratoResumen[]> {
    return this.http.get<ContratoResumen[]>(
      `${API}/Contratos/residente/${idResidente}`
    );
  }

  /**
   * Lista "todos" combinando varios estados (útil para la grilla principal).
   * Si no envías `estados`, usa todos los definidos en el enum.
   */
  listAll(estados?: EstadoContrato[]): Observable<ContratoResumen[]> {
    const pool =
      estados && estados.length
        ? estados
        : [
            EstadoContrato.PENDIENTE,
            EstadoContrato.ACTIVO,
            EstadoContrato.RESCINDIDO,
            EstadoContrato.FINALIZADO,
          ];

    const reqs = pool.map((s) => this.listByEstado(s));
    return (reqs.length ? forkJoin(reqs) : of<ContratoResumen[][]>([[]])).pipe(
      map((chunks) => chunks.flat())
    );
  }

  // ===========================
  // Mutaciones
  // ===========================
  create(payload: ContratoCreateInput): Observable<ContratoResumen> {
    return this.http.post<ContratoResumen>(`${API}/Contratos`, payload);
  }

  update(
    id: number,
    payload: ContratoUpdateInput
  ): Observable<ContratoResumen> {
    return this.http.put<ContratoResumen>(`${API}/Contratos/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/Contratos/${id}`);
  }

  renovar(
    id: number,
    payload: ContratoRenovarInput
  ): Observable<ContratoResumen> {
    return this.http.post<ContratoResumen>(
      `${API}/Contratos/${id}/renovar`,
      payload
    );
  }

  rescindir(
    id: number,
    payload: ContratoRescindirInput = {}
  ): Observable<ContratoResumen> {
    return this.http.post<ContratoResumen>(
      `${API}/Contratos/${id}/rescindir`,
      payload
    );
  }

  // ===========================
  // Utilidades de Front
  // ===========================

  /**
   * Filtra en memoria la lista de contratos por texto + estado (para la barra superior).
   * - buscar: coincide contra idResidente, idUnidad, y (opcionalmente) monto/fechas.
   * - estado: si viene vacío '', no filtra por estado.
   */
  filterLocal(data: ContratoResumen[], f: ContratosFiltro): ContratoResumen[] {
    const txt = (f.buscar || "").trim().toLowerCase();

    // Solución: verificar si el estado es string vacío primero
    const estadoFiltro = f.estado;
    const noFiltrarPorEstado =
      estadoFiltro === "" ||
      estadoFiltro === undefined ||
      estadoFiltro === null;

    // Si no hay filtro de estado o está vacío, solo filtramos por texto
    if (noFiltrarPorEstado) {
      return data.filter((c) => {
        if (!txt) return true;
        return [
          c.id?.toString(),
          c.idResidente?.toString(),
          c.idUnidad?.toString(),
          c.monto?.toString(),
          c.fechaInicio,
          c.fechaFin || "",
        ].some((v) => (v || "").toLowerCase().includes(txt));
      });
    }

    // Si hay filtro de estado, filtramos por ambos
    return data.filter((c) => {
      const coincideTexto = !txt
        ? true
        : [
            c.id?.toString(),
            c.idResidente?.toString(),
            c.idUnidad?.toString(),
            c.monto?.toString(),
            c.fechaInicio,
            c.fechaFin || "",
          ].some((v) => (v || "").toLowerCase().includes(txt));

      return coincideTexto && c.estado === estadoFiltro;
    });
  }

  /**
   * Calcula métricas para los cuadros inferiores:
   * - total: número de contratos.
   * - activos: estado ACTIVO.
   * - próximos a vencer: ACTIVO con fechaFin en <= 30 días.
   * - ingresosMensuales: suma de monto de ACTIVO (si necesitas prorrateo, cámbialo luego).
   */
  buildStats(data: ContratoResumen[]): ContratosStats {
    const hoy = new Date();
    const enNDias = (n: number) =>
      new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n);

    const activos = data.filter((d) => d.estado === EstadoContrato.ACTIVO);
    const proximosAVencer = activos.filter((d) => {
      if (!d.fechaFin) return false;
      const fin = new Date(d.fechaFin);
      return fin >= hoy && fin <= enNDias(30);
    }).length;

    const ingresosMensuales = activos.reduce(
      (acc, c) => acc + (Number(c.monto) || 0),
      0
    );

    return {
      total: data.length,
      activos: activos.length,
      proximosAVencer,
      ingresosMensuales,
    };
  }
}

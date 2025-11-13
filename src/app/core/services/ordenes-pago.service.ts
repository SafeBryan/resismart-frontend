import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, forkJoin, map, of } from "rxjs";
import { environment } from "../../../environments/environment";

import {
  IngresoMensualDTO,
  OrdenPagoEstado,
  OrdenPagoGeneracionMensualResponseDTO,
  OrdenPagoResumenDTO,
  OrdenPagoResumenEstados,
  PageResponse,
} from "../models/orden-pago.model";

const API = environment.apiUrl || "http://localhost:8080";

@Injectable({ providedIn: "root" })
export class OrdenesPagoService {
  private http = inject(HttpClient);

  // ===========================
  // EXISTENTE: listar por contrato
  // ===========================
  listByContrato(contratoId: number): Observable<OrdenPagoResumenDTO[]> {
    if (!contratoId) return of([]);
    return this.http.get<OrdenPagoResumenDTO[]>(
      `${API}/OrdenesPago/contrato/${contratoId}`
    );
  }

  // ===========================
  // EXISTENTE: listar por varios contratos
  // ===========================
  listByContratos(contratoIds: number[]): Observable<OrdenPagoResumenDTO[]> {
    if (!contratoIds?.length) return of([]);
    const calls = contratoIds.map((id) => this.listByContrato(id));
    return calls.length === 1
      ? calls[0]
      : forkJoin(calls).pipe(map((chunks) => chunks.flat()));
  }

  // ===========================
  // NUEVO: listado general con filtros + paginación
  // GET /OrdenesPago
  // ===========================
  listarGeneral(params: {
    contratoId?: number;
    estado?: OrdenPagoEstado | "";
    from?: string;
    to?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: "ASC" | "DESC";
    flat?: boolean;
  }): Observable<PageResponse<OrdenPagoResumenDTO> | OrdenPagoResumenDTO[]> {
    const cleaned = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    );

    let httpParams = new HttpParams();
    for (const [key, value] of cleaned) {
      httpParams = httpParams.set(key, String(value));
    }

    return this.http.get<
      PageResponse<OrdenPagoResumenDTO> | OrdenPagoResumenDTO[]
    >(`${API}/OrdenesPago`, { params: httpParams });
  }

  // ===========================
  // RESUMEN KPIs por estado
  // GET /OrdenesPago/resumen
  // ===========================
  resumen(params: {
    contratoId?: number;
    from?: string;
    to?: string;
  }): Observable<OrdenPagoResumenEstados> {
    const cleaned = Object.entries(params).filter(
      ([, v]) => v != null && v !== ""
    );

    let httpParams = new HttpParams();
    for (const [key, value] of cleaned) {
      httpParams = httpParams.set(key, String(value));
    }

    return this.http.get<OrdenPagoResumenEstados>(
      `${API}/OrdenesPago/resumen`,
      {
        params: httpParams,
      }
    );
  }

  // ===========================
  // INGRESOS MENSUALES
  // GET /OrdenesPago/ingresos-mensuales
  // ===========================
  ingresosMensuales(params: {
    contratoId?: number;
    from?: string;
    to?: string;
  }): Observable<IngresoMensualDTO[]> {
    const cleaned = Object.entries(params).filter(
      ([, v]) => v != null && v !== ""
    );

    let httpParams = new HttpParams();
    for (const [key, value] of cleaned) {
      httpParams = httpParams.set(key, String(value));
    }

    return this.http.get<IngresoMensualDTO[]>(
      `${API}/OrdenesPago/ingresos-mensuales`,
      { params: httpParams }
    );
  }

  // ===========================
  // GENERAR ÓRDENES PARA UN MES
  // POST /OrdenesPago/generar?anio=&mes=
  // ===========================
  generarParaMes(
    anio: number,
    mes: number
  ): Observable<OrdenPagoGeneracionMensualResponseDTO> {
    const params = new HttpParams()
      .set("anio", String(anio))
      .set("mes", String(mes));

    return this.http.post<OrdenPagoGeneracionMensualResponseDTO>(
      `${API}/OrdenesPago/generar`,
      null,
      { params }
    );
  }

  // ===========================
  // MARCAR ORDEN COMO PAGADA
  // POST /OrdenesPago/{id}/pagar
  // ===========================
  marcarPagada(id: number): Observable<OrdenPagoResumenDTO> {
    return this.http.post<OrdenPagoResumenDTO>(
      `${API}/OrdenesPago/${id}/pagar`,
      null
    );
  }
}

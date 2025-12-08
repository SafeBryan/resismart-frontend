import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, forkJoin, map, switchMap, of } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  DashboardData,
  DashboardKpis,
  DashboardOrden,
  DashboardDocumento,
  DashboardActividad,
  DashboardFilters,
  CondominioBasic,
  ResidenteBasic,
  ContratoBasic,
  OrdenEstado,
} from "../models/dashboard.model";
const API = environment.apiUrl || "http://localhost:8080";

interface PageResponse<T> {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  content: T[];
}

/** Params tipados para evitar TS4111 */
interface OrdenesQuery {
  flat?: boolean;
  size?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
  contratoId?: number;
  from?: string;
  to?: string;
}

interface ResumenQuery {
  contratoId?: number;
  from?: string;
  to?: string;
}

interface IngresosMensualesRow {
  mes: string; // "YYYY-MM" (mapeado en el front)
  montoTotal: number;
}

/**
 * Servicio central del Dashboard Administrativo
 * Permite consultar ordenes de pago, comprobantes y KPIs generales
 */
@Injectable({ providedIn: "root" })
export class DashboardService {
  private http = inject(HttpClient);

  // ==============================
  // Helpers de mapeo
  // ==============================

  /** Mapea estado del backend (MAYUSCULAS) al tipo del front (minusculas). */
  private adaptEstado(
    apiEstado: string | null | undefined
  ): OrdenEstado | undefined {
    if (!apiEstado) return undefined;
    const s = apiEstado.toString().toUpperCase();
    switch (s) {
      case "PENDIENTE":
        return "pendiente";
      case "PAGADA":
        return "pagada";
      case "VENCIDA":
        return "vencida";
      case "EN_MORA":
        return "en_mora";
      default:
        return undefined;
    }
  }

  /** Mapea OrdenPagoResumenDTO del back a DashboardOrden del front. */
  private adaptOrden(api: any): DashboardOrden {
    return {
      id: api.id,
      contratoId: api.idContrato,
      numero: api.numero ?? undefined,
      fechaEmision: api.fechaEmision ?? undefined,
      fechaVencimiento: api.fechaVencimiento ?? undefined,
      total: api.monto,
      estado: this.adaptEstado(api.estado),
      documentoId: api.documentoId ?? undefined,
    };
  }

  /** Suma KPIs a partir de la lista de ordenes (fallback si no usamos /resumen). */
  buildKpis(ordenes: DashboardOrden[]): DashboardKpis {
    const total = ordenes.length;
    const pendientes = ordenes.filter((o) => o.estado === "pendiente").length;
    const pagadas = ordenes.filter((o) => o.estado === "pagada").length;
    const vencidas = ordenes.filter((o) => o.estado === "vencida").length;
    const enMora = ordenes.filter((o) => o.estado === "en_mora").length;
    const conComprobante = ordenes.filter((o) => !!o.documentoId).length; // depende del back
    return {
      totalOrdenes: total,
      pendientes,
      pagadas,
      vencidas,
      enMora,
      conComprobante,
    };
  }

  /** Combina KPIs de /resumen con conComprobante derivado (si lo tenemos). */
  private mixKpisFromResumen(
    resumen: Record<string, number>,
    ordenes: DashboardOrden[]
  ): DashboardKpis {
    const toN = (k: string) => Number(resumen?.[k] ?? 0);
    const pendientes = toN("PENDIENTE");
    const pagadas = toN("PAGADA");
    const vencidas = toN("VENCIDA");
    const enMora = toN("EN_MORA");
    const totalOrdenes = pendientes + pagadas + vencidas + enMora;
    const conComprobante = ordenes.filter((o) => !!o.documentoId).length;
    return {
      totalOrdenes,
      pendientes,
      pagadas,
      vencidas,
      enMora,
      conComprobante,
    };
  }

  // ==============================
  // METODOS BASE (Endpoints directos)
  // ==============================

  getCondominios(): Observable<CondominioBasic[]> {
    return this.http.get<CondominioBasic[]>(`${API}/Condominios`);
  }

  getResidentesByCondominio(
    condominioId: number
  ): Observable<ResidenteBasic[]> {
    return this.http.get<ResidenteBasic[]>(
      `${API}/Residentes/condominio/${condominioId}`
    );
  }

  getContratosByResidente(residenteId: number): Observable<ContratoBasic[]> {
    return this.http.get<ContratoBasic[]>(
      `${API}/Contratos/residente/${residenteId}`
    );
  }

  getOrdenesByContrato(contratoId: number): Observable<DashboardOrden[]> {
    return this.http
      .get<any[]>(`${API}/OrdenesPago/contrato/${contratoId}`)
      .pipe(map((list) => (list || []).map((o) => this.adaptOrden(o))));
  }

  /** Listado general de ordenes con filtros (nuevo endpoint /OrdenesPago?flat=true). */
  getOrdenes(params: OrdenesQuery = {}): Observable<DashboardOrden[]> {
    const base: OrdenesQuery = {
      flat: true,
      size: 50,
      sortBy: "fechaEmision",
      sortDir: "DESC",
    };
    // sanitizar
    const clean: OrdenesQuery = { ...base };
    if (params.size != null) clean.size = params.size;
    if (params.sortBy) clean.sortBy = params.sortBy;
    if (params.sortDir) clean.sortDir = params.sortDir;
    if (params.flat != null) clean.flat = params.flat;
    if (params.contratoId != null) clean.contratoId = params.contratoId;
    if (params.from) clean.from = params.from;
    if (params.to) clean.to = params.to;

    const httpParams = new HttpParams({ fromObject: clean as any });
    return this.http
      .get<any[] | { content?: any[] }>(`${API}/OrdenesPago`, { params: httpParams })
      .pipe(
        map((resp) => {
          const list = Array.isArray(resp) ? resp : resp?.content ?? [];
          return (list || []).map((o) => this.adaptOrden(o));
        })
      );
  }

  /** Resumen por estado (KPIs) */
  getOrdenesResumen(
    params: ResumenQuery = {}
  ): Observable<Record<string, number>> {
    const clean: ResumenQuery = {};
    if (params.contratoId != null) clean.contratoId = params.contratoId;
    if (params.from) clean.from = params.from;
    if (params.to) clean.to = params.to;

    const httpParams = new HttpParams({ fromObject: clean as any });
    return this.http.get<Record<string, number>>(`${API}/OrdenesPago/resumen`, {
      params: httpParams,
    });
  }

  /** Serie de ingresos mensuales (sumatoria de PAGADAS). Mapea mes-objeto -> "YYYY-MM". */
  getIngresosMensuales(
    params: ResumenQuery = {}
  ): Observable<IngresosMensualesRow[]> {
    const clean: ResumenQuery = {};
    if (params.contratoId != null) clean.contratoId = params.contratoId;
    if (params.from) clean.from = params.from;
    if (params.to) clean.to = params.to;

    const httpParams = new HttpParams({ fromObject: clean as any });

    return this.http
      .get<any[]>(`${API}/OrdenesPago/ingresos-mensuales`, {
        params: httpParams,
      })
      .pipe(
        map((rows) =>
          (rows ?? []).map((r) => {
            // soporta { mes: {year, monthValue} } o string
            let ym = "";
            if (typeof r.mes === "string") {
              ym = r.mes.slice(0, 7); // "YYYY-MM[..]"
            } else if (
              r.mes &&
              (r.mes.year != null || r.mes.monthValue != null)
            ) {
              const y = r.mes.year ?? "0000";
              const m = String(r.mes.monthValue ?? 1).padStart(2, "0");
              ym = `${y}-${m}`;
            }
            return {
              mes: ym,
              montoTotal: Number(r.montoTotal ?? 0),
            } as IngresosMensualesRow;
          })
        )
      );
  }

  /** Listar documentos (paginado por defecto del back) -> mapeo content */
  getDocumentos(params?: {
    q?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Observable<DashboardDocumento[]> {
    let httpParams = new HttpParams({
      fromObject: { page: params?.page ?? 0, size: params?.size ?? 10 },
    });
    if (params?.q) httpParams = httpParams.set("q", params.q);
    if (params?.from) httpParams = httpParams.set("from", params.from);
    if (params?.to) httpParams = httpParams.set("to", params.to);

    return this.http
      .get<PageResponse<any>>(`${API}/documentos`, { params: httpParams })
      .pipe(
        map((resp) =>
          (resp?.content ?? []).map(
            (d) =>
              ({
                id: d.idDocumento,
                nombre: d.nombreOriginal,
                tipo: d.tipo ?? undefined,
                creadoEn: d.fechaSubida ?? undefined,
              } as DashboardDocumento)
          )
        )
      );
  }

  /** Documentos en modo "flat" (si habilitaste flat & X-Total-Count en el back) */
  getDocumentosFlat(
    params: {
      q?: string;
      from?: string;
      to?: string;
      page?: number;
      size?: number;
    } = {}
  ) {
    const clean: any = { flat: true, withLinks: true };
    if (params.q) clean.q = params.q;
    if (params.from) clean.from = params.from;
    if (params.to) clean.to = params.to;
    if (params.page != null) clean.page = params.page;
    if (params.size != null) clean.size = params.size;

    const httpParams = new HttpParams({ fromObject: clean });
    return this.http
      .get<any[]>(`${API}/documentos`, {
        params: httpParams,
        observe: "response",
      })
      .pipe(
        map((resp) => ({
          total: Number(resp.headers.get("X-Total-Count") ?? "0"),
          items: (resp.body ?? []).map((d: any) => ({
            id: d.id ?? d.idDocumento,
            nombre: d.nombre ?? d.nombreOriginal,
            tipo: d.tipo,
            creadoEn: d.creadoEn ?? d.fechaSubida,
          })) as DashboardDocumento[],
        }))
      );
  }

  descargarDocumento(idDocumento: number): Observable<Blob> {
    return this.http.get(`${API}/documentos/${idDocumento}/contenido`, {
      responseType: "blob",
    });
  }

  getAuditoriaDocumento(idDocumento: number): Observable<DashboardActividad[]> {
    return this.http.get<DashboardActividad[]>(
      `${API}/documentos/${idDocumento}/auditoria`
    );
  }

  // ==============================
  // RESUMEN FINANCIERO (backend /dashboard/financiero)
  // ==============================

  getFinanciero(condominioId?: number): Observable<{
    ingresosDelMes?: number;
    egresosDelMes?: number;
    totalDeudaPorCobrar?: number;
    balanceGeneral?: number;
  }> {
    const params: any = {};
    if (condominioId != null) params.condominioId = condominioId;
    return this.http.get(`${API}/dashboard/financiero`, { params });
  }

  // ==============================
  // METODOS DERIVADOS / COMPUESTOS
  // ==============================

  loadOrdenesConFiltro(
    filtros: DashboardFilters
  ): Observable<DashboardOrden[]> {
    const { contratoId, condominioId, residenteId, from, to } = filtros;

    // 1) Simple/eficiente: directo a /OrdenesPago si hay contratoId o no hay filtros jerarquicos
    if (contratoId || (!condominioId && !residenteId)) {
      const params: OrdenesQuery = {};
      if (contratoId != null) params.contratoId = contratoId;
      if (from) params.from = from;
      if (to) params.to = to;
      return this.getOrdenes(params);
    }

    // 2) Fan-out por condominio/residente
    const residentes$ = residenteId
      ? of<ResidenteBasic[]>([
          { id: residenteId, nombres: "", apellidos: "" } as any,
        ])
      : condominioId
      ? this.getResidentesByCondominio(condominioId)
      : of<ResidenteBasic[]>([]);

    return residentes$.pipe(
      switchMap((residentes) => {
        if (!residentes.length && !residenteId) return of<DashboardOrden[]>([]);
        const contratosReqs = residenteId
          ? [this.getContratosByResidente(residenteId)]
          : residentes.map((r) => this.getContratosByResidente(r.id));

        return (
          contratosReqs.length
            ? forkJoin(contratosReqs)
            : of<ContratoBasic[][]>([[]])
        ).pipe(
          map((chunks) => chunks.flat()),
          switchMap((contratos) => {
            if (!contratos.length) return of<DashboardOrden[]>([]);
            const ordenesReqs = contratos.map((c) =>
              this.getOrdenes({ contratoId: c.id, size: 50 })
            );
            return forkJoin(ordenesReqs).pipe(map((chunks) => chunks.flat()));
          })
        );
      })
    );
  }

  loadDashboardData(filtros: DashboardFilters): Observable<DashboardData> {
    const list$ = this.loadOrdenesConFiltro(filtros);
    const resumen$ = this.getOrdenesResumen(this.pickResumenParams(filtros));
    const docs$ = this.getDocumentos({ page: 0, size: 10 });
    const actividad$ = this.getActividadReciente({
      docsLimit: 5,
      auditLimit: 3,
    });

    return forkJoin([list$, resumen$, docs$, actividad$]).pipe(
      map(([ordenes, resumen, documentos, actividad]) => {
        const kpis = this.mixKpisFromResumen(resumen, ordenes);
        const q = (filtros.q || "").toLowerCase();
        const ordenesFiltradas = q
          ? ordenes.filter((o) =>
              (o.numero || o.id.toString()).toLowerCase().includes(q)
            )
          : ordenes;

        return {
          filtros,
          kpis,
          ordenes: ordenesFiltradas,
          documentos,
          actividad,
          condominios: [],
          residentes: [],
          contratos: [],
        } as DashboardData;
      })
    );
  }

  /** Extrae solo los params que entiende /OrdenesPago/resumen */
  private pickResumenParams(f: DashboardFilters): ResumenQuery {
    const out: ResumenQuery = {};
    if (f.contratoId != null) out.contratoId = f.contratoId;
    if (f.from) out.from = f.from;
    if (f.to) out.to = f.to;
    return out;
  }

  /** Mapea AuditoriaDocDTO -> DashboardActividad */
  private adaptAuditoria(a: any): DashboardActividad {
    return {
      id: a.id,
      documentoId: a.documentoId,
      usuario: a.realizadoPor ?? undefined,
      fecha: a.fecha,
      accion: a.accion ?? undefined,
      meta: a.detalle ?? undefined,
    };
  }

  /**
   * Actividad reciente a partir de los ultimos documentos y su auditoria.
   * Evita N+1 abusivo limitando documentos y eventos por doc.
   */
  getActividadReciente(
    opts: { docsLimit?: number; auditLimit?: number } = {}
  ): Observable<DashboardActividad[]> {
    const { docsLimit = 5, auditLimit = 5 } = opts;

    // Usa tu endpoint "flat" para traer los ultimos N documentos (orden por fecha ya lo maneja el back)
    return this.getDocumentosFlat({ size: docsLimit }).pipe(
      switchMap(({ items }) => {
        if (!items.length) return of<DashboardActividad[]>([]);
        const calls = items.map((d) =>
          this.getAuditoriaDocumento(d.id).pipe(
            map((list) =>
              (list || [])
                .slice(0, auditLimit)
                .map((a) => this.adaptAuditoria(a))
            )
          )
        );
        return forkJoin(calls).pipe(map((chunks) => chunks.flat()));
      }),
      // Ordenar por fecha desc y cortar a top 10-20
      map((all) =>
        all
          .sort((a, b) => b.fecha?.localeCompare(a.fecha || "") ?? 0)
          .slice(0, 15)
      )
    );
  }
}

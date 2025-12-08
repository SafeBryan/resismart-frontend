import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdenPagoResumenDTO, OrdenPagoEstado, IngresoMensualDTO, OrdenPagoDetalleDTO } from '../models/orden-pago.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class OrdenesPagoService {
  private http = inject(HttpClient);

  list(params: {
    contratoId?: number;
    estado?: OrdenPagoEstado;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
    flat?: boolean;
  }): Observable<{ items: OrdenPagoResumenDTO[]; total?: number }> {
    const httpParams = new HttpParams({
      fromObject: Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .reduce<Record<string, string>>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {}),
    });
    return this.http
      .get<OrdenPagoResumenDTO[] | { content?: OrdenPagoResumenDTO[]; totalElements?: number }>(`${API}/OrdenesPago`, {
        params: httpParams.set('flat', String(params?.flat ?? true)),
        observe: 'response',
      })
      .pipe(
        map((resp) => {
          const body = resp.body;
          const items = this.normalizeOrdenes(body);
          const headerTotal = resp.headers.get('X-Total-Count');
          const totalElements =
            headerTotal != null ? Number(headerTotal) : (body as any)?.totalElements ?? (body as any)?.total ?? items.length;
          return { items, total: Number.isFinite(totalElements) ? totalElements : undefined };
        })
      );
  }

  listByContrato(contratoId: number): Observable<OrdenPagoResumenDTO[]> {
    if (!contratoId) return of([]);
    return this.http
      .get<OrdenPagoResumenDTO[] | { content?: OrdenPagoResumenDTO[] }>(
        `${API}/OrdenesPago/contrato/${contratoId}`
      )
      .pipe(map((resp) => this.normalizeOrdenes(resp)));
  }

  listByContratos(contratoIds: number[]): Observable<OrdenPagoResumenDTO[]> {
    if (!contratoIds?.length) return of([]);
    const calls = contratoIds.map((id) => this.listByContrato(id));
    return (calls.length === 1 ? calls[0] : forkJoin(calls).pipe(map((chunks) => chunks.flat())));
  }

  resumen(params: { contratoId?: number; from?: string; to?: string }): Observable<Record<OrdenPagoEstado, number>> {
    const httpParams = new HttpParams({
      fromObject: Object.entries(params)
        .filter(([, v]) => v != null && v !== '')
        .reduce<Record<string, string>>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {}),
    });
    return this.http.get<Record<OrdenPagoEstado, number>>(`${API}/OrdenesPago/resumen`, {
      params: httpParams,
    });
  }

  ingresosMensuales(params: { contratoId?: number; from?: string; to?: string }): Observable<IngresoMensualDTO[]> {
    const httpParams = new HttpParams({
      fromObject: Object.entries(params)
        .filter(([, v]) => v != null && v !== '')
        .reduce<Record<string, string>>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {}),
    });
    return this.http.get<IngresoMensualDTO[]>(`${API}/OrdenesPago/ingresos-mensuales`, { params: httpParams });
  }

  private normalizeOrdenes(resp: any): OrdenPagoResumenDTO[] {
    if (Array.isArray(resp)) return resp;
    if (resp && Array.isArray(resp.content)) return resp.content;
    return [];
  }

  getDetalle(id: number): Observable<OrdenPagoDetalleDTO> {
    return this.http.get<OrdenPagoDetalleDTO>(`${API}/OrdenesPago/${id}`);
  }
}

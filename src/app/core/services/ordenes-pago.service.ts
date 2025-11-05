import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdenPagoResumenDTO, OrdenPagoEstado, IngresoMensualDTO } from '../models/orden-pago.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class OrdenesPagoService {
  private http = inject(HttpClient);

  listByContrato(contratoId: number): Observable<OrdenPagoResumenDTO[]> {
    if (!contratoId) return of([]);
    return this.http.get<OrdenPagoResumenDTO[]>(`${API}/OrdenesPago/contrato/${contratoId}`);
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
}

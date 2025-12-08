import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MetodoPago, TransaccionPagoDTO } from '../models/pago.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private http = inject(HttpClient);

  registrarTransaccion(payload: {
    ordenId: number;
    monto: number;
    referencia?: string;
    metodoPago: MetodoPago;
    comprobante?: File;
  }): Observable<TransaccionPagoDTO> {
    const formData = new FormData();
    formData.append('ordenId', String(payload.ordenId));
    formData.append('monto', String(payload.monto));
    formData.append('metodoPago', payload.metodoPago);
    if (payload.referencia) formData.append('referencia', payload.referencia);
    if (payload.comprobante) formData.append('comprobante', payload.comprobante, payload.comprobante.name);

    return this.http.post<TransaccionPagoDTO>(`${API}/pagos/transaccion`, formData);
  }

  aprobarTransaccion(id: number, idAdmin: number): Observable<TransaccionPagoDTO> {
    return this.http.put<TransaccionPagoDTO>(`${API}/pagos/transaccion/${id}/aprobar`, { idAdmin });
  }

  rechazarTransaccion(id: number, motivo: string, idAdmin?: number): Observable<TransaccionPagoDTO> {
    const payload: any = { motivo };
    if (idAdmin) payload.idAdmin = idAdmin;
    return this.http.put<TransaccionPagoDTO>(`${API}/pagos/transaccion/${id}/rechazar`, payload);
  }

  listarTransacciones(params: { estado?: string; contratoId?: number; ordenId?: number; page?: number; size?: number } = {}): Observable<TransaccionPagoDTO[]> {
    const httpParams = new HttpParams({
      fromObject: Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .reduce<Record<string, string>>((acc, [key, val]) => {
          acc[key] = String(val);
          return acc;
        }, {}),
    });
    return this.http.get<TransaccionPagoDTO[] | { content?: TransaccionPagoDTO[] }>(`${API}/pagos/transaccion`, { params: httpParams }).pipe(
      map((resp) => {
        if (Array.isArray(resp)) return resp;
        if (resp && Array.isArray(resp.content)) return resp.content;
        return [];
      }),
      catchError(() => of<TransaccionPagoDTO[]>([]))
    );
  }
}

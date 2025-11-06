import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, shareReplay } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../../environments/environment';
import { AvisoPayload, AvisoRequest } from '../models/aviso.model';
import { AuthService } from './auth.service';

const API = environment.apiUrl || 'http://localhost:8080';

export interface AvisosSocketOptions {
  condominios?: number[];
  reconnectDelayMs?: number;
}

@Injectable({ providedIn: 'root' })
export class AvisosService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  emit(aviso: AvisoRequest): Observable<AvisoPayload> {
    return this.http.post<AvisoPayload>(`${API}/Avisos`, aviso);
  }

  listForUsuario(idUsuario: number, limit = 50): Observable<AvisoPayload[]> {
    if (!idUsuario) return of([]);
    return this.http
      .get<AvisoPayload[]>(`${API}/Avisos/usuarios/${idUsuario}`)
      .pipe(map((list) => list.slice(0, limit)));
  }

  listForCondominio(condominioId: number, limit = 50): Observable<AvisoPayload[]> {
    if (!condominioId) return of([]);
    return this.http
      .get<AvisoPayload[]>(`${API}/Avisos/condominios/${condominioId}`)
      .pipe(map((list) => list.slice(0, limit)));
  }

  listBroadcast(limit = 50): Observable<AvisoPayload[]> {
    return this.http
      .get<AvisoPayload[]>(`${API}/Avisos/broadcast`)
      .pipe(map((list) => list.slice(0, limit)));
  }

  /**
   * Crea un WebSocketSubject conectado a ws://.../ws/avisos con el JWT actual.
   * El backend espera Authorization por header; en navegadores no se puede
   * enviar, por lo que adjuntamos el token en el query string usando la clave
   * AUTHORIZATION (el backend debe leerlo y tratarlo como si fuese el header
   * homonimo).
   */
  connectSocket(opts: AvisosSocketOptions = {}): WebSocketSubject<AvisoPayload> | null {
    const token = this.auth.getToken();
    if (!token || typeof window === 'undefined') return null;

    const httpBase = environment.apiUrl || 'http://localhost:8080';
    const base = httpBase.replace(/^http/, 'ws').replace(/^ws(s?):\/\//, (_, secure) =>
      secure === 's' || httpBase.startsWith('https') ? 'wss://' : 'ws://'
    );
    const query: Record<string, string> = {
      token: `${token}`,
    };
    if (opts.condominios?.length) {
      query['condominios'] = opts.condominios.join(',');
    }

    const params = new HttpParams({ fromObject: query }).toString();

    const url = `${base}/ws/avisos${params ? `?${params}` : ''}`;

    return webSocket<AvisoPayload>({
      url,
      protocol: 'authorization',
      deserializer: (e) => JSON.parse(e.data),
      serializer: (value) => JSON.stringify(value),
      openObserver: undefined,
      closeObserver: undefined,
    });
  }

  /**
   * Combina avisos personales + condominio + broadcast, evitando duplicados
   * (por id) y ordenando por fecha descendente.
   */
  aggregateStream(
    userId: number | null,
    condominioIds: number[] = [],
    limit = 20
  ): Observable<AvisoPayload[]> {
    const calls: Observable<AvisoPayload[]>[] = [
      this.listBroadcast(limit),
    ];
    if (userId) calls.push(this.listForUsuario(userId, limit));
    condominioIds.forEach((id) => {
      if (id != null) calls.push(this.listForCondominio(id, limit));
    });

    if (!calls.length) return of([]);

    return (calls.length === 1 ? calls[0] : forkJoin(calls).pipe(map((chunks) => chunks.flat()))).pipe(
      map((list) => {
        const mapUnique = new Map<number, AvisoPayload>();
        list.forEach((aviso) => {
          if (!mapUnique.has(aviso.id)) mapUnique.set(aviso.id, aviso);
        });
        return Array.from(mapUnique.values())
          .sort((a, b) => (b.emitidoEn || '').localeCompare(a.emitidoEn || ''))
          .slice(0, limit);
      }),
      shareReplay(1)
    );
  }
}



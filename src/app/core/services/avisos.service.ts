import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NextObserver, Observable, forkJoin, map, of, shareReplay } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../../environments/environment';
import { AvisoPayload, AvisoRequest } from '../models/aviso.model';
import { AuthService } from './auth.service';

const API = environment.apiUrl || 'http://localhost:8080';

export interface AvisosSocketOptions {
  condominios?: number[];
  reconnectDelayMs?: number;
  openObserver?: NextObserver<Event>;
  closeObserver?: NextObserver<CloseEvent>;
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

  crearAviso(request: AvisoRequest): Observable<AvisoPayload> {
    return this.http.post<AvisoPayload>(`${API}/Avisos`, request);
  }

  crearPrivado(request: AvisoRequest): Observable<AvisoPayload> {
    return this.http.post<AvisoPayload>(`${API}/Avisos/privado`, request);
  }

  responder(avisoId: number, request: AvisoRequest): Observable<AvisoPayload> {
    return this.http.post<AvisoPayload>(`${API}/Avisos/${avisoId}/responder`, request);
  }

  /**
   * Crea un WebSocketSubject conectado a ws://.../ws/avisos con el JWT actual.
   * El backend valida el token leyendo el query param `token`, por lo que
   * construimos la URL como wss://.../ws/avisos?token=<jwt-encoded>.
   * Cada vez que el JWT cambie se debe reconstruir la conexión.
   */
  connectSocket(opts: AvisosSocketOptions = {}): WebSocketSubject<AvisoPayload> | null {
    const token = this.auth.getToken();
    if (!token || typeof window === 'undefined') return null;

    const httpBase = environment.apiUrl || 'http://localhost:8080';
    const wsBase = this.resolveWsBase((environment as any).wsUrl ?? httpBase);
    const query: Record<string, string> = {
      token,
    };
    if (opts.condominios?.length) {
      query['condominios'] = opts.condominios.join(',');
    }

    const params = new HttpParams({ fromObject: query }).toString();

    const url = `${wsBase}/ws/avisos${params ? `?${params}` : ''}`;

    return webSocket<AvisoPayload>({
      url,
      deserializer: (e) => JSON.parse(e.data),
      serializer: (value) => JSON.stringify(value),
      openObserver: opts.openObserver,
      closeObserver: opts.closeObserver,
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

  markAsRead(idUsuario: number | null, avisoIds: number[]): Observable<void> {
    if (!idUsuario || !avisoIds.length) return of(void 0);
    return this.http.post<void>(`${API}/Avisos/usuarios/${idUsuario}/leidos`, {
      avisoIds,
    });
  }

  private resolveWsBase(raw: string | null | undefined): string {
    if (!raw) return this.defaultWsBase();
    if (raw.startsWith('ws://') || raw.startsWith('wss://')) return raw;
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw.replace(/^http/, 'ws');
    }
    if (raw.startsWith('/')) {
      return `${this.defaultWsBase()}${raw}`;
    }
    return raw;
  }

  private defaultWsBase(): string {
    if (typeof window === 'undefined') return 'ws://localhost:8080';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
}

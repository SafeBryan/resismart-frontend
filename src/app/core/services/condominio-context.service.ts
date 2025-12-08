import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CondominioResumenDTO } from '../models/condominio.model';
import { Observable, catchError, map, of, tap } from 'rxjs';

interface CondominioContextState {
  condominioActualId: number | null;
  condominios: CondominioResumenDTO[];
  loading: boolean;
}

const API = environment.apiUrl || 'http://localhost:8080';
const STORAGE_KEY = 'condominioActualId';

@Injectable({ providedIn: 'root' })
export class CondominioContextService {
  private http = inject(HttpClient);

  private stateSignal = signal<CondominioContextState>({
    condominioActualId: this.restorePersistedId(),
    condominios: [],
    loading: false,
  });

  readonly state: Signal<CondominioContextState> = computed(() => this.stateSignal());
  readonly condominioActual = computed<CondominioResumenDTO | null>(() => {
    const { condominioActualId, condominios } = this.stateSignal();
    if (!condominioActualId) return null;
    return (
      condominios.find((c) => Number(c.id) === Number(condominioActualId)) ?? null
    );
  });

  loadMisCondominios() {
    if (console && console.log) console.log('[CondominioContext] loadMisCondominios start');
    this.stateSignal.update((prev) => ({ ...prev, loading: true }));

    const mapList = (resp: any): CondominioResumenDTO[] => {
      if (Array.isArray(resp)) return resp;
      if (resp && Array.isArray(resp.content)) return resp.content;
      return [];
    };

    const fallbackAdmin$ = this.http
      .get<{ content?: CondominioResumenDTO[] }>(`${API}/Condominios`, {
        params: new HttpParams({ fromObject: { page: 0, size: 200 } }),
      })
      .pipe(map(mapList));

    return this.http
      .get<CondominioResumenDTO[] | { content?: CondominioResumenDTO[] }>(`${API}/Condominios/mis-condominios`)
      .pipe(
        map(mapList),
        catchError((err: HttpErrorResponse) => {
          // 403 puede ser admin/owner (usar fallback) o residente sin contratos (lista vacía)
          if (err?.status === 403) {
            if (console && console.log) console.log('[CondominioContext] 403 en mis-condominios, intentando /Condominios');
            return fallbackAdmin$;
          }
          // 404 -> usar fallback /Condominios (admins/owners) o vaciar
          if (err?.status === 404) {
            if (console && console.log) console.log('[CondominioContext] fallback a /Condominios');
            return fallbackAdmin$;
          }
          return of<CondominioResumenDTO[]>([]);
        }),
        tap((lista: CondominioResumenDTO[]) => {
          if (console && console.log) console.log('[CondominioContext] lista recibida', lista);
          const persistedId = this.stateSignal().condominioActualId;
          const valido = lista.some((c) => Number(c.id) === Number(persistedId));
          const nuevoId = valido
            ? persistedId
            : lista.length > 0
              ? Number(lista[0].id ?? null)
              : null;
          this.persistId(nuevoId);
          if (console && console.log) console.log('[CondominioContext] fijando estado', { nuevoId, total: lista.length });
          this.stateSignal.set({
            condominioActualId: nuevoId,
            condominios: lista,
            loading: false,
          });
        }),
        catchError((err) => {
          console.error('[CondominioContext] No se pudieron cargar condominios:', err);
          this.persistId(null);
          this.stateSignal.set({
            condominioActualId: null,
            condominios: [],
            loading: false,
          });
          return of<CondominioResumenDTO[]>([]);
        })
      );
  }

  /**
   * Garantiza que la lista esté cargada; si ya está cargada o en caché, devuelve esa lista.
   * Útil para inicializar pantallas sin necesidad de recargar manualmente.
   */
  ensureLoaded(): Observable<CondominioResumenDTO[]> {
    const current = this.stateSignal();
    if (current.loading) {
      return of(current.condominios);
    }
    if (current.condominios && current.condominios.length) {
      return of(current.condominios);
    }
    return this.loadMisCondominios();
  }

  setCondominioActual(id: number | null): void {
    const lista = this.stateSignal().condominios;
    const exists = id != null && lista.some((c) => Number(c.id) === Number(id));
    const nextId = exists ? Number(id) : (lista.length ? Number(lista[0].id ?? null) : null);
    this.persistId(nextId);
    this.stateSignal.update((prev) => ({
      ...prev,
      condominioActualId: nextId,
    }));
  }

  getCondominioActualId(): number | null {
    return this.stateSignal().condominioActualId;
  }

  private restorePersistedId(): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  private persistId(id: number | null): void {
    try {
      if (id == null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, String(id));
      }
    } catch {
      // ignore storage errors (Safari private mode, etc.)
    }
  }
}

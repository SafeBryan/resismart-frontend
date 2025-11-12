import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, Subscription } from 'rxjs';
import { WebSocketSubject } from 'rxjs/webSocket';
import { AvisoPayload } from '../models/aviso.model';
import { AvisosService } from './avisos.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { isAdmin, isOwner } from '../utils/role.util';

const CACHE_KEY = 'resismart.avisos.cache';
const PENDING_ACK_KEY = 'resismart.avisos.pendingAck';
const MAX_ITEMS = 100;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface AvisoItem extends AvisoPayload {
  relativeEmitido: string;
}

export interface AvisosFacade {
  avisos: Signal<AvisoItem[]>;
  unreadCount: Signal<number>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  ack(ids: number[]): void;
  markAllVisible(ids?: number[]): void;
  navigate(aviso: AvisoItem): Promise<boolean>;
  refresh(): void;
}

@Injectable({ providedIn: 'root' })
export class AvisosStoreService implements AvisosFacade {
  private readonly avisosService = inject(AvisosService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly internalAvisos = signal<AvisoItem[]>(this.restoreCachedAvisos());
  readonly avisos = this.internalAvisos.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  readonly unreadCount = computed(() => this.internalAvisos().filter((item) => !item.leido).length);

  private userId: number | null = null;
  private socket?: WebSocketSubject<AvisoPayload>;
  private socketSub?: Subscription;
  private socketConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private initialHydrated = false;

  private pendingAck = new Set<number>(this.restorePendingAck());
  private ackFallbackTimer?: ReturnType<typeof setTimeout>;
  private ackRequest?: Subscription;

  private beforeUnloadHandler = () => this.flushPendingAckViaRest();

  constructor() {
    this.subscribeToAuth();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
    this.destroyRef.onDestroy(() => {
      this.cleanupSocket();
      this.stopRefreshTicker();
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      }
    });
  }

  ack(ids: number[]): void {
    if (!ids?.length) return;
    const unique = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
    if (!unique.length) return;
    const changed = new Set(unique);
    this.internalAvisos.update((items) =>
      items.map((item) => (changed.has(item.id) ? { ...item, leido: true } : item))
    );
    unique.forEach((id) => this.pendingAck.add(id));
    this.persistAvisos();
    this.persistPendingAck();
    this.scheduleAckFlush();
  }

  markAllVisible(ids?: number[]): void {
    if (ids?.length) {
      this.ack(ids);
      return;
    }
    const unread = this.internalAvisos()
      .filter((item) => !item.leido)
      .map((item) => item.id);
    this.ack(unread);
  }

  navigate(aviso: AvisoItem): Promise<boolean> {
    if (!aviso) return Promise.resolve(false);
    this.ack([aviso.id]);
    const target = this.resolveRoute(aviso);
    return this.router.navigateByUrl(target).catch(() => false);
  }

  refresh(): void {
    this.fetchFromServer(true);
  }

  // ======================
  // Bootstrap & listeners
  // ======================
  private subscribeToAuth(): void {
    this.auth.auth$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((state) => {
      const nextId = this.normalizeId(state?.idUsuario);
      if (nextId === this.userId) return;
      if (!nextId) {
        this.flushPendingAckViaRest();
        this.resetState();
        this.cleanupSocket();
        this.stopRefreshTicker();
        this.userId = null;
        return;
      }
      this.userId = nextId;
      this.initialHydrated = false;
      this.fetchFromServer(true);
      this.ensureSocket();
      this.startRefreshTicker();
    });
  }

  private ensureSocket(): void {
    if (!this.userId || typeof window === 'undefined') return;
    if (this.socket) return;

    const socket = this.avisosService.connectSocket({
      openObserver: {
        next: () => {
          this.socketConnected = true;
          this.reconnectAttempts = 0;
          this.flushPendingAckViaWs();
        },
      },
      closeObserver: {
        next: () => {
          this.socketConnected = false;
          this.cleanupSocket();
          this.scheduleReconnect();
        },
      },
    });

    if (!socket) return;
    this.socket = socket;
    this.socketSub = socket.subscribe({
      next: (payload) => this.handleIncoming(payload),
      error: () => {
        this.socketConnected = false;
        this.cleanupSocket();
        this.scheduleReconnect();
      },
      complete: () => {
        this.socketConnected = false;
        this.cleanupSocket();
        this.scheduleReconnect();
      },
    });
  }

  private cleanupSocket(): void {
    if (this.socketSub) {
      this.socketSub.unsubscribe();
      this.socketSub = undefined;
    }
    if (this.socket) {
      this.socket.complete();
      this.socket = undefined;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.userId) return;
    const attempt = Math.min(this.reconnectAttempts++, 5);
    const delay = Math.min(30000, 2000 * Math.pow(2, attempt));
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.ensureSocket();
    }, delay);
  }

  private startRefreshTicker(): void {
    if (this.refreshTimer || typeof window === 'undefined') return;
    this.refreshTimer = window.setInterval(() => this.fetchFromServer(false), REFRESH_INTERVAL_MS);
  }

  private stopRefreshTicker(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  // ======================
  // Data management
  // ======================
  private fetchFromServer(showLoading: boolean): void {
    if (!this.userId) return;
    if (showLoading) this.loadingSignal.set(true);
    this.avisosService
      .listForUsuario(this.userId, MAX_ITEMS)
      .pipe(
        catchError((err) => {
          console.error('[AvisosStore] fetch error', err);
          this.errorSignal.set('No se pudieron cargar los avisos.');
          return of<AvisoPayload[]>([]);
        })
      )
      .subscribe((list) => {
        this.mergeAvisos(list, true);
        this.loadingSignal.set(false);
        this.errorSignal.set(null);
        this.initialHydrated = true;
        this.flushPendingAckViaWs();
      });
  }

  private handleIncoming(payload: AvisoPayload): void {
    if (!payload) return;
    const exists = this.internalAvisos().some((item) => item.id === payload.id);
    this.mergeAvisos([payload], false);
    if (this.initialHydrated && !exists) {
      this.toast.info(`Nuevo aviso: ${payload.titulo || 'Aviso del condominio'}`);
    }
  }

  private mergeAvisos(list: AvisoPayload[], replace: boolean): void {
    if (!list) return;
    const current = replace ? new Map<number, AvisoItem>() : new Map(this.internalAvisos().map((item) => [item.id, item]));
    list.forEach((payload) => {
      const prev = current.get(payload.id);
      current.set(payload.id, this.decorateAviso(payload, prev?.leido));
    });
    const merged = Array.from(current.values())
      .sort((a, b) => (b.emitidoEn || '').localeCompare(a.emitidoEn || ''))
      .slice(0, MAX_ITEMS);
    this.internalAvisos.set(merged);
    this.persistAvisos();
  }

  private decorateAviso(payload: AvisoPayload, fallbackLeido = false): AvisoItem {
    const leido = payload.leido ?? fallbackLeido ?? false;
    return {
      ...payload,
      leido,
      relativeEmitido: this.formatRelative(payload.emitidoEn),
    };
  }

  private resetState(): void {
    this.internalAvisos.set([]);
    this.pendingAck.clear();
    this.persistAvisos();
    this.persistPendingAck();
    this.initialHydrated = false;
  }

  // ======================
  // Ack handling
  // ======================
  private scheduleAckFlush(): void {
    if (!this.pendingAck.size) return;
    if (this.socketConnected) {
      this.flushPendingAckViaWs();
      return;
    }
    if (this.ackFallbackTimer) return;
    this.ackFallbackTimer = window.setTimeout(() => {
      this.ackFallbackTimer = undefined;
      this.flushPendingAckViaRest();
    }, 3000);
  }

  private flushPendingAckViaWs(): void {
    if (!this.socketConnected || !this.socket || !this.pendingAck.size) return;
    const ids = Array.from(this.pendingAck);
    try {
      this.socket.next({ tipo: 'ack', avisos: ids } as any);
      this.pendingAck.clear();
      this.persistPendingAck();
    } catch (err) {
      console.warn('[AvisosStore] No se pudo enviar ack por WS', err);
      this.scheduleAckFlush();
    }
  }

  private flushPendingAckViaRest(): void {
    if (!this.userId || !this.pendingAck.size) return;
    const ids = Array.from(this.pendingAck);
    this.ackRequest?.unsubscribe();
    this.ackRequest = this.avisosService
      .markAsRead(this.userId, ids)
      .pipe(
        catchError((err) => {
          console.error('[AvisosStore] Ack REST fallo', err);
          return of(void 0);
        })
      )
      .subscribe(() => {
        ids.forEach((id) => this.pendingAck.delete(id));
        this.persistPendingAck();
        this.ackRequest = undefined;
      });
  }

  // ======================
  // Persistence helpers
  // ======================
  private persistAvisos(): void {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({ avisos: this.internalAvisos(), pendingAck: Array.from(this.pendingAck) });
      window.localStorage.setItem(CACHE_KEY, payload);
    } catch (err) {
      console.warn('[AvisosStore] No se pudo persistir avisos', err);
    }
  }

  private persistPendingAck(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PENDING_ACK_KEY, JSON.stringify(Array.from(this.pendingAck)));
    } catch (err) {
      console.warn('[AvisosStore] No se pudo persistir pending ack', err);
    }
  }

  private restoreCachedAvisos(): AvisoItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.avisos)) return [];
      return parsed.avisos.map((item: AvisoPayload) => this.decorateAviso(item, item.leido ?? false));
    } catch {
      return [];
    }
  }

  private restorePendingAck(): number[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(PENDING_ACK_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((id) => Number.isFinite(id));
    } catch {
      return [];
    }
  }

  // ======================
  // Routing helpers
  // ======================
  private resolveRoute(aviso: AvisoPayload): string {
    const role = this.auth.getRole();
    const base = isAdmin(role) || isOwner(role) ? '/dashboard' : '/home';
    const meta = aviso.metadata ?? {};
    const eventoId = this.asNumber(meta['eventoId']);
    const ordenPagoId = this.asNumber(meta['ordenPagoId']);
    const contratoId = this.asNumber(meta['contratoId']);

    switch (aviso.tipo) {
      case 'EVENTO_NUEVO':
      case 'EVENTO_ACTUALIZADO':
      case 'EVENTO_CANCELADO':
        if (eventoId) return `${base}/eventos/${eventoId}`;
        break;
      case 'ORDEN_PAGO_GENERADA':
      case 'ORDEN_PAGO_PROX_VENCER':
      case 'ORDEN_PAGO_PAGADA':
        if (ordenPagoId) return `${base}/pagos/${ordenPagoId}`;
        if (contratoId) return `${base}/contratos/${contratoId}`;
        break;
      case 'DOCUMENTO_ASOCIADO':
      case 'DOCUMENTO_APROBADO':
      case 'DOCUMENTO_RECHAZADO':
        if (ordenPagoId) return `${base}/pagos/${ordenPagoId}/documentos`;
        break;
      default:
        break;
    }
    return `${base}/avisos`;
  }

  private asNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private normalizeId(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private formatRelative(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    if (Math.abs(diffMinutes) < 60) {
      if (diffMinutes === 0) return 'Hace instantes';
      return diffMinutes > 0
        ? `Hace ${diffMinutes} min`
        : `En ${Math.abs(diffMinutes)} min`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return diffHours > 0 ? `Hace ${diffHours} h` : `En ${Math.abs(diffHours)} h`;
    }
    const diffDays = Math.round(diffHours / 24);
    return diffDays > 0 ? `Hace ${diffDays} d` : `En ${Math.abs(diffDays)} d`;
  }
}

export function useAvisos(): AvisosFacade {
  return inject(AvisosStoreService);
}

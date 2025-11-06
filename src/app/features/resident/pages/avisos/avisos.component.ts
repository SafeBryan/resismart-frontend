import {
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, Subscription } from 'rxjs';
import { WebSocketSubject } from 'rxjs/webSocket';
import { UtilsModule } from '../../../../utils/utils.module';
import { AvisosService } from '../../../../core/services/avisos.service';
import { ResidentContextService } from '../../../../core/services/resident-context.service';
import { AvisoPayload, AvisoTipo } from '../../../../core/models/aviso.model';
import { ResidentContext } from '../../../../core/models/resident-context.model';
import { RESIDENT_NAV } from '../../resident-nav';

interface AvisoView {
  id: number;
  titulo: string;
  mensaje: string;
  fecha: string;
  categoria: string;
  estado: string;
  responsable: string;
  etiqueta: string;
  payload: AvisoPayload;
}

@Component({
  selector: 'app-resident-avisos',
  standalone: true,
  imports: [CommonModule, RouterModule, UtilsModule],
  templateUrl: './avisos.component.html',
  styleUrl: './avisos.component.css',
})
export class ResidentAvisosComponent implements OnDestroy {
  private readonly avisosService = inject(AvisosService);
  private readonly contextService = inject(ResidentContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly residentNav = RESIDENT_NAV;

  readonly filtros = [
    { label: 'Todos', value: 'todos' },
    { label: 'Mantenimiento', value: 'mantenimiento' },
    { label: 'Eventos', value: 'evento' },
    { label: 'Pagos', value: 'pago' },
    { label: 'Seguridad', value: 'seguridad' },
    { label: 'Documentos', value: 'documento' },
  ];

  readonly filtroSeleccionado = signal<string>('todos');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly context = signal<ResidentContext | null>(null);

  private readonly avisosRaw = signal<AvisoPayload[]>([]);
  readonly avisos = computed<AvisoView[]>(() =>
    this.avisosRaw().map((item) => this.mapAviso(item))
  );

  readonly avisosFiltrados = computed<AvisoView[]>(() => {
    const filtro = this.filtroSeleccionado();
    if (filtro === 'todos') return this.avisos();
    return this.avisos().filter((aviso) => aviso.categoria === filtro);
  });

  private socket?: WebSocketSubject<AvisoPayload>;
  private socketSubscription?: Subscription;
  private socketKey?: string;
  private socketReconnect?: ReturnType<typeof setTimeout>;
  private latestContext: ResidentContext | null = null;

  constructor() {
    toObservable(this.contextService.context)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ctx) => {
        this.latestContext = ctx;
        this.context.set(ctx);
        if (ctx.loading) return;
        this.loadAvisos(ctx);
        this.setupSocket(ctx);
      });
  }

  ngOnDestroy(): void {
    this.cleanupSocket();
  }

  seleccionarFiltro(valor: string): void {
    this.filtroSeleccionado.set(valor);
  }

  private loadAvisos(ctx: ResidentContext): void {
    this.loading.set(true);
    this.error.set(null);

    this.avisosService
      .aggregateStream(ctx.userId, ctx.condominioIds, 50)
      .pipe(
        catchError((err) => {
          console.error('[AvisosComponent] aggregate error', err);
          this.error.set('No se pudieron obtener los avisos.');
          return of([] as AvisoPayload[]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => {
        this.avisosRaw.set(list);
        this.loading.set(false);
      });
  }

  private setupSocket(ctx: ResidentContext): void {
    const key = `${ctx.userId ?? 'anon'}|${(ctx.condominioIds ?? []).join(',')}`;
    if (this.socketKey === key || !ctx.userId) return;

    this.cleanupSocket();

    const socket = this.avisosService.connectSocket({
      condominios: ctx.condominioIds,
    });
    if (!socket) return;

    this.socketKey = key;
    this.socket = socket;
    this.socketSubscription = socket
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          const current = this.avisosRaw();
          const next = [payload, ...current.filter((item) => item.id !== payload.id)];
          this.avisosRaw.set(next.slice(0, 100));
        },
        error: (err) => {
          console.warn('[AvisosComponent] socket cerrado', err);
          this.handleSocketClose();
        },
        complete: () => this.handleSocketClose(),
      });
  }

  private cleanupSocket(): void {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
      this.socketSubscription = undefined;
    }
    if (this.socket) {
      this.socket.complete();
      this.socket = undefined;
    }
    if (this.socketReconnect) {
      clearTimeout(this.socketReconnect);
      this.socketReconnect = undefined;
    }
    this.socketKey = undefined;
  }

  private handleSocketClose(): void {
    this.cleanupSocket();
    const ctx = this.latestContext;
    if (!ctx || ctx.loading) return;
    this.scheduleReconnect(ctx);
  }

  private scheduleReconnect(ctx: ResidentContext): void {
    if (this.socketReconnect) return;
    const delayMs = 5000;
    this.socketReconnect = setTimeout(() => {
      this.socketReconnect = undefined;
      const latest = this.latestContext;
      if (!latest || latest.loading) return;
      this.setupSocket(latest);
    }, delayMs);
  }

  private mapAviso(aviso: AvisoPayload): AvisoView {
    return {
      id: aviso.id,
      titulo: aviso.titulo ?? this.resolveTitulo(aviso.tipo),
      mensaje: aviso.mensaje ?? '',
      fecha: this.formatDate(aviso.emitidoEn),
      categoria: this.resolveCategoria(aviso.tipo),
      estado: aviso.destino ?? 'USUARIO',
      responsable: this.resolveResponsable(aviso),
      etiqueta: this.resolveEtiqueta(aviso.tipo),
      payload: aviso,
    };
  }

  private resolveTitulo(tipo: AvisoTipo | undefined): string {
    if (!tipo) return 'Aviso del condominio';
    return this.capitalize(tipo.replace(/_/g, ' '));
  }

  private resolveCategoria(tipo: AvisoTipo | undefined): string {
    if (!tipo) return 'otros';
    if (tipo.startsWith('EVENTO')) return 'evento';
    if (tipo.startsWith('ORDEN_PAGO')) return 'pago';
    if (tipo.startsWith('DOCUMENTO')) return 'documento';
    if (tipo === 'ALERTA_GENERAL') return 'seguridad';
    return 'mantenimiento';
  }

  private resolveEtiqueta(tipo: AvisoTipo | undefined): string {
    switch (tipo) {
      case 'ALERTA_GENERAL':
      case 'DOCUMENTO_RECHAZADO':
        return 'importante';
      case 'ORDEN_PAGO_PROX_VENCER':
      case 'EVENTO_CANCELADO':
        return 'recordatorio';
      case 'ORDEN_PAGO_GENERADA':
      case 'ORDEN_PAGO_PAGADA':
      case 'DOCUMENTO_APROBADO':
        return 'pago';
      default:
        return 'info';
    }
  }

  private resolveResponsable(aviso: AvisoPayload): string {
    const meta = aviso.metadata ?? {};
    if (typeof meta['responsable'] === 'string') return String(meta['responsable']);
    if (typeof meta['autorizadoPor'] === 'string') return String(meta['autorizadoPor']);
    return 'Administracion del condominio';
  }

  private formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private capitalize(value: string): string {
    if (!value) return '';
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
}



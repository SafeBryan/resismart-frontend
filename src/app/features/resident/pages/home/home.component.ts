import {
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, Subscription } from 'rxjs';
import { WebSocketSubject } from 'rxjs/webSocket';
import { UtilsModule } from '../../../../utils/utils.module';
import { AuthService } from '../../../../core/services/auth.service';
import { AvisosService } from '../../../../core/services/avisos.service';
import { EventosService } from '../../../../core/services/eventos.service';
import { OrdenesPagoService } from '../../../../core/services/ordenes-pago.service';
import { DocumentosService } from '../../../../core/services/documentos.service';
import { ResidentContextService } from '../../../../core/services/resident-context.service';
import { AvisoPayload, AvisoTipo } from '../../../../core/models/aviso.model';
import { EventoDTO } from '../../../../core/models/evento.model';
import { DocumentoDetalleDTO, DocumentoEstado } from '../../../../core/models/documento.model';
import { OrdenPagoEstado, OrdenPagoResumenDTO } from '../../../../core/models/orden-pago.model';
import { ResidentContext } from '../../../../core/models/resident-context.model';
import { RESIDENT_NAV } from '../../resident-nav';

interface AvisoView {
  id: number;
  titulo: string;
  mensaje: string;
  fecha: string;
  etiqueta: string;
  payload: AvisoPayload;
}

interface EventoView {
  id?: number;
  titulo: string;
  fecha: string;
  hora?: string;
  lugar?: string;
  descripcion?: string;
}

interface DocumentoView {
  id: number;
  nombre: string;
  fecha?: string;
  estadoLabel: string;
  estadoClass: string;
}

interface ResumenPagoView {
  id: number;
  concepto: string;
  estadoLabel: string;
  estadoClass: string;
  monto: string;
  venceLabel?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, UtilsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly avisosService = inject(AvisosService);
  private readonly eventosService = inject(EventosService);
  private readonly ordenesPagoService = inject(OrdenesPagoService);
  private readonly documentosService = inject(DocumentosService);
  private readonly contextService = inject(ResidentContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user$ = this.auth.auth$;
  readonly residentNav = RESIDENT_NAV;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly context = signal<ResidentContext | null>(null);

  private readonly avisosRaw = signal<AvisoPayload[]>([]);
  readonly avisos = computed<AvisoView[]>(() => this.mapAvisos(this.avisosRaw()));

  private readonly eventosRaw = signal<EventoDTO[]>([]);
  readonly eventos = computed<EventoView[]>(() => this.mapEventos(this.eventosRaw()));

  private readonly documentosRaw = signal<DocumentoDetalleDTO[]>([]);
  readonly documentos = computed<DocumentoView[]>(() => this.mapDocumentos(this.documentosRaw()));

  private readonly ordenesRaw = signal<OrdenPagoResumenDTO[]>([]);
  readonly resumenPagos = computed<ResumenPagoView[]>(() => this.mapResumenPagos(this.ordenesRaw()));

  avisosOpen = false;

  private socket?: WebSocketSubject<AvisoPayload>;
  private socketSubscription?: Subscription;
  private socketKey?: string;
  private socketReconnect?: ReturnType<typeof setTimeout>;
  private latestContext: ResidentContext | null = null;
  private lastLoadSignature?: string;

  constructor() {
    toObservable(this.contextService.context)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ctx) => {
        this.latestContext = ctx;
        this.context.set(ctx);
        if (ctx.loading) return;
        const signature = this.buildSignature(ctx);
        if (signature !== this.lastLoadSignature) {
          this.lastLoadSignature = signature;
          this.loadDashboard(ctx);
          this.setupSocket(ctx);
        }
      });
  }

  ngOnDestroy(): void {
    this.cleanupSocket();
  }

  toggleAvisos(event: MouseEvent): void {
    event.stopPropagation();
    this.avisosOpen = !this.avisosOpen;
  }

  @HostListener('document:click')
  closeAvisos(): void {
    if (this.avisosOpen) {
      this.avisosOpen = false;
    }
  }

  formatEstado(estado?: string | null): string {
    const value = (estado ?? '').toUpperCase();
    switch (value) {
      case 'APROBADO':
        return 'ok';
      case 'PENDIENTE':
        return 'warn';
      case 'RECHAZADO':
        return 'danger';
      default:
        return '';
    }
  }

  private loadDashboard(ctx: ResidentContext): void {
    const userId = ctx.userId ?? null;
    const condominioIds = ctx.condominioIds ?? [];
    const contratoIds = (ctx.contratos ?? [])
      .map((c) => c.id)
      .filter((id): id is number => id != null);
    const contratoActivoId = ctx.contratoActivo?.id ?? null;

    this.loading.set(true);
    this.error.set(null);

    const data$ = forkJoin({
      avisos: this.avisosService.aggregateStream(userId, condominioIds, 25),
      eventos:
        condominioIds.length > 0
          ? forkJoin(condominioIds.map((id) => this.eventosService.listByCondominio(id))).pipe(
              map((chunks) => chunks.flat())
            )
          : of<EventoDTO[]>([]),
      ordenes:
        contratoIds.length > 0
          ? this.ordenesPagoService.listByContratos(contratoIds)
          : of<OrdenPagoResumenDTO[]>([]),
      documentos:
        contratoActivoId != null
          ? this.documentosService.list({
              idContrato: contratoActivoId,
              size: 5,
              sortDir: 'DESC',
              sortBy: 'fechaSubida',
              flat: true,
            })
          : of<DocumentoDetalleDTO[]>([]),
    }).pipe(
      catchError((err) => {
        console.error('[HomeComponent] loadDashboard error', err);
        this.error.set('No se pudo cargar la informacion del panel.');
        return of({
          avisos: [] as AvisoPayload[],
          eventos: [] as EventoDTO[],
          ordenes: [] as OrdenPagoResumenDTO[],
          documentos: [] as DocumentoDetalleDTO[],
        });
      })
    );

    data$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ avisos, eventos, ordenes, documentos }) => {
        this.avisosRaw.set(avisos);
        this.eventosRaw.set(eventos);
        this.ordenesRaw.set(ordenes);
        this.documentosRaw.set(documentos);
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
          this.avisosRaw.set(next.slice(0, 30));
        },
        error: (err) => {
          console.warn('[HomeComponent] Socket cerrado', err);
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

  private buildSignature(ctx: ResidentContext): string {
    const contracts = (ctx.contratos ?? []).map((c) => c.id).join(',');
    const condos = (ctx.condominioIds ?? []).join(',');
    return `${ctx.userId ?? 'anon'}|${condos}|${contracts}`;
  }

  private mapAvisos(list: AvisoPayload[]): AvisoView[] {
    return [...(list ?? [])]
      .sort((a, b) => (b.emitidoEn || '').localeCompare(a.emitidoEn || ''))
      .map((item) => ({
        id: item.id,
        titulo: item.titulo ?? this.resolveTitulo(item.tipo),
        mensaje: item.mensaje ?? '',
        fecha: this.formatDate(item.emitidoEn),
        etiqueta: this.resolveAvisoEtiqueta(item.tipo),
        payload: item,
      }));
  }

  private mapEventos(list: EventoDTO[]): EventoView[] {
    return [...(list ?? [])]
      .sort((a, b) => (a.fechaInicio || '').localeCompare(b.fechaInicio || ''))
      .map((evento) => ({
        id: evento.id,
        titulo: evento.titulo ?? 'Evento del condominio',
        fecha: this.formatDay(evento.fechaInicio),
        hora: this.formatHour(evento.fechaInicio),
        lugar: evento.lugar ?? 'Por definir',
        descripcion: evento.descripcion ?? '',
      }))
      .slice(0, 4);
  }

  private mapDocumentos(list: DocumentoDetalleDTO[]): DocumentoView[] {
    return [...(list ?? [])]
      .sort((a, b) => (b.fechaSubida || '').localeCompare(a.fechaSubida || ''))
      .map((doc) => {
        const estado = doc.estadoValidacion ?? 'PENDIENTE';
        return {
          id: doc.idDocumento,
          nombre: doc.nombreOriginal ?? `Documento #${doc.idDocumento}`,
          fecha: this.formatDate(doc.fechaSubida),
          estadoLabel: this.formatSentenceCase(estado),
          estadoClass: this.formatEstado(estado),
        };
      })
      .slice(0, 5);
  }

  private mapResumenPagos(list: OrdenPagoResumenDTO[]): ResumenPagoView[] {
    return [...(list ?? [])]
      .sort((a, b) => (b.fechaVencimiento || '').localeCompare(a.fechaVencimiento || ''))
      .map((orden) => {
        const estado = orden.estado ?? 'PENDIENTE';
        return {
          id: orden.id,
          concepto: this.formatPeriodo(orden.periodo),
          estadoLabel: this.formatSentenceCase(estado),
          estadoClass: this.mapOrdenEstadoClass(estado),
          monto: this.formatCurrency(orden.monto),
          venceLabel: this.formatRelative(orden.fechaVencimiento),
        };
      })
      .slice(0, 3);
  }

  private resolveTitulo(tipo: AvisoTipo | undefined): string {
    if (!tipo) return 'Aviso del condominio';
    return this.formatSentenceCase(tipo.replace(/_/g, ' ').toLowerCase());
  }

  private resolveAvisoEtiqueta(tipo: AvisoTipo | undefined): string {
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

  private mapOrdenEstadoClass(estado: OrdenPagoEstado | string): string {
    const value = (estado ?? '').toString().toUpperCase();
    switch (value) {
      case 'PAGADA':
        return 'ok';
      case 'PENDIENTE':
        return 'warn';
      case 'VENCIDA':
      case 'EN_MORA':
        return 'danger';
      default:
        return '';
    }
  }

  private formatSentenceCase(value: string): string {
    if (!value) return '';
    const lower = value.toLowerCase().replace(/_/g, ' ');
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  private formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private formatDay(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  private formatHour(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private formatPeriodo(periodo?: string | null): string {
    if (!periodo) return 'Periodo sin definir';
    const normalized = periodo.length === 7 ? `${periodo}-01` : periodo;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return periodo;
    return new Intl.DateTimeFormat('es-PE', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private formatCurrency(value?: number | null): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value ?? 0);
  }

  private formatRelative(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return `Vence en ${diffDays} dias`;
    if (diffDays === 1) return 'Vence manana';
    if (diffDays === 0) return 'Vence hoy';
    if (diffDays === -1) return 'Vencio ayer';
    return `Vencio hace ${Math.abs(diffDays)} dias`;
  }
}

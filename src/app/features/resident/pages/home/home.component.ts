import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { catchError, forkJoin, map, of } from "rxjs";
import { UtilsModule } from "../../../../utils/utils.module";
import { AuthService } from "../../../../core/services/auth.service";
import { EventosService } from "../../../../core/services/eventos.service";
import { OrdenesPagoService } from "../../../../core/services/ordenes-pago.service";
import { DocumentosService } from "../../../../core/services/documentos.service";
import { ResidentContextService } from "../../../../core/services/resident-context.service";
import { AvisoTipo } from "../../../../core/models/aviso.model";
import { EventoDTO } from "../../../../core/models/evento.model";

import {
  DocumentoDetalleDTO,
  DocumentoEstado,
  DocumentoListItem,
} from "../../../../core/models/documento.model";

import {
  OrdenPagoEstado,
  OrdenPagoResumenDTO,
} from "../../../../core/models/orden-pago.model";
import { ResidentContext } from "../../../../core/models/resident-context.model";
import {
  useAvisos,
  AvisoItem,
} from "../../../../core/services/avisos-store.service";
import { RESIDENT_NAV } from "../../resident-nav";
import { ToastService } from "../../../../core/services/toast.service";

interface AvisoView {
  id: number;
  titulo: string;
  mensaje: string;
  fecha: string;
  etiqueta: string;
  leido: boolean;
  payload: AvisoItem;
  source: AvisoItem;
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
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterModule, UtilsModule],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly eventosService = inject(EventosService);
  private readonly ordenesPagoService = inject(OrdenesPagoService);
  private readonly documentosService = inject(DocumentosService);
  private readonly contextService = inject(ResidentContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  readonly avisosFacade = useAvisos();

  readonly user$ = this.auth.auth$;
  readonly residentNav = RESIDENT_NAV;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly context = signal<ResidentContext | null>(null);
  readonly asistencia = signal<Record<number, "CONFIRMADO" | "RECHAZADO">>({});

  readonly avisosDropdown = computed<AvisoView[]>(() =>
    this.avisosFacade
      .avisos()
      .slice(0, 5)
      .map((aviso) => this.mapAviso(aviso))
  );

  private readonly eventosRaw = signal<EventoDTO[]>([]);
  readonly eventos = computed<EventoView[]>(() =>
    this.mapEventos(this.eventosRaw())
  );

  // Ahora soporta ambos tipos
  private readonly documentosRaw = signal<
    (DocumentoDetalleDTO | DocumentoListItem)[]
  >([]);

  readonly documentos = computed<DocumentoView[]>(() =>
    this.mapDocumentos(this.documentosRaw())
  );

  private readonly ordenesRaw = signal<OrdenPagoResumenDTO[]>([]);
  readonly resumenPagos = computed<ResumenPagoView[]>(() =>
    this.mapResumenPagos(this.ordenesRaw())
  );

  avisosOpen = false;

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
        }
      });
  }

  toggleAvisos(event: MouseEvent): void {
    event.stopPropagation();
    this.avisosOpen = !this.avisosOpen;
    if (this.avisosOpen) this.markDropdownAsRead();
  }

  @HostListener("document:click")
  closeAvisos(): void {
    if (this.avisosOpen) this.avisosOpen = false;
  }

  onAvisoClick(aviso: AvisoView): void {
    if (!aviso) return;
    this.avisosFacade.navigate(aviso.source);
    this.avisosOpen = false;
  }

  readonly trackByAviso = (_: number, aviso: AvisoView) => aviso.id;

  private markDropdownAsRead(): void {
    const ids = this.avisosDropdown()
      .filter((item) => !item.leido)
      .map((item) => item.id);

    if (ids.length) this.avisosFacade.markAllVisible(ids);
  }

  getAsistenciaLabel(id: number | undefined) {
    if (id == null) return undefined;
    return this.asistencia()[id];
  }

  registrarAsistencia(evento: EventoView, estado: "CONFIRMADO" | "RECHAZADO") {
    const id = evento.id;
    if (!id) return;

    this.eventosService.confirmarAsistencia(id, { estado }).subscribe({
      next: () => {
        this.asistencia.update((map) => ({ ...map, [id]: estado }));
        this.toast.success(
          estado === "CONFIRMADO"
            ? "Asistencia confirmada."
            : "Has indicado que no asistirás."
        );
      },
      error: () => this.toast.error("No se pudo registrar la asistencia."),
    });
  }

  formatEstado(estado?: string | null): string {
    const value = (estado ?? "").toUpperCase();
    switch (value) {
      case "APROBADO":
        return "ok";
      case "PENDIENTE":
        return "warn";
      case "RECHAZADO":
        return "danger";
      default:
        return "";
    }
  }

  private loadDashboard(ctx: ResidentContext) {
    const condominioIds = ctx.condominioIds ?? [];

    const contratoIds = (ctx.contratos ?? [])
      .map((c) => c.id)
      .filter((id): id is number => id != null);

    const contratoActivoId = ctx.contratoActivo?.id ?? null;

    this.loading.set(true);
    this.error.set(null);

    const data$ = forkJoin({
      eventos:
        condominioIds.length > 0
          ? forkJoin(
              condominioIds.map((id) =>
                this.eventosService.listByCondominio(id)
              )
            ).pipe(map((chunks) => chunks.flat()))
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
              sortDir: "DESC",
              sortBy: "fechaSubida",
              flat: true,
              withLinks: true,
            })
          : of<(DocumentoDetalleDTO | DocumentoListItem)[]>([]),
    }).pipe(
      catchError((err) => {
        console.error("[HomeComponent] loadDashboard error", err);
        this.error.set("No se pudo cargar la informacion del panel.");
        return of({
          eventos: [] as EventoDTO[],
          ordenes: [] as OrdenPagoResumenDTO[],
          documentos: [] as (DocumentoDetalleDTO | DocumentoListItem)[],
        });
      })
    );

    data$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ eventos, ordenes, documentos }) => {
        this.eventosRaw.set(eventos);
        this.ordenesRaw.set(ordenes);
        this.documentosRaw.set(documentos);
        this.loading.set(false);
      });
  }

  private buildSignature(ctx: ResidentContext): string {
    const contracts = (ctx.contratos ?? []).map((c) => c.id).join(",");
    const condos = (ctx.condominioIds ?? []).join(",");
    return `${ctx.userId ?? "anon"}|${condos}|${contracts}`;
  }

  private mapAviso(aviso: AvisoItem): AvisoView {
    return {
      id: aviso.id,
      titulo: aviso.titulo ?? this.resolveTitulo(aviso.tipo),
      mensaje: aviso.mensaje ?? "",
      fecha: aviso.relativeEmitido || this.formatDate(aviso.emitidoEn),
      etiqueta: this.resolveAvisoEtiqueta(aviso.tipo),
      leido: !!aviso.leido,
      payload: aviso,
      source: aviso,
    };
  }

  private mapEventos(list: EventoDTO[]): EventoView[] {
    return [...(list ?? [])]
      .sort((a, b) => (a.fechaInicio || "").localeCompare(b.fechaInicio || ""))
      .map((evento) => ({
        id: evento.id,
        titulo: evento.titulo ?? "Evento del condominio",
        fecha: this.formatDay(evento.fechaInicio),
        hora: this.formatHour(evento.fechaInicio),
        lugar: evento.lugar ?? "Por definir",
        descripcion: evento.descripcion ?? "",
      }))
      .slice(0, 4);
  }

  /** ⭐ SOPORTA DocumentoDetalleDTO y DocumentoListItem */
  private mapDocumentos(
    list: (DocumentoDetalleDTO | DocumentoListItem)[]
  ): DocumentoView[] {
    return [...(list ?? [])]
      .sort((a, b) => {
        const fechaA =
          "idDocumento" in a ? a.fechaSubida ?? "" : a.creadoEn ?? "";
        const fechaB =
          "idDocumento" in b ? b.fechaSubida ?? "" : b.creadoEn ?? "";
        return fechaB.localeCompare(fechaA);
      })
      .map((doc) => {
        const isDetalle = "idDocumento" in doc;

        const id = isDetalle ? doc.idDocumento : doc.id;

        const nombre = isDetalle
          ? doc.nombreOriginal ?? `Documento #${id}`
          : doc.nombre ?? `Documento #${id}`;

        const fecha = isDetalle ? doc.fechaSubida : doc.creadoEn;

        const estado = (doc as any).estadoValidacion ?? "PENDIENTE";

        return {
          id,
          nombre,
          fecha: this.formatDate(fecha),
          estadoLabel: this.formatSentenceCase(estado),
          estadoClass: this.formatEstado(estado),
        };
      })
      .slice(0, 5);
  }

  private mapResumenPagos(list: OrdenPagoResumenDTO[]): ResumenPagoView[] {
    return [...(list ?? [])]
      .sort((a, b) =>
        (b.fechaVencimiento || "").localeCompare(a.fechaVencimiento || "")
      )
      .map((orden) => {
        const estado = orden.estado ?? "PENDIENTE";
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
    if (!tipo) return "Aviso del condominio";
    return this.formatSentenceCase(tipo.replace(/_/g, " ").toLowerCase());
  }

  private resolveAvisoEtiqueta(tipo: AvisoTipo | undefined): string {
    switch (tipo) {
      case "ALERTA_GENERAL":
      case "DOCUMENTO_RECHAZADO":
        return "importante";
      case "ORDEN_PAGO_PROX_VENCER":
      case "EVENTO_CANCELADO":
        return "recordatorio";
      case "ORDEN_PAGO_GENERADA":
      case "ORDEN_PAGO_PAGADA":
      case "DOCUMENTO_APROBADO":
        return "pago";
      default:
        return "info";
    }
  }

  private mapOrdenEstadoClass(estado: OrdenPagoEstado | string): string {
    const value = (estado ?? "").toString().toUpperCase();
    switch (value) {
      case "PAGADA":
        return "ok";
      case "PENDIENTE":
        return "warn";
      case "VENCIDA":
      case "EN_MORA":
        return "danger";
      default:
        return "";
    }
  }

  private formatSentenceCase(value: string): string {
    if (!value) return "";
    const lower = value.toLowerCase().replace(/_/g, " ");
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  private formatDate(value?: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  private formatDay(value?: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
    }).format(date);
  }

  private formatHour(value?: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  private formatPeriodo(periodo?: string | null): string {
    if (!periodo) return "Periodo sin definir";

    const normalized = periodo.length === 7 ? `${periodo}-01` : periodo;

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return periodo;

    return new Intl.DateTimeFormat("es-PE", {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  private formatCurrency(value?: number | null): string {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value ?? 0);
  }

  private formatRelative(value?: string | null): string {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 1) return `Vence en ${diffDays} dias`;
    if (diffDays === 1) return "Vence mañana";
    if (diffDays === 0) return "Vence hoy";
    if (diffDays === -1) return "Venció ayer";

    return `Venció hace ${Math.abs(diffDays)} dias`;
  }
}

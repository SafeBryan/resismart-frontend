import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { catchError, forkJoin, of, switchMap } from "rxjs";
import { UtilsModule } from "../../../../utils/utils.module";
import { RESIDENT_NAV } from "../../resident-nav";

import { ResidentContextService } from "../../../../core/services/resident-context.service";
import { ContratoService } from "../../../../core/services/contrato.service";
import { OrdenesPagoService } from "../../../../core/services/ordenes-pago.service";
import { DocumentosService } from "../../../../core/services/documentos.service";

import { ResidentContext } from "../../../../core/models/resident-context.model";
import {
  ContratoDetalle,
  ContratoResumen,
} from "../../../../core/models/contrato.model";
import { OrdenPagoResumenDTO } from "../../../../core/models/orden-pago.model";
import {
  DocumentoDetalleDTO,
  DocumentoListItem,
} from "../../../../core/models/documento.model";
import { ContratoDetalleComponent } from "./components/contrato-detalle/contrato-detalle.component";
import { MatIconModule } from "@angular/material/icon";

interface ContratoActualView {
  id: number;
  nombre: string;
  vigencia: string;
  estado: string;
  estadoClass: string;
  monto: string;
  descripcion: string;
  proximoPago?: string;
}

interface RecordatorioView {
  titulo: string;
  fecha: string;
  estado: string;
  estadoClass: string;
  detalle: string;
}

interface DocumentoView {
  id: number;
  nombre: string;
  tipo: string;
  fecha: string;
  accion: string;
}

@Component({
  selector: "app-resident-contratos",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    UtilsModule,
    ContratoDetalleComponent,
    MatIconModule,
  ],
  templateUrl: "./contratos.component.html",
  styleUrls: ["./contratos.component.css"],
})
export class ResidentContratosComponent {
  // Servicios
  private readonly contextService = inject(ResidentContextService);
  private readonly contratoService = inject(ContratoService);
  private readonly ordenesService = inject(OrdenesPagoService);
  private readonly documentosService = inject(DocumentosService);
  private readonly destroyRef = inject(DestroyRef);

  // UI/estado
  readonly residentNav = RESIDENT_NAV;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly context = signal<ResidentContext | null>(null);

  // Datos crudos
  private readonly contratosRaw = signal<ContratoResumen[]>([]);
  private readonly contratoDetalle = signal<ContratoDetalle | null>(null);
  private readonly ordenesRaw = signal<OrdenPagoResumenDTO[]>([]);
  private readonly documentosRaw = signal<
    (DocumentoDetalleDTO | DocumentoListItem)[]
  >([]);

  // ViewModels
  readonly contratoActual = computed<ContratoActualView | null>(() => {
    const detalle = this.contratoDetalle();
    if (!detalle) return null;

    // Fallbacks por si el detalle viene sin campos enriquecidos
    const contratoResumen = (this.contratosRaw() || []).find(
      (c) => Number(c.id) === Number(detalle.id)
    );
    const ctx = this.context();

    const unidadNumero =
      detalle.unidadNumero ??
      contratoResumen?.numeroUnidad ??
      (detalle.idUnidad != null ? `#${detalle.idUnidad}` : "—");

    const residenteNombre =
      detalle.residenteNombre ??
      contratoResumen?.nombreResidente ??
      ([
        ctx?.residente && (ctx.residente as any)?.usuario?.nombres,
        ctx?.residente && (ctx.residente as any)?.usuario?.apellidos,
      ]
        .filter(Boolean)
        .join(" ") ||
        "—");

    const descripcion = `Contrato asociado a la unidad ${unidadNumero} para el residente ${residenteNombre}.`;

    const proximoPendiente = (this.ordenesRaw() || [])
      .filter((o) => (o.estado || "").toUpperCase() === "PENDIENTE")
      .sort((a, b) =>
        (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || "")
      )[0];

    return {
      id: detalle.id,
      nombre: `Contrato ${detalle.id}`,
      vigencia: this.formatRango(detalle.fechaInicio, detalle.fechaFin),
      estado: this.formatSentenceCase(detalle.estado as any),
      estadoClass: this.statusClass(detalle.estado as any),
      monto: this.formatCurrency(Number(detalle.monto)) + " / mes",
      descripcion,
      proximoPago: proximoPendiente
        ? `Próximo pago ${this.formatDate(proximoPendiente.fechaVencimiento)}`
        : undefined,
    };
  });

  readonly recordatorios = computed<RecordatorioView[]>(() =>
    this.ordenesRaw()
      .map((orden) => ({
        titulo: `Cuota ${this.formatPeriodo(orden.periodo)}`,
        fecha: this.formatDate(orden.fechaVencimiento),
        estado: this.formatSentenceCase(orden.estado),
        estadoClass: this.statusClass(orden.estado),
        detalle: `Monto a pagar: ${this.formatCurrency(orden.monto)}.`,
      }))
      .slice(0, 5)
  );

  readonly documentos = computed<DocumentoView[]>(() =>
    this.mapDocumentos(this.documentosRaw())
  );

  // Tips fijos
  readonly tips = [
    {
      icon: "check_circle",
      titulo: "Verifica tu información",
      descripcion:
        'Mantén tus datos personales actualizados en la sección "Mis Datos".',
    },
    {
      icon: "cloud_upload",
      titulo: "Sube tus comprobantes",
      descripcion:
        "Guarda una copia digital de cada pago mensual para evitar contratiempos.",
    },
    {
      icon: "support_agent",
      titulo: "Contacta a administración",
      descripcion:
        "Si necesitas renegociar los términos, agenda una cita con soporte.",
    },
  ];

  constructor() {
    // Reacciona a cambios del contexto (usuario logueado)
    toObservable(this.contextService.context)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(
        switchMap((ctx) => {
          this.context.set(ctx);
          if (ctx.loading) {
            this.loading.set(true);
            return of(null);
          }

          const residenteId =
            (ctx.residente as any)?.id_Cliente ??
            (ctx.residente as any)?.idCliente ??
            null;

          if (!residenteId) {
            this.loading.set(false);
            this.error.set("No se encontró el residente del usuario actual.");
            this.resetData();
            return of(null);
          }

          // Si ya tenemos contratos en el contexto, úsalos; si no, consulta por residente
          if (ctx.contratos && ctx.contratos.length) {
            this.contratosRaw.set(ctx.contratos);
            const elegido = this.pickContratoId(ctx.contratos);
            return of(elegido);
          } else {
            return this.contratoService
              .listByResidente(Number(residenteId))
              .pipe(
                catchError(() => of<ContratoResumen[]>([])),
                switchMap((contratos) => {
                  this.contratosRaw.set(contratos || []);
                  const elegido = this.pickContratoId(contratos || []);
                  return of(elegido);
                })
              );
          }
        })
      )
      .subscribe((contratoId) => {
        if (!contratoId) {
          this.loading.set(false);
          this.resetData();
          return;
        }

        // Defensa: contrato debe pertenecer a la lista del residente
        const pertenece = (this.contratosRaw() || []).some(
          (c) => Number(c.id) === Number(contratoId)
        );
        if (!pertenece) {
          this.loading.set(false);
          this.resetData();
          this.error.set("El contrato no pertenece al residente actual.");
          return;
        }

        this.loadContrato(Number(contratoId));
      });
  }

  /** Elige contrato ACTIVO; si no hay, el primero de la lista. */
  private pickContratoId(contratos: ContratoResumen[]): number | null {
    if (!contratos?.length) return null;
    const activo =
      contratos.find(
        (c) => (c.estado ?? "").toString().toUpperCase() === "ACTIVO"
      ) ?? null;
    return Number((activo ?? contratos[0]).id) || null;
  }

  private resetData(): void {
    this.contratoDetalle.set(null);
    this.ordenesRaw.set([]);
    this.documentosRaw.set([]);
  }

  private loadContrato(contratoId: number): void {
    this.loading.set(true);
    this.error.set(null);

    const detalle$ = this.contratoService.getById(contratoId).pipe(
      catchError((err) => {
        console.error("[ResidentContratos] detalle error", err);
        this.error.set("No se pudo obtener el detalle del contrato.");
        return of(null);
      })
    );

    const ordenes$ = this.ordenesService.listByContrato(contratoId).pipe(
      catchError((err) => {
        console.warn("[ResidentContratos] ordenes error", err);
        return of<OrdenPagoResumenDTO[]>([]);
      })
    );

    const documentos$ = this.documentosService
      .list({
        idContrato: contratoId,
        size: 5,
        sortBy: "fechaSubida",
        sortDir: "DESC",
        flat: true,
        withLinks: true,
      })
      .pipe(
        catchError((err) => {
          console.warn("[ResidentContratos] documentos error", err);
          return of<(DocumentoDetalleDTO | DocumentoListItem)[]>([]);
        })
      );

    forkJoin([detalle$, ordenes$, documentos$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([detalle, ordenes, documentos]) => {
        this.contratoDetalle.set(detalle);
        this.ordenesRaw.set(ordenes ?? []);
        this.documentosRaw.set(documentos ?? []);
        this.loading.set(false);
      });
  }

  onSolicitarRenovacion(contratoId: number): void {
    const nueva = prompt("Nueva fecha de fin (YYYY-MM-DD):");
    if (!nueva) return;
    this.loading.set(true);
    this.error.set(null);
    this.contratoService
      .renovar(contratoId, { nuevaFechaFin: nueva })
      .subscribe({
        next: () => this.contextService.refresh(),
        error: () => {
          this.error.set("No se pudo solicitar la renovación.");
          this.loading.set(false);
        },
      });
  }

  /** Intenta detectar un PDF de contrato; si no hay, descarga el primer doc de la lista. */
  onDescargarContratoPdf(contratoId: number): void {
    const docs = this.documentos();
    const candidato =
      docs.find((d) => (d.nombre || "").toLowerCase().includes("contrato")) ||
      docs[0];

    if (!candidato) {
      this.error.set("No hay documentos del contrato para descargar.");
      return;
    }
    this.onDescargarDoc(candidato.id, candidato.nombre);
  }

  /** Descarga cualquier documento por id usando GET /documentos/{id}/contenido (Blob). */
  onDescargarDoc(idDocumento: number, nombre: string): void {
    this.loading.set(true);
    this.documentosService.descargarContenido(idDocumento).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre || `documento-${idDocumento}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No se pudo descargar el documento.");
        this.loading.set(false);
      },
    });
  }

  // ===== Map de documentos (DetalleDTO | ListItem) → DocumentoView =====
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
        const tipoRaw = (doc as any).tipo ?? "OTRO";
        const fecha = isDetalle ? doc.fechaSubida : doc.creadoEn;

        return {
          id,
          nombre,
          tipo: String(tipoRaw),
          fecha: this.formatDate(fecha as any),
          accion: "Descargar",
        };
      })
      .slice(0, 5);
  }

  // ===== Helpers de formato =====
  statusClass(value: string): string {
    const normalized = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    return normalized || "pendiente";
  }

  private formatRango(inicio: string, fin?: string | null): string {
    const inicioFmt = this.formatDate(inicio);
    const finFmt = fin ? this.formatDate(fin) : "sin fecha de término";
    return `${inicioFmt} - ${finFmt}`;
  }

  private formatDate(value?: string | null): string {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  private formatPeriodo(periodo?: string | null): string {
    if (!periodo) return "Periodo no definido";
    const normalized = periodo.length === 7 ? `${periodo}-01` : periodo;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return periodo;
    return new Intl.DateTimeFormat("es-EC", {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  private formatCurrency(value?: number | null): string {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value ?? 0);
  }

  private formatSentenceCase(value?: string | null): string {
    if (!value) return "";
    const lower = value.toLowerCase().replace(/_/g, " ");
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  // Modal de detalle
  showDetalle = signal(false);
  detalleId = signal<number | null>(null);

  onVerDetalle(contratoId: number) {
    this.detalleId.set(contratoId);
    this.showDetalle.set(true);
  }

  onCerrarDetalle() {
    this.showDetalle.set(false);
    this.detalleId.set(null);
  }
}

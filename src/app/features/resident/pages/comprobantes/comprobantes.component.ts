import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { catchError, forkJoin, of } from "rxjs";

import { UtilsModule } from "../../../../utils/utils.module";
import { RESIDENT_NAV } from "../../resident-nav";

import { ResidentContextService } from "../../../../core/services/resident-context.service";
import { OrdenesPagoService } from "../../../../core/services/ordenes-pago.service";
import { DocumentosService } from "../../../../core/services/documentos.service";
import { ContratoService } from "../../../../core/services/contrato.service";

import { ResidentContext } from "../../../../core/models/resident-context.model";
import { OrdenPagoResumenDTO } from "../../../../core/models/orden-pago.model";
import { ContratoDetalle } from "../../../../core/models/contrato.model";
import { DocumentoListItem } from "../../../../core/models/documento.model";

interface OrdenView {
  id: number;
  concepto: string;
  periodo: string;
  monto: string;
  estado: string;
  clase: string;
  vence?: string;
}

interface DocumentoResumenContrato {
  titulo: string;
  descripcion: string;
}

interface OrdenSelectOption {
  id: number;
  label: string;
}

interface ComprobanteView {
  id: number;
  nombre: string;
  estado: string;
  clase: string;
  fecha: string;
  size: string;
  url?: string | null;
}

@Component({
  selector: "app-resident-comprobantes",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UtilsModule],
  templateUrl: "./comprobantes.component.html",
  styleUrl: "./comprobantes.component.css",
})
export class ResidentComprobantesComponent {
  private readonly contextService = inject(ResidentContextService);
  private readonly ordenesService = inject(OrdenesPagoService);
  private readonly documentosService = inject(DocumentosService);
  private readonly contratoService = inject(ContratoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly residentNav = RESIDENT_NAV;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly context = signal<ResidentContext | null>(null);

  private readonly contratoDetalle = signal<ContratoDetalle | null>(null);
  private readonly ordenesRaw = signal<OrdenPagoResumenDTO[]>([]);
  private readonly documentosRaw = signal<DocumentoListItem[]>([]);
  private readonly selectedFile = signal<File | null>(null);
  private readonly selectedOrdenIdSignal = signal<number | null>(null);

  // =============================
  // Resumen contrato
  // =============================
  readonly resumenContrato = computed<DocumentoResumenContrato | null>(() => {
    const contrato = this.contratoDetalle();
    if (!contrato) return null;
    return {
      titulo: `Contrato #${contrato.id}`,
      descripcion: `Unidad ${
        contrato.unidadNumero
      }, vigente desde ${this.formatDate(contrato.fechaInicio)}${
        contrato.fechaFin ? ` hasta ${this.formatDate(contrato.fechaFin)}` : ""
      }.`,
    };
  });

  // =============================
  // Órdenes de pago (vista)
  // =============================
  readonly pendientes = computed<OrdenView[]>(() =>
    this.ordenesRaw().map((orden) => ({
      id: orden.id,
      concepto: `Orden ${orden.id}`,
      periodo: this.formatPeriodo(orden.periodo),
      monto: this.formatCurrency(orden.monto),
      estado: this.formatSentenceCase(orden.estado),
      clase: this.estadoClass(orden.estado),
      vence: orden.fechaVencimiento
        ? `Vence ${this.formatDate(orden.fechaVencimiento)}`
        : undefined,
    }))
  );

  readonly ordenesDisponibles = computed<OrdenSelectOption[]>(() =>
    this.ordenesRaw()
      .filter((orden) => orden.estado === "PENDIENTE")
      .map((orden) => ({
        id: orden.id,
        label: `${this.formatPeriodo(orden.periodo)} - ${this.formatCurrency(
          orden.monto
        )}`,
      }))
  );

  // =============================
  // Comprobantes (desde /documentos)
  // =============================
  readonly comprobantes = computed<ComprobanteView[]>(() =>
    this.documentosRaw().map((doc) => ({
      id: doc.id,
      nombre: doc.nombre,
      estado: this.formatSentenceCase(doc.estadoValidacion ?? "PENDIENTE"),
      clase: this.estadoDocClass(doc.estadoValidacion),
      fecha: doc.creadoEn ? this.formatDate(doc.creadoEn) : "Sin fecha",
      size: this.formatSize(doc.sizeBytes ?? 0),
      url: doc.urlContenido,
    }))
  );

  readonly selectedFileName = computed(() => this.selectedFile()?.name ?? "");

  form = {
    operacion: "",
    monto: "",
    descripcion: "",
  };

  readonly pasos = [
    {
      titulo: "1. Realiza tu pago",
      descripcion:
        "Puedes usar transferencia bancaria, depósito o pago en línea según las opciones vigentes.",
    },
    {
      titulo: "2. Registra los datos",
      descripcion:
        "Completa el número de operación, monto y medio de pago para identificar tu comprobante.",
    },
    {
      titulo: "3. Adjunta el archivo",
      descripcion:
        "Sube el comprobante en formato PDF o imagen legible. Tamaño máximo recomendado: 5 MB.",
    },
    {
      titulo: "4. Envía y espera la revisión",
      descripcion:
        "El equipo de administración validará la información y te notificará por correo.",
    },
  ];

  constructor() {
    toObservable(this.contextService.context)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ctx) => {
        this.context.set(ctx);
        if (ctx.loading) return;

        const contratoId =
          ctx.contratoActivo?.id ??
          (ctx.contratos && ctx.contratos.length ? ctx.contratos[0].id : null);

        if (!contratoId) {
          this.loading.set(false);
          this.error.set("No se encontraron contratos asociados.");
          return;
        }

        this.selectedOrdenIdSignal.set(null);
        this.loadData(contratoId);
      });
  }

  // =============================
  // Binding para el select de orden
  // =============================

  get selectedOrdenIdModel(): number | null {
    return this.selectedOrdenIdSignal();
  }

  set selectedOrdenIdModel(value: number | null) {
    this.selectedOrdenIdSignal.set(value != null ? Number(value) : null);
  }

  // =============================
  // File input
  // =============================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files ? input.files[0] : null;
    this.selectedFile.set(file);
    this.success.set(null);
  }

  // =============================
  // Submit
  // =============================

  onSubmit(): void {
    const file = this.selectedFile();
    const ctx = this.context();

    if (!ctx?.userId) {
      this.error.set("No se pudo identificar al usuario autenticado.");
      return;
    }

    const userId = Number(ctx.userId);
    if (Number.isNaN(userId)) {
      this.error.set("Identificador de usuario inválido.");
      return;
    }

    if (!file) {
      this.error.set("Selecciona un archivo antes de guardar.");
      return;
    }

    const contratoId =
      ctx.contratoActivo?.id ??
      (ctx.contratos && ctx.contratos.length ? ctx.contratos[0].id : null);

    if (!contratoId) {
      this.error.set("No hay contrato seleccionado.");
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const formData = new FormData();
    formData.append("tipo", "COMPROBANTE");
    formData.append("archivo", file, file.name);
    formData.append("nombreOriginal", file.name);
    formData.append("mimeType", file.type || "application/octet-stream");
    formData.append("sizeBytes", String(file.size));
    formData.append("subidoPor", String(userId));

    const ordenId = this.selectedOrdenIdSignal();

    this.documentosService
      .upload(formData, userId)
      .pipe(
        catchError((err) => {
          console.error("[ComprobantesComponent] upload error", err);
          this.error.set("No se pudo subir el comprobante.");
          this.saving.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((uploadResponse) => {
        if (!uploadResponse) return;

        const asociar$ =
          ordenId != null
            ? this.documentosService
                .asociar(
                  {
                    idDocumento: uploadResponse.idDocumento,
                    idOrden: ordenId,
                    tipoRelacion: "COMPROBANTE",
                  },
                  userId
                )
                .pipe(
                  catchError((err) => {
                    console.warn("[ComprobantesComponent] asociar error", err);
                    return of(void 0);
                  })
                )
            : of(void 0);

        asociar$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
          this.success.set("Comprobante guardado correctamente.");
          this.saving.set(false);
          this.selectedFile.set(null);
          this.form = {
            operacion: "",
            monto: "",
            descripcion: "",
          };
          this.refreshAfterUpload(contratoId);
        });
      });
  }

  // =============================
  // Carga inicial
  // =============================

  private loadData(contratoId: number): void {
    this.loading.set(true);
    this.error.set(null);

    const detalle$ = this.contratoService.getById(contratoId).pipe(
      catchError((err) => {
        console.error("[ComprobantesComponent] contrato detalle error", err);
        this.error.set("No se pudo cargar la información del contrato.");
        return of(null);
      })
    );

    const ordenes$ = this.ordenesService.listByContrato(contratoId).pipe(
      catchError((err) => {
        console.warn("[ComprobantesComponent] ordenes error", err);
        return of<OrdenPagoResumenDTO[]>([]);
      })
    );

    const documentos$ = this.documentosService
      .list({
        idContrato: contratoId,
        size: 3,
        sortBy: "fechaSubida",
        sortDir: "DESC",
        flat: true,
      })
      .pipe(
        catchError((err) => {
          console.warn("[ComprobantesComponent] documentos error", err);
          return of<DocumentoListItem[]>([]);
        })
      );

    forkJoin([detalle$, ordenes$, documentos$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([detalle, ordenes, documentos]) => {
        this.contratoDetalle.set(detalle);
        this.ordenesRaw.set(ordenes ?? []);
        this.documentosRaw.set(documentos ?? []);

        const primerPendiente = ordenes?.find((o) => o.estado === "PENDIENTE");
        this.selectedOrdenIdSignal.set(primerPendiente?.id ?? null);

        this.loading.set(false);
      });
  }

  private refreshAfterUpload(contratoId: number): void {
    forkJoin({
      ordenes: this.ordenesService
        .listByContrato(contratoId)
        .pipe(catchError(() => of<OrdenPagoResumenDTO[]>([]))),
      documentos: this.documentosService
        .list({
          idContrato: contratoId,
          size: 3,
          sortBy: "fechaSubida",
          sortDir: "DESC",
          flat: true,
        })
        .pipe(catchError(() => of<DocumentoListItem[]>([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ ordenes, documentos }) => {
        this.ordenesRaw.set(ordenes ?? []);
        this.documentosRaw.set(documentos ?? []);
      });
  }

  // =============================
  // Helpers de formato
  // =============================

  private formatPeriodo(periodo?: string | null): string {
    if (!periodo) return "Periodo no disponible";
    const normalized = periodo.length === 7 ? `${periodo}-01` : periodo;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return periodo;
    return new Intl.DateTimeFormat("es-PE", {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  private formatCurrency(value?: number | string | null): string {
    const num = typeof value === "string" ? Number(value) : value ?? 0;
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  }

  private formatDate(value?: string | null): string {
    if (!value) return "N/D";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  private formatSentenceCase(value?: string | null): string {
    if (!value) return "";
    const lower = value.toLowerCase().replace(/_/g, " ");
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  private estadoClass(estado?: string | null): string {
    switch ((estado ?? "").toUpperCase()) {
      case "PENDIENTE":
        return "pendiente";
      case "PAGADA":
        return "pagado";
      case "VENCIDA":
      case "EN_MORA":
        return "vencido";
      default:
        return "info";
    }
  }

  private estadoDocClass(estado?: string | null): string {
    switch ((estado ?? "").toUpperCase()) {
      case "APROBADO":
        return "ok";
      case "RECHAZADO":
        return "error";
      case "PENDIENTE":
      default:
        return "pendiente";
    }
  }

  private formatSize(sizeBytes: number): string {
    if (!sizeBytes || sizeBytes <= 0) return "";
    const kb = sizeBytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }
}

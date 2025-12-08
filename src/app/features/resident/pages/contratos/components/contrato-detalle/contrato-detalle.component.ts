import { CommonModule } from "@angular/common";
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from "@angular/core";
import { forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";

import { UtilsModule } from "../../../../../../utils/utils.module";
import { ContratoService } from "../../../../../../core/services/contrato.service";
import { OrdenesPagoService } from "../../../../../../core/services/ordenes-pago.service";
import { DocumentosService } from "../../../../../../core/services/documentos.service";

import { ContratoDetalle } from "../../../../../../core/models/contrato.model";
import {
  DocumentoDetalleDTO,
  DocumentoListItem,
} from "../../../../../../core/models/documento.model";
import { OrdenPagoResumenDTO } from "../../../../../../core/models/orden-pago.model";

@Component({
  selector: "app-contrato-detalle",
  standalone: true,
  imports: [CommonModule, UtilsModule],
  templateUrl: "./contrato-detalle.component.html",
  styleUrls: ["./contrato-detalle.component.css"],
})
export class ContratoDetalleComponent implements OnChanges {
  @Input({ required: true }) contratoId!: number;

  private contratoSrv = inject(ContratoService);
  private ordenesSrv = inject(OrdenesPagoService);
  private docsSrv = inject(DocumentosService);

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly contrato = signal<ContratoDetalle | null>(null);
  readonly ordenes = signal<OrdenPagoResumenDTO[]>([]);

  // 🔥 Ahora acepta ambos tipos
  readonly documentosRaw = signal<(DocumentoDetalleDTO | DocumentoListItem)[]>(
    []
  );

  // 🔥 ViewModel normalizado
  readonly documentos = signal<
    {
      id: number;
      nombre: string;
      fecha: string;
      tipo: string;
    }[]
  >([]);

  ngOnChanges(changes: SimpleChanges): void {
    if ("contratoId" in changes && this.contratoId != null) {
      this.loadAll(this.contratoId);
    }
  }

  private loadAll(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    const detalle$ = this.contratoSrv.getById(id).pipe(
      catchError((err) => {
        console.error("[ContratoDetalle] detalle error", err);
        return of<ContratoDetalle | null>(null);
      })
    );

    const ordenes$ = this.ordenesSrv
      .listByContrato(id)
      .pipe(catchError(() => of<OrdenPagoResumenDTO[]>([])));

    const docs$ = this.docsSrv
      .list({
        idContrato: id,
        size: 20,
        sortBy: "fechaSubida",
        sortDir: "DESC",
        flat: true,
        withLinks: true,
      })
      .pipe(
        catchError(() => of<(DocumentoDetalleDTO | DocumentoListItem)[]>([]))
      );

    forkJoin([detalle$, ordenes$, docs$]).subscribe({
      next: ([detalle, ordenes, docs]) => {
        this.contrato.set(detalle);

        this.ordenes.set(ordenes ?? []);

        this.documentosRaw.set(docs ?? []);

        // 🔥 Normalizamos aquí
        this.documentos.set(this.mapDocumentos(docs ?? []));

        if (!detalle) {
          this.error.set("No se pudo cargar el detalle del contrato.");
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set("Ocurrió un error al cargar el detalle.");
        this.loading.set(false);
      },
    });
  }

  // ===========================================
  // 🔥 Normalizador de Documentos
  // ===========================================
  private mapDocumentos(
    docs: (DocumentoDetalleDTO | DocumentoListItem)[]
  ): { id: number; nombre: string; fecha: string; tipo: string }[] {
    return docs
      .map((doc) => {
        const isDetalle = "idDocumento" in doc;

        return {
          id: isDetalle ? doc.idDocumento : doc.id,
          nombre: isDetalle
            ? doc.nombreOriginal ?? `Documento #${doc.idDocumento}`
            : doc.nombre ?? `Documento #${doc.id}`,
          fecha: this.date(isDetalle ? doc.fechaSubida : doc.creadoEn),
          tipo: (doc as any).tipo ?? "OTRO",
        };
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  // ===========================================
  // DESCARGA
  // ===========================================

  descargarContratoPdf(): void {
    const docs = this.documentosRaw();

    const candidato =
      docs.find((d) =>
        ("nombreOriginal" in d ? d.nombreOriginal : d.nombre)
          ?.toLowerCase()
          .includes("contrato")
      ) || docs[0];

    if (!candidato) {
      this.error.set("No hay documentos para descargar.");
      return;
    }

    const id =
      "idDocumento" in candidato ? candidato.idDocumento : candidato.id;
    const nombre =
      ("nombreOriginal" in candidato
        ? candidato.nombreOriginal
        : candidato.nombre) || `documento-${id}.pdf`;

    this.descargarDoc(id, nombre);
  }

  descargarDoc(idDocumento: number, nombre: string): void {
    this.loading.set(true);
    this.docsSrv.descargarContenido(idDocumento).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre;
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

  // ===========================================
  // Helpers
  // ===========================================
  statusClass(value?: string): string {
    return (
      (value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-") || "pendiente"
    );
  }

  sentence(value?: string | null): string {
    if (!value) return "";
    const lower = value.toLowerCase().replace(/_/g, " ");
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  money(value?: number | null): string {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value ?? 0);
  }

  date(value?: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    return isNaN(d.getTime())
      ? value
      : new Intl.DateTimeFormat("es-EC", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(d);
  }

  periodo(p?: string | null): string {
    if (!p) return "—";
    const n = p.length === 7 ? `${p}-01` : p;
    const d = new Date(n);
    return isNaN(d.getTime())
      ? p
      : new Intl.DateTimeFormat("es-EC", {
          month: "long",
          year: "numeric",
        }).format(d);
  }

  rango(inicio?: string | null, fin?: string | null): string {
    return `${this.date(inicio)} - ${
      fin ? this.date(fin) : "sin fecha de término"
    }`;
  }

  solicitarRenovacion(): void {
    const id = this.contratoId;

    const nueva = prompt("Nueva fecha de fin (YYYY-MM-DD):");
    if (!nueva) return;

    this.loading.set(true);
    this.error.set(null);

    this.contratoSrv.renovar(id, { nuevaFechaFin: nueva }).subscribe({
      next: () => {
        this.loadAll(id); // vuelve a cargar datos del contrato
      },
      error: () => {
        this.error.set("No se pudo solicitar la renovación.");
        this.loading.set(false);
      },
    });
  }
}

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
import { OrdenPagoResumenDTO } from "../../../../../../core/models/orden-pago.model";
import { DocumentoDetalleDTO } from "../../../../../../core/models/documento.model";

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
  readonly documentos = signal<DocumentoDetalleDTO[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if ("contratoId" in changes && this.contratoId != null) {
      this.loadAll(this.contratoId);
    }
  }

  private loadAll(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    const detalle$ = this.contratoSrv.getById(id).pipe(
      // ⚠️ Normalizamos aquí por si el backend aún envía unidadNumero/residenteNombre
      catchError((err) => {
        console.error("[ContratoDetalle] detalle error", err);
        return of<ContratoDetalle | null>(null);
      })
    );

    const ordenes$ = this.ordenesSrv.listByContrato(id).pipe(
      catchError((err) => {
        console.warn("[ContratoDetalle] ordenes error", err);
        return of<OrdenPagoResumenDTO[]>([]);
      })
    );

    const docs$ = this.docsSrv
      .list({
        idContrato: id,
        size: 20,
        sortBy: "fechaSubida",
        sortDir: "DESC",
        flat: true,
      })
      .pipe(
        catchError((err) => {
          console.warn("[ContratoDetalle] documentos error", err);
          return of<DocumentoDetalleDTO[]>([]);
        })
      );

    forkJoin([detalle$, ordenes$, docs$]).subscribe({
      next: ([detalle, ordenes, docs]) => {
        // 🔧 Normalización de campos del detalle (compatibilidad A/B)
        const fixed = detalle
          ? ({
              ...detalle,
              // si el backend ya envía numeroUnidad/nombreResidente, se mantienen
              numeroUnidad:
                (detalle as any).numeroUnidad ??
                (detalle as any).unidadNumero ??
                null,
              nombreResidente:
                (detalle as any).nombreResidente ??
                (detalle as any).residenteNombre ??
                null,
            } as ContratoDetalle)
          : null;

        this.contrato.set(fixed);
        this.ordenes.set(ordenes ?? []);
        this.documentos.set(docs ?? []);
        if (!fixed) {
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

  descargarContratoPdf(): void {
    const doc =
      this.documentos().find((d) =>
        (d.nombreOriginal || "").toLowerCase().includes("contrato")
      ) || this.documentos()[0];

    if (!doc) {
      this.error.set("No hay documentos para descargar.");
      return;
    }
    this.descargarDoc(
      doc.idDocumento,
      doc.nombreOriginal || `documento-${doc.idDocumento}.pdf`
    );
  }

  descargarDoc(idDocumento: number, nombre: string): void {
    this.loading.set(true);
    this.docsSrv.descargarContenido(idDocumento).subscribe({
      next: (blob) => {
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

  solicitarRenovacion(): void {
    const id = this.contratoId;
    const nueva = prompt("Nueva fecha de fin (YYYY-MM-DD):");
    if (!nueva) return;
    this.loading.set(true);
    this.contratoSrv.renovar(id, { nuevaFechaFin: nueva }).subscribe({
      next: () => {
        this.loadAll(id);
      },
      error: () => {
        this.error.set("No se pudo solicitar la renovación.");
        this.loading.set(false);
      },
    });
  }

  // ===== Helpers de formato =====
  statusClass(value?: string): string {
    const v = (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");
    return v || "pendiente";
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
      ? (value as string)
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
}

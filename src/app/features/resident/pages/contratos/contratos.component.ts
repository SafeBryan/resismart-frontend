import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { UtilsModule } from '../../../../utils/utils.module';
import { RESIDENT_NAV } from '../../resident-nav';
import { ResidentContextService } from '../../../../core/services/resident-context.service';
import { ContratoService } from '../../../../core/services/contrato.service';
import { OrdenesPagoService } from '../../../../core/services/ordenes-pago.service';
import { DocumentosService } from '../../../../core/services/documentos.service';
import { ResidentContext } from '../../../../core/models/resident-context.model';
import { ContratoDetalle, ContratoResumen, EstadoContrato } from '../../../../core/models/contrato.model';
import { OrdenPagoResumenDTO } from '../../../../core/models/orden-pago.model';
import { DocumentoDetalleDTO } from '../../../../core/models/documento.model';

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
  selector: 'app-resident-contratos',
  standalone: true,
  imports: [CommonModule, RouterModule, UtilsModule],
  templateUrl: './contratos.component.html',
  styleUrl: './contratos.component.css',
})
export class ResidentContratosComponent {
  private readonly contextService = inject(ResidentContextService);
  private readonly contratoService = inject(ContratoService);
  private readonly ordenesService = inject(OrdenesPagoService);
  private readonly documentosService = inject(DocumentosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly residentNav = RESIDENT_NAV;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly context = signal<ResidentContext | null>(null);

  private readonly contratosRaw = signal<ContratoResumen[]>([]);
  private readonly contratoDetalle = signal<ContratoDetalle | null>(null);
  private readonly ordenesRaw = signal<OrdenPagoResumenDTO[]>([]);
  private readonly documentosRaw = signal<DocumentoDetalleDTO[]>([]);

  readonly contratoActual = computed<ContratoActualView | null>(() => {
    const detalle = this.contratoDetalle();
    if (!detalle) return null;

    const descripcion = `Contrato asociado a la unidad ${detalle.unidadNumero} para el residente ${detalle.residenteNombre}.`;
    const proximoPendiente = this.ordenesRaw()
      .filter((o) => o.estado === 'PENDIENTE')
      .sort((a, b) => (a.fechaVencimiento || '').localeCompare(b.fechaVencimiento || ''))[0];

    return {
      id: detalle.id,
      nombre: `Contrato ${detalle.id}`,
      vigencia: this.formatRango(detalle.fechaInicio, detalle.fechaFin),
      estado: this.formatSentenceCase(detalle.estado),
      estadoClass: this.statusClass(detalle.estado),
      monto: this.formatCurrency(detalle.monto) + ' / mes',
      descripcion,
      proximoPago: proximoPendiente
        ? `Proximo pago ${this.formatDate(proximoPendiente.fechaVencimiento)}`
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
    this.documentosRaw()
      .sort((a, b) => (b.fechaSubida || '').localeCompare(a.fechaSubida || ''))
      .map((doc) => ({
        id: doc.idDocumento,
        nombre: doc.nombreOriginal ?? `Documento #${doc.idDocumento}`,
        tipo: doc.tipo ?? 'PDF',
        fecha: this.formatDate(doc.fechaSubida),
        accion: 'Descargar',
      }))
      .slice(0, 5)
  );

  readonly tips = [
    {
      icon: 'check_circle',
      titulo: 'Verifica tu informacion',
      descripcion: 'Manten tus datos personales actualizados en la seccion "Mis Datos".',
    },
    {
      icon: 'cloud_upload',
      titulo: 'Sube tus comprobantes',
      descripcion: 'Guarda una copia digital de cada pago mensual para evitar contratiempos.',
    },
    {
      icon: 'support_agent',
      titulo: 'Contacta a administracion',
      descripcion: 'Si necesitas renegociar los terminos, agenda una cita con soporte.',
    },
  ];

  constructor() {
    toObservable(this.contextService.context)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ctx) => {
        this.context.set(ctx);
        if (ctx.loading) return;
        this.contratosRaw.set(ctx.contratos || []);
        this.loadContrato(ctx);
      });
  }

  statusClass(value: string): string {
    const normalized = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    return normalized || 'pendiente';
  }

  private loadContrato(ctx: ResidentContext): void {
    const contratoId =
      ctx.contratoActivo?.id ??
      (ctx.contratos && ctx.contratos.length ? ctx.contratos[0].id : null);

    if (!contratoId) {
      this.contratoDetalle.set(null);
      this.ordenesRaw.set([]);
      this.documentosRaw.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const detalle$ = this.contratoService.getById(contratoId).pipe(
      catchError((err) => {
        console.error('[ContratosComponent] detalle error', err);
        this.error.set('No se pudo obtener el detalle del contrato.');
        return of(null);
      })
    );

    const ordenes$ = this.ordenesService.listByContrato(contratoId).pipe(
      catchError((err) => {
        console.warn('[ContratosComponent] ordenes error', err);
        return of<OrdenPagoResumenDTO[]>([]);
      })
    );

    const documentos$ = this.documentosService
      .list({
        idContrato: contratoId,
        size: 5,
        sortBy: 'fechaSubida',
        sortDir: 'DESC',
        flat: true,
      })
      .pipe(
        catchError((err) => {
          console.warn('[ContratosComponent] documentos error', err);
          return of<DocumentoDetalleDTO[]>([]);
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

  private formatRango(inicio: string, fin?: string | null): string {
    const inicioFmt = this.formatDate(inicio);
    const finFmt = fin ? this.formatDate(fin) : 'sin fecha de termino';
    return `${inicioFmt} - ${finFmt}`;
  }

  private formatDate(value?: string | null): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private formatPeriodo(periodo?: string | null): string {
    if (!periodo) return 'Periodo no definido';
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

  private formatSentenceCase(value?: string | null): string {
    if (!value) return '';
    const lower = value.toLowerCase().replace(/_/g, ' ');
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
}

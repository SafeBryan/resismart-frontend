import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { UtilsModule } from '../../../../utils/utils.module';
import { RESIDENT_NAV } from '../../resident-nav';
import { ResidentContextService } from '../../../../core/services/resident-context.service';
import { ResidentContext } from '../../../../core/models/resident-context.model';
import { ContratoResumen } from '../../../../core/models/contrato.model';
import { ContratoService } from '../../../../core/services/contrato.service';
import { OrdenesPagoService } from '../../../../core/services/ordenes-pago.service';
import { OrdenPagoResumenDTO, OrdenPagoEstado, OrdenPagoDetalleDTO } from '../../../../core/models/orden-pago.model';
import { PagosService } from '../../../../core/services/pagos.service';
import { MetodoPago } from '../../../../core/models/pago.model';
import { ToastService } from '../../../../core/services/toast.service';

interface OrdenView {
  id: number;
  contratoId: number;
  contratoLabel: string;
  periodo: string;
  periodoRaw?: string | null;
  monto: string;
  totalConMora?: string;
  saldoPendiente?: string;
  mora?: string;
  estado: string;
  estadoRaw: string;
  ultimaTransaccion?: string | null;
  puedePagar: boolean;
  vence?: string;
  fechaVencimiento?: string | null;
}

@Component({
  selector: 'app-resident-payments-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UtilsModule],
  templateUrl: './resident-payments-page.component.html',
  styleUrl: './resident-payments-page.component.css',
})
export class ResidentPaymentsPageComponent {
  private readonly contextService = inject(ResidentContextService);
  private readonly contratosService = inject(ContratoService);
  private readonly ordenesService = inject(OrdenesPagoService);
  private readonly pagosService = inject(PagosService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly residentNav = RESIDENT_NAV;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly context: Signal<ResidentContext | null> = this.contextService.context;

  readonly contratos = signal<ContratoResumen[]>([]);
  readonly ordenes = signal<OrdenPagoResumenDTO[]>([]);
  readonly detallesExtra = signal<Record<number, Partial<OrdenPagoDetalleDTO>>>({});
  readonly selectedContratoFilter = signal<number | 'all'>('all');
  readonly selectedEstadoFilter = signal<OrdenPagoEstado | 'ALL'>('ALL');

  readonly contratosOptions = computed<{ id: number | 'all'; label: string }[]>(() => [
    { id: 'all', label: 'Todos los contratos' },
    ...(this.contratos() || []).map((c) => ({
      id: c.id,
      label: `Contrato #${c.id}${c.numeroUnidad ? ' - Unidad ' + c.numeroUnidad : ''}`,
    })),
  ]);

  readonly estadosOptions: { value: OrdenPagoEstado | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Todos' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'PAGADA', label: 'Pagada' },
    { value: 'VENCIDA', label: 'Vencida' },
    { value: 'EN_MORA', label: 'En mora' },
  ];

  readonly ordenesView = computed<OrdenView[]>(() => {
    const estadoFilter = this.selectedEstadoFilter();
    const contratoFilter = this.selectedContratoFilter();
    const extras = this.detallesExtra();

    return (this.ordenes() || [])
      .filter((o) => (estadoFilter === 'ALL' ? true : o.estado === estadoFilter))
      .filter((o) => (contratoFilter === 'all' ? true : Number(o.idContrato) === Number(contratoFilter)))
      .map((orden) => {
        const contrato = (this.contratos() || []).find((c) => Number(c.id) === Number(orden.idContrato));
        const contratoLabel = contrato
          ? `Contrato #${contrato.id}${contrato.numeroUnidad ? ' - Unidad ' + contrato.numeroUnidad : ''}`
          : `Contrato #${orden.idContrato}`;

        const ultimaTx = orden.ultimaTransaccionEstado
          ? this.formatSentenceCase(orden.ultimaTransaccionEstado)
          : null;

        const ultimaTxEstado = (orden.ultimaTransaccionEstado || '').toString().toUpperCase();
        const puedePagar =
          (orden.estado || '').toUpperCase() !== 'PAGADA' &&
          ultimaTxEstado !== 'PENDIENTE';

        const extra = extras[orden.id] || {};
        const base = this.toNumber(extra.montoBase ?? orden.monto ?? orden.montoBase);
        const baseTotal = base;
        const saldoRaw = extra.saldoPendiente ?? (orden as any).saldoPendiente ?? baseTotal;
        const moraRaw = extra.mora ?? (orden as any).moraAcumulada ?? (orden as any).mora ?? 0;
        const saldoTotal = this.toNumber(saldoRaw);
        const mora = this.formatCurrency(moraRaw);
        const totalConMora = this.formatCurrency(baseTotal + this.toNumber(moraRaw));

        return {
          id: orden.id,
          contratoId: orden.idContrato,
          contratoLabel,
          periodo: this.formatPeriodo(orden.periodo),
          periodoRaw: orden.periodo,
          monto: this.formatCurrency(baseTotal),
          totalConMora,
          saldoPendiente: this.formatCurrency(saldoTotal),
          mora,
          estado: this.formatSentenceCase(orden.estado),
          estadoRaw: orden.estado,
          ultimaTransaccion: ultimaTx,
          puedePagar,
          vence: orden.fechaVencimiento ? this.formatDate(orden.fechaVencimiento) : undefined,
          fechaVencimiento: orden.fechaVencimiento,
        };
      })
      .sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));
  });

  readonly ordenMesActual = computed<OrdenView | null>(() => {
    const now = new Date();
    return this.ordenesView().find((o) => this.isSameMonth(o.periodoRaw, now)) || null;
  });

  readonly ordenSiguienteVencimiento = computed<OrdenView | null>(() => {
    const pendientes = this.ordenesView().filter((o) => (o.estadoRaw || '').toUpperCase() !== 'PAGADA');
    if (!pendientes.length) return null;
    return pendientes
      .filter((o) => o.fechaVencimiento)
      .sort((a, b) => (a.fechaVencimiento || '').localeCompare(b.fechaVencimiento || ''))[0] || null;
  });

  // Modal state
  readonly showModal = signal(false);
  readonly selectedOrden = signal<OrdenPagoResumenDTO | null>(null);
  pagoForm = {
    monto: '',
    referencia: '',
    metodo: 'TRANSFERENCIA' as MetodoPago,
    comprobante: null as File | null,
  };

  readonly metodoOptions: { value: MetodoPago; label: string }[] = [
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
    { value: 'DEPOSITO', label: 'Deposito' },
    { value: 'EFECTIVO', label: 'Efectivo' },
  ];

  constructor() {
    toObservable(this.contextService.context)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((ctx) => {
          if (ctx.loading) return of(null);
          const contratosCtx = ctx.contratos || [];
          if (contratosCtx.length) {
            this.contratos.set(contratosCtx);
            return of(contratosCtx.map((c) => c.id));
          }
          const residenteId =
            (ctx.residente as any)?.id_Cliente ??
            (ctx.residente as any)?.idCliente ??
            (ctx.residente as any)?.id ??
            null;
          if (!residenteId) {
            this.error.set('No se pudo obtener el residente del usuario actual.');
            return of(null);
          }
          return this.contratosService
            .listByResidente(Number(residenteId))
            .pipe(
              catchError(() => {
                this.error.set('No se pudieron cargar los contratos.');
                return of<ContratoResumen[]>([]);
              }),
              switchMap((contratos) => {
                this.contratos.set(contratos || []);
                return of((contratos || []).map((c) => c.id));
              })
            );
        })
      )
      .subscribe((contratoIds) => {
        if (!contratoIds || contratoIds.length === 0) {
          this.loading.set(false);
          return;
        }
        this.loadOrdenes(contratoIds);
      });
  }

  onChangeEstado(value: string) {
    this.selectedEstadoFilter.set((value as OrdenPagoEstado | 'ALL') ?? 'ALL');
  }

  onChangeContrato(value: string | number) {
    const parsed = value === 'all' ? 'all' : Number(value);
    this.selectedContratoFilter.set((parsed as any) ?? 'all');
  }

  openModal(ordenId: number) {
    const orden = (this.ordenes() || []).find((o) => o.id === ordenId);
    if (!orden) return;
    this.selectedOrden.set(orden);
    const defaultMonto =
      this.saldoPendienteDetalle(orden.id) || this.totalOrdenConMora(orden.id) || this.montoBaseDetalle(orden.id);
    this.pagoForm = {
      monto: defaultMonto ? String(defaultMonto) : String(orden.monto ?? orden.montoBase ?? ''),
      referencia: '',
      metodo: 'TRANSFERENCIA',
      comprobante: null,
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedOrden.set(null);
  }

  getExtra(id?: number | null) {
    if (!id) return undefined;
    return this.detallesExtra()[id];
  }

  totalOrdenConMora(id?: number | null): number {
    if (!id) return 0;
    const extra = this.detallesExtra()[id] || {};
    const base = this.toNumber(extra.montoBase);
    const mora = this.toNumber(extra.mora);
    return base + mora;
  }

  montoBaseDetalle(id?: number | null): number {
    const extra = this.getExtra(id);
    if (extra?.montoBase != null) return this.toNumber(extra.montoBase);
    const ord = (this.ordenes() || []).find((o) => o.id === id);
    return this.toNumber(ord?.monto ?? ord?.montoBase);
  }

  moraDetalle(id?: number | null): number {
    const extra = this.getExtra(id);
    if (extra?.mora != null) return this.toNumber(extra.mora);
    const ord = (this.ordenes() || []).find((o) => o.id === id);
    return this.toNumber((ord as any)?.moraAcumulada ?? (ord as any)?.mora);
  }

  saldoPendienteDetalle(id?: number | null): number {
    const extra = this.getExtra(id);
    if (extra?.saldoPendiente != null) return this.toNumber(extra.saldoPendiente);
    const ord = (this.ordenes() || []).find((o) => o.id === id);
    return this.toNumber((ord as any)?.saldoPendiente ?? ord?.monto ?? ord?.montoBase);
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pagoForm = { ...this.pagoForm, comprobante: file };
  }

  onSubmitPago() {
    const orden = this.selectedOrden();
    if (!orden) return;
    const monto = Number(this.pagoForm.monto);
    if (!monto || Number.isNaN(monto)) {
      this.toast.error('Ingresa un monto válido.');
      return;
    }
    this.saving.set(true);
    this.pagosService
      .registrarTransaccion({
        ordenId: orden.id,
        monto,
        referencia: this.pagoForm.referencia,
        metodoPago: this.pagoForm.metodo,
        comprobante: this.pagoForm.comprobante || undefined,
      })
      .pipe(
        catchError((err) => {
          console.error('[ResidentPayments] registrarTransaccion error', err);
          this.toast.error('No se pudo registrar el pago. Intenta nuevamente.');
          this.saving.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((resp) => {
        if (!resp) return;
        this.toast.success('Pago enviado para revisión.');
        this.saving.set(false);
        this.closeModal();
        // Refrescar solo el contrato de la orden
        this.loadOrdenes([orden.idContrato]);
      });
  }

  private loadOrdenes(contratoIds: number[]) {
    const uniques = Array.from(new Set((contratoIds || []).map((id) => Number(id)).filter(Boolean)));
    if (!uniques.length) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    forkJoin(uniques.map((id) => this.ordenesService.listByContrato(id).pipe(catchError(() => of<OrdenPagoResumenDTO[]>([])))))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((chunks) => {
        const lista = chunks.flat();
        this.ordenes.set(lista);
        this.loadDetallesExtra(lista);
        this.loading.set(false);
      });
  }

  private loadDetallesExtra(ordenes: OrdenPagoResumenDTO[]) {
    const ids = Array.from(new Set((ordenes || []).map((o) => o.id).filter(Boolean)));
    if (!ids.length) {
      this.detallesExtra.set({});
      return;
    }
    forkJoin(
      ids.map((id) =>
        this.ordenesService.getDetalle(id).pipe(
          catchError(() => of<OrdenPagoDetalleDTO | null>(null))
        )
      )
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((detalles) => {
        const map: Record<number, Partial<OrdenPagoDetalleDTO>> = {};
        detalles.forEach((d) => {
          if (d?.id) {
            map[d.id] = {
              mora: d.mora,
              saldoPendiente: d.saldoPendiente,
              montoBase: d.montoBase,
            };
          }
        });
        this.detallesExtra.set(map);
      });
  }

  formatPeriodo(periodo?: string | null): string {
    if (!periodo) return 'Periodo no disponible';
    const normalized = periodo.length === 7 ? `${periodo}-01` : periodo;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return periodo;
    return new Intl.DateTimeFormat('es-EC', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  formatCurrency(value?: number | string | null): string {
    const num = typeof value === 'string' ? Number(value) : value ?? 0;
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  }

  formatDate(value?: string | null): string {
    if (!value) return 'N/D';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private isSameMonth(periodo?: string | null, ref?: Date): boolean {
    if (!periodo) return false;
    const normalized = periodo.length === 7 ? `${periodo}-01` : periodo;
    const date = new Date(normalized);
    const target = ref || new Date();
    if (Number.isNaN(date.getTime())) return false;
    return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
  }

  private formatSentenceCase(value?: string | null): string {
    if (!value) return '';
    const lower = value.toLowerCase().replace(/_/g, ' ');
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
}

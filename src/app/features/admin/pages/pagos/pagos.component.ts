import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { CondominioContextService } from '../../../../core/services/condominio-context.service';
import { OrdenesPagoService } from '../../../../core/services/ordenes-pago.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { OrdenPagoDetalleDTO, OrdenPagoEstado, OrdenPagoResumenDTO } from '../../../../core/models/orden-pago.model';
import { TransaccionPagoDTO } from '../../../../core/models/pago.model';
import { normalizeRole } from '../../../../core/utils/role.util';
import { environment } from '../../../../../environments/environment';

type EstadoFiltro = OrdenPagoEstado | 'ALL';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    UtilsModule,
    SidebarComponent,
    MatIconModule,
  ],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.css',
})
export class PagosComponent {
  private readonly condCtx = inject(CondominioContextService);
  private readonly ordenesService = inject(OrdenesPagoService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  private lastCondominioId: number | null = null;

  readonly condominioId = computed(() => this.condCtx.state().condominioActualId ?? null);
  readonly condominioNombre = computed(() => this.condCtx.condominioActual()?.nombre ?? '');

  readonly loadingContext = signal(false);
  readonly loadingOrdenes = signal(false);
  readonly loadingDetalle = signal(false);
  readonly error = signal<string | null>(null);
  readonly detalleError = signal<string | null>(null);

  readonly ordenes = signal<OrdenPagoResumenDTO[]>([]);
  readonly ordenesMes = signal<OrdenPagoResumenDTO[]>([]);
  readonly detalle = signal<OrdenPagoDetalleDTO | null>(null);

  readonly estadoFilter = signal<EstadoFiltro>('ALL');
  readonly fromFilter = signal<string | null>(null);
  readonly toFilter = signal<string | null>(null);
  readonly inquilinoFilter = signal<number | null>(null);

  readonly requestedDetalleId = signal<number | null>(null);

  readonly isOwner = computed(() => {
    const role = normalizeRole(this.auth.snapshot.role);
    return role === 'OWNER';
  });

  constructor() {
    effect(
      () => {
        const condId = this.condominioId();
        if (condId && condId !== this.lastCondominioId) {
          this.lastCondominioId = condId;
          this.loadContext(condId);
        }
      },
      { allowSignalWrites: true }
    );

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(id) && id > 0) {
      this.requestedDetalleId.set(id);
    }

    this.route.params.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params['id']);
      if (Number.isFinite(id) && id > 0) {
        this.requestedDetalleId.set(id);
        this.detalle.set(null);
        this.loadDetalle(id);
      }
    });
  }

  trackById = (_: number, item: OrdenPagoResumenDTO) => item.id;
  trackByTxId = (_: number, item: TransaccionPagoDTO) => item.id ?? _;

  private loadContext(condominioId: number) {
    this.error.set(null);
    this.loadingContext.set(true);
    this.loadOrdenes(condominioId);
  }

  private loadOrdenes(condominioId: number) {
    this.loadingOrdenes.set(true);
    const role = normalizeRole(this.auth.snapshot.role);
    const params: any = { sortDir: 'DESC' };
    if (condominioId) params.condominioId = condominioId;
    if (this.estadoFilter() && this.estadoFilter() !== 'ALL') params.estado = this.estadoFilter();
    if (this.fromFilter()) params.from = this.fromFilter();
    if (this.toFilter()) params.to = this.toFilter();
    if (role === 'OWNER') params.flat = true;

    this.ordenesService
      .list(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.ordenes.set(resp.items ?? []);
          this.loadingOrdenes.set(false);
          this.loadingContext.set(false);
          const detalleId = this.requestedDetalleId();
          if (detalleId) {
            this.loadDetalle(detalleId);
          }
        },
        error: (err) => {
          console.error('Error cargando ordenes', err);
          this.error.set('No se pudieron cargar las ordenes de pago.');
          this.loadingOrdenes.set(false);
          this.loadingContext.set(false);
        },
      });
  }

  loadDetalle(id: number) {
    if (!id) return;
    this.loadingDetalle.set(true);
    this.detalleError.set(null);
    this.ordenesService
      .getDetalle(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => {
          this.detalle.set(detalle);
          this.loadingDetalle.set(false);
          this.location.replaceState(`/dashboard/pagos/${id}`);
        },
        error: (err) => {
          console.error('detalle error', err);
          this.detalleError.set('No se pudo cargar el detalle de la orden.');
          this.loadingDetalle.set(false);
        },
      });
  }

  onFilterChange() {
    const condId = this.condominioId();
    if (condId) {
      this.loadOrdenes(condId);
    }
  }

  onClearFilters() {
    this.estadoFilter.set('ALL');
    this.fromFilter.set(null);
    this.toFilter.set(null);
    this.inquilinoFilter.set(null);
    this.onFilterChange();
  }

  async marcarPagada(id: number) {
    if (!id) return;
    try {
      const orden = this.ordenes().find((o) => o.id === id);
      const periodo = orden?.periodo ? ` (${orden.periodo})` : '';
      const confirm = window.confirm(`Marcar como pagada la orden #${id}${periodo}?`);
      if (!confirm) return;
      this.loadingDetalle.set(true);
      await firstValueFrom(this.ordenesService.marcarPagada(id));
      this.toast.success('Orden marcada como pagada.');
      this.loadOrdenes(this.condominioId() ?? 0);
      this.loadDetalle(id);
    } catch (err) {
      console.error(err);
      this.toast.error('No se pudo marcar como pagada.');
      this.loadingDetalle.set(false);
    }
  }

  formatearMonto(monto?: number | null): string {
    if (monto === null || monto === undefined) return 'S/ 0.00';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(monto);
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) return 'N/D';
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(fecha));
  }

  exportarCSV() {
    const headers = ['ID', 'Contrato', 'Periodo', 'Monto', 'Vencimiento', 'Estado', 'Saldo', 'Mora', 'Inquilino', 'Condominio'];
    const rows = this.ordenes().map((o) => [
      o.id,
      o.idContrato,
      o.periodo,
      o.monto ?? o.montoBase,
      o.fechaVencimiento,
      o.estado,
      o.saldoPendiente,
      o.mora,
      o.inquilino ?? '',
      o.condominio ?? '',
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ordenes_pago.csv');
    link.click();
    URL.revokeObjectURL(url);
  }

  openDetalle(id: number) {
    this.requestedDetalleId.set(id);
    this.loadDetalle(id);
  }

  closeDetalle() {
    this.detalle.set(null);
    this.location.replaceState('/dashboard/pagos');
  }

  getEstadoBadge(estado?: string | null) {
    if (!estado) return '';
    const v = estado.toUpperCase();
    if (v === 'PAGADA') return 'success';
    if (v === 'VENCIDA' || v === 'EN_MORA' || v === 'RECHAZADA') return 'danger';
    return 'warning';
  }

  getUltimoEstado(orden: OrdenPagoResumenDTO): string {
    if (orden.ultimaTransaccionEstado) return orden.ultimaTransaccionEstado;
    return orden.estado ?? '';
  }

  isPagoRechazado(tx: TransaccionPagoDTO | undefined | null): boolean {
    const estado = tx?.estado?.toString().toUpperCase();
    return estado === 'RECHAZADO';
  }

  linkComprobante(tx: TransaccionPagoDTO | undefined | null): string | null {
    if (!tx?.comprobanteStorageKey) return null;
    const base = environment.apiUrl || '';
    return `${base}/files/${tx.comprobanteStorageKey}`;
  }

  saldoColor(orden: { saldoPendiente?: number | null }): string {
    const saldo = orden?.saldoPendiente ?? 0;
    if (saldo <= 0) return 'success';
    return 'warning';
  }

  reintentarCarga() {
    const condId = this.condominioId();
    if (condId) {
      this.loadContext(condId);
    }
  }
}

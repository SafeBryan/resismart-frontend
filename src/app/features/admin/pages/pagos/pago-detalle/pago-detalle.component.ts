import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UtilsModule } from '../../../../../utils/utils.module';
import { SidebarComponent } from '../../../../../utils/sidebar/sidebar.component';
import { OrdenesPagoService } from '../../../../../core/services/ordenes-pago.service';
import { OrdenPagoDetalleDTO } from '../../../../../core/models/orden-pago.model';
import { ToastService } from '../../../../../core/services/toast.service';
import { environment } from '../../../../../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { PagosService } from '../../../../../core/services/pagos.service';
import { TransaccionPagoDTO } from '../../../../../core/models/pago.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { normalizeRole } from '../../../../../core/utils/role.util';

@Component({
  selector: 'app-pago-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UtilsModule, SidebarComponent, MatIconModule],
  templateUrl: './pago-detalle.component.html',
  styleUrl: './pago-detalle.component.css',
})
export class PagoDetalleComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordenesService = inject(OrdenesPagoService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private pagosService = inject(PagosService);
  private auth = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly detalle = signal<OrdenPagoDetalleDTO | null>(null);
  readonly modalAccion = signal<{ modo: 'APROBAR' | 'RECHAZAR'; tx: TransaccionPagoDTO | null }>({
    modo: 'APROBAR',
    tx: null,
  });
  readonly rechazoMotivo = signal<string>('');

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      if (Number.isFinite(id) && id > 0) {
        this.loadDetalle(id);
      } else {
        this.error.set('Orden no encontrada');
      }
    });
  }

  loadDetalle(id: number) {
    if (!id || Number.isNaN(id)) {
      this.error.set('Orden no encontrada');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.ordenesService
      .getDetalle(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.detalle.set(d);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[PagoDetalle] error', err);
          this.error.set('No se pudo cargar el detalle.');
          this.loading.set(false);
        },
      });
  }

  back() {
    this.router.navigate(['/dashboard/pagos']);
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
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  }

  formatPeriodo(periodo?: string | null): string {
    if (!periodo) return 'N/D';
    const normalized = periodo.length === 7 ? `${periodo}-01` : periodo;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return periodo;
    return new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(d);
  }

  getEstadoClase(): string {
    const estado = (this.detalle()?.estado || '').toString().toUpperCase();
    if (estado === 'PAGADA') return 'badge paid';
    if (estado === 'PENDIENTE') return 'badge';
    return 'badge danger';
  }

  transacciones() {
    return (this.detalle()?.transacciones as TransaccionPagoDTO[]) || [];
  }

  comprobanteUrl(tx: any): string | null {
    const key = tx?.comprobanteStorageKey;
    if (!key) return null;
    const base = environment.apiUrl || '';
    if (typeof key === 'string' && key.startsWith('/files')) return `${base}${key}`;
    if (typeof key === 'string' && key.startsWith('/')) return `${base}${key}`;
    return `${base}/files/${key}`;
  }

  estadoTxClase(estado?: string): string {
    const e = (estado || '').toUpperCase();
    if (e === 'APROBADO') return 'badge paid';
    if (e === 'RECHAZADO') return 'badge danger';
    if (e === 'PENDIENTE') return 'badge warning';
    return 'badge';
  }

  puedeGestionar(): boolean {
    const role = normalizeRole(this.auth.snapshot.role || (this.auth.snapshot.profile as any)?.rol);
    return role === 'ADMIN' || role === 'OWNER';
  }

  openAprobar(tx: TransaccionPagoDTO) {
    if (!this.puedeGestionar() || tx?.estado !== 'PENDIENTE') return;
    this.modalAccion.set({ modo: 'APROBAR', tx });
    this.rechazoMotivo.set('');
  }

  openRechazar(tx: TransaccionPagoDTO) {
    if (!this.puedeGestionar() || tx?.estado !== 'PENDIENTE') return;
    this.modalAccion.set({ modo: 'RECHAZAR', tx });
    this.rechazoMotivo.set('');
  }

  closeModal() {
    this.modalAccion.set({ modo: 'APROBAR', tx: null });
    this.rechazoMotivo.set('');
  }

  confirmarAccion() {
    const payload = this.modalAccion();
    const tx = payload.tx;
    if (!tx) return;
    if (payload.modo === 'APROBAR') {
      this.aprobar(tx);
      return;
    }
    const motivo = this.rechazoMotivo().trim();
    if (!motivo) {
      this.toast.error('Ingresa un motivo para rechazar.');
      return;
    }
    this.rechazar(tx, motivo);
  }

  private aprobar(tx: TransaccionPagoDTO) {
    const idAdmin = this.obtenerIdAdmin();
    this.loading.set(true);
    this.pagosService
      .aprobarTransaccion(Number(tx.id), idAdmin)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Pago aprobado.');
          this.closeModal();
          this.loadDetalle(this.detalle()?.id || tx.ordenPago?.id || 0);
        },
        error: (err) => {
          console.error('[PagoDetalle] aprobar error', err);
          this.toast.error(err?.error?.error || 'No se pudo aprobar la transacción.');
          this.loadDetalle(this.detalle()?.id || tx.ordenPago?.id || 0);
          this.closeModal();
        },
      });
  }

  private rechazar(tx: TransaccionPagoDTO, motivo: string) {
    const idAdmin = this.obtenerIdAdmin();
    this.loading.set(true);
    this.pagosService
      .rechazarTransaccion(Number(tx.id), motivo, idAdmin)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Pago rechazado.');
          this.closeModal();
          this.loadDetalle(this.detalle()?.id || tx.ordenPago?.id || 0);
        },
        error: (err) => {
          console.error('[PagoDetalle] rechazar error', err);
          this.toast.error(err?.error?.error || 'No se pudo rechazar la transacción.');
          this.loadDetalle(this.detalle()?.id || tx.ordenPago?.id || 0);
          this.closeModal();
        },
      });
  }

  private obtenerIdAdmin(): number {
    return Number(this.auth.snapshot.idUsuario ?? (this.auth.snapshot.profile as any)?.idUsuario ?? 0);
  }
}

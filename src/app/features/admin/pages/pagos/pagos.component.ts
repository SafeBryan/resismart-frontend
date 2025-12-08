<<<<<<< HEAD
import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { CondominioContextService } from '../../../../core/services/condominio-context.service';
import { ResidentesService } from '../../../../core/services/residentes.service';
import { ContratoService } from '../../../../core/services/contrato.service';
import { OrdenesPagoService } from '../../../../core/services/ordenes-pago.service';
import { PagosService } from '../../../../core/services/pagos.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { OrdenPagoDetalleDTO, OrdenPagoEstado, OrdenPagoResumenDTO } from '../../../../core/models/orden-pago.model';
import { ResidenteRespuestaDTO } from '../../../../core/models/residente.model';
import { ContratoResumen } from '../../../../core/models/contrato.model';
import { TransaccionPagoDTO } from '../../../../core/models/pago.model';
import { normalizeRole } from '../../../../core/utils/role.util';
import { environment } from '../../../../../environments/environment';
import { UiModalComponent } from '../../../../shared/ui/ui-modal.component';
import { UiButtonComponent } from '../../../../shared/ui/ui-button.component';

type EstadoFiltro = OrdenPagoEstado | 'ALL';

interface OrdenView {
  id: number;
  contratoId: number;
  periodo?: string | null;
  fechaVencimiento?: string | null;
  estado?: OrdenPagoEstado;
  ultimaTransaccionEstado?: string | null;
  monto?: number | null; // total base si viene
  montoBase?: number | null;
  saldoPendiente?: number | null;
  mora?: number | null;
  totalConMora?: number | null;
  unidad?: string | null;
  inquilino?: string | null;
  condominio?: string | null;
}
=======
import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { UtilsModule } from "../../../../utils/utils.module";
import { SidebarComponent } from "../../../../utils/sidebar/sidebar.component";

import {
  OrdenPagoResumenDTO,
  OrdenPagoEstado,
  OrdenPagoResumenEstados,
  IngresoMensualDTO,
  PageResponse,
  OrdenPagoGeneracionMensualResponseDTO,
} from "../../../../core/models/orden-pago.model";

import { OrdenesPagoService } from "../../../../core/services/ordenes-pago.service";
import { QRCodeComponent } from "angularx-qrcode";
>>>>>>> 98f67ccd7c00017fca0cf5be3e50f83cf390309a

@Component({
  selector: "app-pagos",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
<<<<<<< HEAD
    RouterModule,
    UtilsModule,
    SidebarComponent,
    MatIconModule,
    UiModalComponent,
    UiButtonComponent,
  ],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.css',
})
export class PagosComponent {
  private readonly condCtx = inject(CondominioContextService);
  private readonly residentesService = inject(ResidentesService);
  private readonly contratoService = inject(ContratoService);
  private readonly ordenesService = inject(OrdenesPagoService);
  private readonly pagosService = inject(PagosService);
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

  readonly residentes = signal<ResidenteRespuestaDTO[]>([]);
  readonly contratos = signal<ContratoResumen[]>([]);
  readonly ordenes = signal<OrdenPagoResumenDTO[]>([]);
  readonly ordenesMes = signal<OrdenPagoResumenDTO[]>([]);
  readonly detalle = signal<OrdenPagoDetalleDTO | null>(null);

  readonly estadoFilter = signal<EstadoFiltro>('ALL');
  readonly fromFilter = signal<string | null>(null);
  readonly toFilter = signal<string | null>(null);
  readonly inquilinoFilter = signal<number | null>(null);

  readonly requestedDetalleId = signal<number | null>(null);

  readonly contratosMap = computed(() => {
    const map = new Map<number, ContratoResumen>();
    this.contratos().forEach((c) => {
      if (c?.id != null) map.set(Number(c.id), c);
    });
    return map;
  });

  readonly inquilinosOptions = computed(() => [
    { value: null, label: 'Todos los inquilinos' },
    ...this.residentes()
      .filter((r) => r?.id)
      .map((r) => ({
        value: Number(r.id),
        label: this.nombreResidente(r),
      })),
  ]);

  readonly ordenesView = computed<OrdenView[]>(() => this.mapOrdenesToView(this.ordenes()));
  readonly ordenesMesView = computed<OrdenView[]>(() => this.mapOrdenesToView(this.ordenesMes()));

  readonly kpiTotalOrdenes = computed(() => this.ordenes().length);
  readonly kpiPendientesPago = computed(
    () =>
      this.ordenes().filter((o) => (o.ultimaTransaccionEstado || '').toString().toUpperCase() === 'PENDIENTE').length
  );
  readonly kpiMontoPendiente = computed(() =>
    this.ordenesView().reduce((acc, o) => {
      const saldo = this.saldoConMora(o);
      if (saldo == null) return acc;
      return acc + saldo;
    }, 0)
  );
  readonly kpiEnMora = computed(() =>
    this.ordenes().filter((o) => ['VENCIDA', 'EN_MORA'].includes((o.estado || '').toString().toUpperCase())).length
  );
  readonly kpiMesTotal = computed(() => this.ordenesMes().length);
  readonly kpiMesPendiente = computed(() =>
    this.ordenesMesView().reduce((acc, o) => {
      const saldo = this.saldoConMora(o);
      if (saldo == null) return acc;
      return acc + saldo;
    }, 0)
  );
  readonly kpiMesCobrado = computed(() =>
    this.ordenesMesView().reduce((acc, o) => {
      const estado = (o.estado || '').toString().toUpperCase();
      const monto = this.parseNumber(o.montoBase ?? o.monto) ?? 0;
      const saldo = this.parseNumber(o.saldoPendiente) ?? 0;
      if (estado === 'PAGADA') return acc + monto;
      return acc + Math.max(0, monto - saldo);
    }, 0)
  );

  readonly modalAccion = signal<{ modo: 'APROBAR' | 'RECHAZAR'; tx: TransaccionPagoDTO | null }>({
    modo: 'APROBAR',
    tx: null,
  });
  readonly rechazoMotivo = signal<string>('');

  constructor() {
    this.condCtx.ensureLoaded().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.handleCondominioChange(this.condominioId());
    });

    effect(
      () => {
        const condId = this.condominioId();
        this.handleCondominioChange(condId);
      },
      { allowSignalWrites: true }
    );

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      this.requestedDetalleId.set(Number.isFinite(id) && id > 0 ? id : null);
      if (Number.isFinite(id) && id > 0) {
        this.openDetalle(id, false);
      } else if (!id) {
        this.detalle.set(null);
        this.detalleError.set(null);
      }
    });
  }

  async onEstadoChange(value: EstadoFiltro) {
    this.estadoFilter.set(value ?? 'ALL');
    await Promise.all([this.loadOrdenes(), this.loadOrdenesMes()]);
  }

  async onFechaChange() {
    await Promise.all([this.loadOrdenes(), this.loadOrdenesMes()]);
  }

  async onInquilinoChange(value: number | null) {
    const parsed = value == null || value === 0 ? null : Number(value);
    this.inquilinoFilter.set(Number.isFinite(parsed as number) ? (parsed as number) : null);
    await Promise.all([this.loadOrdenes(), this.loadOrdenesMes()]);
  }

  async onRefresh() {
    await this.loadContext();
    await Promise.all([this.loadOrdenes(this.detalle()?.id ?? this.requestedDetalleId()), this.loadOrdenesMes()]);
  }

  async aplicarFiltros() {
    await Promise.all([this.loadOrdenes(), this.loadOrdenesMes()]);
  }

  async limpiarFiltros() {
    this.estadoFilter.set('ALL');
    this.inquilinoFilter.set(null);
    this.fromFilter.set(null);
    this.toFilter.set(null);
    await Promise.all([this.loadOrdenes(), this.loadOrdenesMes()]);
  }

  openDetalle(id: number, navigate = true) {
    if (!id) return;
    this.requestedDetalleId.set(id);
    if (navigate) {
      // Refleja en la barra sin disparar navegación (evita recargar datos)
      this.location.replaceState(`/dashboard/pagos/${id}`);
    }
    this.loadDetalle(id);
  }

  closeDetalle() {
    this.detalle.set(null);
    this.detalleError.set(null);
    this.modalAccion.set({ modo: 'APROBAR', tx: null });
    this.rechazoMotivo.set('');
    this.requestedDetalleId.set(null);
    // Limpiamos el parámetro en la barra sin provocar navegación
    this.location.replaceState(`/dashboard/pagos`);
  }

  openAprobar(tx: TransaccionPagoDTO) {
    if (!tx || tx.estado !== 'PENDIENTE') return;
    this.modalAccion.set({ modo: 'APROBAR', tx });
    this.rechazoMotivo.set('');
  }

  openRechazar(tx: TransaccionPagoDTO) {
    if (!tx || tx.estado !== 'PENDIENTE') return;
    this.modalAccion.set({ modo: 'RECHAZAR', tx });
    this.rechazoMotivo.set('');
  }

  confirmarAccion() {
    const payload = this.modalAccion();
    const tx = payload.tx;
    if (!tx) return;
    if (payload.modo === 'APROBAR') {
      this.aprobarTransaccion(tx);
      return;
    }
    const motivo = this.rechazoMotivo().trim();
    if (!motivo) {
      this.toast.error('Ingresa un motivo de rechazo.');
      return;
    }
    this.rechazarTransaccion(tx, motivo);
  }

  formatCurrency(value?: number | string | null): string {
    const num = typeof value === 'string' ? Number(value) : value ?? 0;
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  }

  formatPeriodo(periodo?: string | null): string {
    if (!periodo) return 'N/D';
    const normalized = periodo.length === 7 ? `${periodo}-01` : periodo;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return periodo;
    return new Intl.DateTimeFormat('es-EC', { month: 'short', year: 'numeric' }).format(d);
  }

  formatDate(value?: string | null): string {
    if (!value) return 'N/D';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  }

  estadoClase(estado?: string | null): string {
    const e = (estado || '').toString().toUpperCase();
    if (e === 'PAGADA') return 'badge success';
    if (e === 'PENDIENTE') return 'badge warning';
    if (e === 'EN_MORA' || e === 'VENCIDA') return 'badge danger';
    return 'badge';
  }

  txClase(estado?: string | null): string {
    const e = (estado || '').toString().toUpperCase();
    if (e === 'APROBADO') return 'badge success';
    if (e === 'PENDIENTE') return 'badge warning';
    if (e === 'RECHAZADO') return 'badge danger';
    return 'badge';
  }

  saldoPendienteLabel(orden: OrdenView): string {
    const saldo = this.saldoConMora(orden);
    if (saldo == null) return 'N/D';
    return this.formatCurrency(saldo);
  }

  pagadoLabel(orden: OrdenView): string {
    return this.formatCurrency(this.pagadoMonto(orden));
  }

  private async handleCondominioChange(condId: number | null) {
    if (condId === this.lastCondominioId && this.residentes().length) return;
    this.lastCondominioId = condId;
    this.inquilinoFilter.set(null);
    this.detalle.set(null);
    this.error.set(null);
    if (!condId) {
      this.residentes.set([]);
      this.contratos.set([]);
      this.ordenes.set([]);
      this.ordenesMes.set([]);
      return;
    }
    await this.loadContext();
    await Promise.all([this.loadOrdenes(this.requestedDetalleId()), this.loadOrdenesMes()]);
  }

  private async loadContext() {
    const condId = this.condominioId();
    if (!condId) return;
    this.loadingContext.set(true);
    try {
      await this.loadResidentes(condId);
      await this.loadContratos(condId);
    } finally {
      this.loadingContext.set(false);
    }
  }

  private async loadResidentes(condId: number) {
    const list = await firstValueFrom(
      this.residentesService.listByCondominio(condId).pipe(
        catchError((err) => {
          console.error('[Pagos] residentes error', err);
          this.toast.error('No se pudieron cargar los inquilinos.');
          return of<ResidenteRespuestaDTO[]>([]);
        })
      )
    );
    this.residentes.set(list || []);
  }

  private async loadContratos(condId: number) {
    const residentes = this.residentes().filter((r) => r?.id);
    if (!residentes.length) {
      this.contratos.set([]);
      return;
    }
    const calls = residentes.map((r) =>
      this.contratoService.listByResidente(Number(r.id)).pipe(catchError(() => of([] as ContratoResumen[])))
    );
    const chunks = calls.length ? await firstValueFrom(forkJoin(calls)) : [];
    const merged = (chunks || []).flat();
    const filtered = merged.filter((c) => residentes.some((r) => Number(r.id) === Number(c.idResidente)));
    const unique = Array.from(new Map(filtered.map((c) => [Number(c.id), c])).values());
    this.contratos.set(unique);
  }

  private contratosFiltradosPorInquilino(): ContratoResumen[] {
    const inquilino = this.inquilinoFilter();
    const contratos = this.contratos();
    if (!inquilino) return contratos;
    return contratos.filter((c) => Number(c.idResidente) === Number(inquilino));
  }

  private async loadOrdenes(openAfterLoad?: number | null) {
    const condId = this.condominioId();
    if (!condId) {
      this.ordenes.set([]);
      return;
    }
    const contratos = this.contratosFiltradosPorInquilino();
    if (!contratos.length) {
      this.ordenes.set([]);
      return;
    }

    this.loadingOrdenes.set(true);
    this.error.set(null);

    const paramsBase = {
      estado: this.estadoFilter() === 'ALL' ? undefined : this.estadoFilter(),
      from: this.fromFilter() || undefined,
      to: this.toFilter() || undefined,
      flat: true,
      size: 80,
      sortBy: 'fechaEmision',
      sortDir: 'DESC' as const,
    };

    try {
      const calls = contratos.map((c) =>
        this.ordenesService
          .list({ ...paramsBase, contratoId: Number(c.id) })
          .pipe(catchError(() => of({ items: [] as OrdenPagoResumenDTO[] })))
      );
      const responses = calls.length ? await firstValueFrom(forkJoin(calls)) : [];
      const merged = (responses || []).flatMap((r) => r?.items || []);
      const unique = Array.from(new Map(merged.map((o) => [o.id, o])).values());
      this.ordenes.set(unique);
      if (openAfterLoad && unique.some((o) => o.id === openAfterLoad)) {
        this.loadDetalle(openAfterLoad);
      }
    } catch (err) {
      console.error('[Pagos] list ordenes error', err);
      this.error.set('No se pudieron cargar las ordenes de pago.');
    } finally {
      this.loadingOrdenes.set(false);
    }
  }

  private async loadOrdenesMes() {
    const condId = this.condominioId();
    if (!condId) {
      this.ordenesMes.set([]);
      return;
    }
    const contratos = this.contratosFiltradosPorInquilino();
    if (!contratos.length) {
      this.ordenesMes.set([]);
      return;
    }

    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    const paramsBase = {
      estado: this.estadoFilter() === 'ALL' ? undefined : this.estadoFilter(),
      from,
      to,
      flat: true,
      size: 100,
      sortBy: 'fechaEmision',
      sortDir: 'DESC' as const,
    };

    try {
      const calls = contratos.map((c) =>
        this.ordenesService
          .list({ ...paramsBase, contratoId: Number(c.id) })
          .pipe(catchError(() => of({ items: [] as OrdenPagoResumenDTO[] })))
      );
      const responses = calls.length ? await firstValueFrom(forkJoin(calls)) : [];
      const merged = (responses || []).flatMap((r) => r?.items || []);
      const unique = Array.from(new Map(merged.map((o) => [o.id, o])).values());
      this.ordenesMes.set(unique);
    } catch (err) {
      console.error('[Pagos] list ordenes mes error', err);
      this.ordenesMes.set([]);
    }
  }

  private loadDetalle(id: number) {
    if (!id) return;
    this.loadingDetalle.set(true);
    this.detalleError.set(null);
    this.ordenesService
      .getDetalle(id)
      .pipe(
        catchError((err) => {
          console.error('[Pagos] detalle error', err);
          this.detalleError.set('No se pudo cargar el detalle de la orden.');
          this.toast.error(err?.status === 403 ? 'No tienes permisos para ver esta orden.' : 'No se pudo cargar el detalle.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((d) => {
        this.loadingDetalle.set(false);
        if (!d) return;
        this.detalle.set(d);
      });
  }

  private aprobarTransaccion(tx: TransaccionPagoDTO) {
    const idAdmin = this.obtenerIdAdmin();
    this.pagosService
      .aprobarTransaccion(Number(tx.id), idAdmin)
      .pipe(
        catchError((err) => {
          console.error('[Pagos] aprobar error', err);
          this.toast.error(err?.status === 403 ? 'No tienes permisos para realizar esta accion.' : 'No se pudo aprobar el pago.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((resp) => {
        if (!resp) return;
        this.toast.success('Pago aprobado.');
        this.closeModal();
        this.loadDetalle(this.detalle()?.id || tx.ordenPago?.id || 0);
        this.loadOrdenes();
      });
  }

  private rechazarTransaccion(tx: TransaccionPagoDTO, motivo: string) {
    const idAdmin = this.obtenerIdAdmin();
    this.pagosService
      .rechazarTransaccion(Number(tx.id), motivo, idAdmin)
      .pipe(
        catchError((err) => {
          console.error('[Pagos] rechazar error', err);
          this.toast.error(err?.status === 403 ? 'No tienes permisos para realizar esta accion.' : 'No se pudo rechazar el pago.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((resp) => {
        if (!resp) return;
        this.toast.success('Pago rechazado.');
        this.closeModal();
        this.loadDetalle(this.detalle()?.id || tx.ordenPago?.id || 0);
        this.loadOrdenes();
      });
  }

  private nombreResidente(residente: ResidenteRespuestaDTO): string {
    const usuario = residente.usuario || ({} as any);
    const nombres = usuario.nombres || residente.usuarioNombre || '';
    const apellidos = usuario.apellidos || residente.usuarioApellido || '';
    const name = `${nombres} ${apellidos}`.trim();
    if (name) return name;
    return `Residente #${residente.id}`;
  }

  private pagadoMonto(orden: OrdenView): number {
    const monto = this.parseNumber(orden.monto ?? orden.montoBase) ?? 0;
    const saldo = this.parseNumber(orden.saldoPendiente);
    const estado = (orden.estado || '').toString().toUpperCase();
    if (estado === 'PAGADA') return monto;
    if (saldo == null) return 0;
    return Math.max(0, monto - saldo);
  }

  private saldoConMora(orden: OrdenView): number | null {
    const saldo = this.parseNumber(orden.saldoPendiente);
    const mora = this.parseNumber(orden.mora);
    const estado = (orden.estado || '').toString().toUpperCase();
    if (estado === 'PAGADA') return 0;
    if (saldo != null) return saldo;
    if (mora == null) return null;
    const base = this.parseNumber(orden.montoBase ?? orden.monto) ?? 0;
    return base + mora;
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  }

  comprobanteUrls(tx: TransaccionPagoDTO): string[] {
    const base = environment.apiUrl || '';
    const keys: string[] = [];
    const single = (tx as any)?.comprobanteStorageKey;
    if (single) keys.push(single);
    const multi = (tx as any)?.comprobantes;
    if (Array.isArray(multi)) {
      multi.forEach((k) => {
        if (k) keys.push(k);
      });
    }
    return Array.from(new Set(keys))
      .map((k) => (typeof k === 'string' ? k : String(k)))
      .filter(Boolean)
      .map((k) => {
        if (k.startsWith('http')) return k;
        if (k.startsWith('/files')) return `${base}${k}`;
        if (k.startsWith('/')) return `${base}${k}`;
        return `${base}/files/${k}`;
      });
  }

  private obtenerIdAdmin(): number {
    return Number(this.auth.snapshot.idUsuario ?? (this.auth.snapshot.profile as any)?.idUsuario ?? 0);
  }

  private puedeGestionar(): boolean {
    const role = normalizeRole(this.auth.snapshot.role || (this.auth.snapshot.profile as any)?.rol);
    return role === 'ADMIN' || role === 'OWNER';
  }

  get puedeAprobar(): boolean {
    return this.puedeGestionar();
  }

  closeModal() {
    this.modalAccion.set({ modo: 'APROBAR', tx: null });
    this.rechazoMotivo.set('');
  }

  saldoDetalleConMora(det?: OrdenPagoDetalleDTO | null): number | null {
    if (!det) return null;
    const saldo = this.parseNumber(det.saldoPendiente);
    const mora = this.parseNumber((det as any).mora ?? det.mora);
    const estado = (det.estado || '').toString().toUpperCase();
    if (estado === 'PAGADA') return 0;
    if (saldo != null) return saldo;
    if (mora == null) return null;
    const base = this.parseNumber(det.montoBase ?? det.total) ?? 0;
    return base + mora;
  }

  private mapOrdenesToView(list: OrdenPagoResumenDTO[]): OrdenView[] {
    const map = this.contratosMap();
    const condNombre = this.condominioNombre();
    return (list || [])
      .map((o) => {
        const contrato = map.get(Number(o.idContrato));
        const estado = (o.estado || '').toString().toUpperCase();
        const base = this.parseNumber(o.montoBase ?? o.monto);
        const total = this.parseNumber((o as any).monto ?? o.monto ?? base);
        const saldo = this.parseNumber((o as any).saldoPendiente);
        const mora = this.parseNumber((o as any).moraAcumulada ?? (o as any).mora);
        const saldoPendiente = estado === 'PAGADA' ? 0 : saldo ?? null;
        const totalBase = base ?? total ?? 0;
        const totalConMora = totalBase + (mora ?? 0);
        return {
          id: o.id,
          contratoId: o.idContrato,
          periodo: o.periodo,
          fechaVencimiento: o.fechaVencimiento,
          estado: o.estado,
          ultimaTransaccionEstado: o.ultimaTransaccionEstado,
          monto: totalBase,
          montoBase: o.montoBase ?? o.monto,
          saldoPendiente,
          mora,
          totalConMora,
          unidad: contrato?.numeroUnidad ?? null,
          inquilino: contrato?.nombreResidente ?? null,
          condominio: condNombre || null,
        };
      })
      .sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''));
=======
    UtilsModule,
    SidebarComponent,
    QRCodeComponent,
  ],
  templateUrl: "./pagos.component.html",
  styleUrls: ["./pagos.component.css"],
})
export class PagosComponent implements OnInit {
  private ordenesPagoService = inject(OrdenesPagoService);

  // ============================
  // Valores iniciales y selects
  // ============================

  readonly currentYear = new Date().getFullYear();
  readonly currentMonth = new Date().getMonth() + 1;

  aniosDisponibles: number[] = Array.from(
    { length: 6 },
    (_, i) => this.currentYear - 2 + i
  );

  meses = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ];

  pageSizeOptions = [10, 20, 50, 100];

  // ============================
  // Filtros
  // ============================

  filtros = {
    contratoId: null as number | null,
    estado: "" as OrdenPagoEstado | "",
    from: "",
    to: "",
    page: 0,
    size: 10,
    sortBy: "fechaEmision",
    sortDir: "DESC" as "ASC" | "DESC",
  };

  // ============================
  // Datos
  // ============================

  ordenes: OrdenPagoResumenDTO[] = [];
  pageInfo: PageResponse<OrdenPagoResumenDTO> | null = null;

  resumenEstados: OrdenPagoResumenEstados = {};
  ingresos: IngresoMensualDTO[] = [];

  loading = false;

  estados: OrdenPagoEstado[] = ["PENDIENTE", "PAGADA", "VENCIDA", "EN_MORA"];

  // ============================
  // Generación mensual
  // ============================

  anioGenerar: number | null = this.currentYear;
  mesGenerar: number | null = this.currentMonth;
  generacionResultado: OrdenPagoGeneracionMensualResponseDTO | null = null;
  generacionError: string | null = null;

  // ============================
  // QR MODAL
  // ============================

  qrVisible: boolean = false;
  qrData: string = "";
  qrOrdenId: number | null = null;

  constructor() {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  // ============================
  // Cargas principales
  // ============================

  cargarTodo() {
    this.cargarListado();
    this.cargarResumen();
    this.cargarIngresos();
  }

  cargarListado() {
    this.loading = true;

    const params = {
      contratoId: this.filtros.contratoId ?? undefined,
      estado: this.filtros.estado,
      from: this.filtros.from || undefined,
      to: this.filtros.to || undefined,
      page: this.filtros.page,
      size: this.filtros.size,
      sortBy: this.filtros.sortBy,
      sortDir: this.filtros.sortDir,
    };

    this.ordenesPagoService.listarGeneral(params).subscribe({
      next: (resp: any) => {
        if ("content" in resp) {
          this.pageInfo = resp;
          this.ordenes = resp.content;
        } else {
          this.pageInfo = null;
          this.ordenes = resp as OrdenPagoResumenDTO[];
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      },
    });
  }

  cargarResumen() {
    const params = {
      contratoId: this.filtros.contratoId ?? undefined,
      from: this.filtros.from || undefined,
      to: this.filtros.to || undefined,
    };

    this.ordenesPagoService.resumen(params).subscribe({
      next: (res) => (this.resumenEstados = res),
      error: (err) => console.error(err),
    });
  }

  cargarIngresos() {
    const params = {
      contratoId: this.filtros.contratoId ?? undefined,
      from: this.filtros.from || undefined,
      to: this.filtros.to || undefined,
    };

    this.ordenesPagoService.ingresosMensuales(params).subscribe({
      next: (res) => (this.ingresos = res),
      error: (err) => console.error(err),
    });
  }

  // ============================
  // Filtros + paginación
  // ============================

  aplicarFiltros() {
    this.filtros.page = 0;
    this.cargarTodo();
  }

  limpiarFiltros() {
    this.filtros = {
      contratoId: null,
      estado: "",
      from: "",
      to: "",
      page: 0,
      size: 10,
      sortBy: "fechaEmision",
      sortDir: "DESC",
    };
    this.cargarTodo();
  }

  paginaAnterior() {
    if (!this.pageInfo || this.pageInfo.first) return;
    this.filtros.page = this.pageInfo.page - 1;
    this.cargarListado();
  }

  paginaSiguiente() {
    if (!this.pageInfo || this.pageInfo.last) return;
    this.filtros.page = this.pageInfo.page + 1;
    this.cargarListado();
  }

  marcarPagada(id: number) {
    this.ordenesPagoService.marcarPagada(id).subscribe({
      next: () => this.cargarTodo(),
      error: (err) => console.error(err),
    });
  }

  // ============================
  // Generar órdenes del mes
  // ============================

  generarMes() {
    this.generacionError = null;
    this.generacionResultado = null;

    if (!this.anioGenerar || !this.mesGenerar) {
      this.generacionError = "Debes seleccionar un año y un mes.";
      return;
    }

    this.ordenesPagoService
      .generarParaMes(this.anioGenerar, this.mesGenerar)
      .subscribe({
        next: (res) => {
          this.generacionResultado = res;
          this.cargarTodo();
        },
        error: (err) => {
          this.generacionError =
            err?.error?.error || "Error al generar las órdenes.";
        },
      });
  }

  // ============================
  // QR handlers
  // ============================

  mostrarQR(orden: OrdenPagoResumenDTO) {
    this.qrVisible = true;
    this.qrOrdenId = orden.id;

    this.qrData = JSON.stringify({
      tipo: "ORDEN_PAGO",
      ordenId: orden.id,
      contratoId: orden.idContrato,
      monto: orden.monto,
      vencimiento: orden.fechaVencimiento,
    });
  }

  cerrarQR() {
    this.qrVisible = false;
    this.qrData = "";
    this.qrOrdenId = null;
>>>>>>> 98f67ccd7c00017fca0cf5be3e50f83cf390309a
  }
}

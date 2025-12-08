import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilsModule } from '../../../../utils/utils.module';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MatIconModule } from '@angular/material/icon';
import { ChartData, ChartOptions } from 'chart.js';
import { CondominioContextService } from '../../../../core/services/condominio-context.service';
import { CondominiosService } from '../../../../core/services/condominios.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { ContratoService } from '../../../../core/services/contrato.service';
import { DashboardOrden } from '../../../../core/models/dashboard.model';
import { CondominioResumenDTO } from '../../../../core/models/condominio.model';
import { ContratoResumen } from '../../../../core/models/contrato.model';
import { forkJoin, of, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, UtilsModule, BaseChartDirective, MatIconModule],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnDestroy {
  private condCtx = inject(CondominioContextService);
  private condoService = inject(CondominiosService);
  private dashboardService = inject(DashboardService);
  private contratoService = inject(ContratoService);
  private subs = new Subscription();
  private lastId: number | null = null;
  private ensuredLoad = false;

  condominio = signal<CondominioResumenDTO | null>(null);
  loading = signal(false);
  unidades = signal({ total: 0, ocupadas: 0, libres: 0 });
  kpis = signal({ ingresosMes: 0, deuda: 0 });
  proximosPagos = signal<DashboardOrden[]>([]);
  pagosRecientes = signal<DashboardOrden[]>([]);
  contratosRecientes = signal<ContratoResumen[]>([]);
  ingresosMensuales = signal<{ mes: string; montoTotal: number }[]>([]);

  readonly condominioId = computed(() => {
    const ctx = this.condCtx.state();
    const current = this.condCtx.condominioActual();
    if (current?.id != null) return Number(current.id);
    return ctx.condominioActualId ?? null;
  });

  estadosData: ChartData<'doughnut'> = {
    labels: ['Pendientes', 'Pagadas', 'Vencidas', 'En Mora'],
    datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#facc15', '#4ade80', '#f87171', '#fb7185'] }],
  };

  ingresosData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: 'Ingresos (USD)', backgroundColor: '#2b59ff' }],
  };

  ingresosOpts: ChartOptions<'bar'> = {
    responsive: true,
    scales: { x: { ticks: { color: '#6b7280' } }, y: { beginAtZero: true, ticks: { color: '#6b7280' } } },
    plugins: { legend: { display: true }, tooltip: { enabled: true } },
  };

  estadosOpts: ChartOptions<'doughnut'> = { responsive: true, plugins: { legend: { position: 'bottom' } } };

  private dashboardEffect = effect(() => {
    const ctx = this.condCtx.state();
    const id = this.condominioId();

    // Carga condominios una vez si aún no hay lista
    if (!this.ensuredLoad && !ctx.loading && (!ctx.condominios || ctx.condominios.length === 0)) {
      this.ensuredLoad = true;
      if (console && console.log) console.log('[Dashboard] Cargando mis condominios inicial');
      this.condCtx.loadMisCondominios().subscribe();
      return;
    }

    // Sin selección: limpiar estado
    if (!id) {
      if (console && console.log) console.log('[Dashboard] Sin condominio seleccionado');
      this.lastId = null;
      this.reset();
      return;
    }

    // Evitar recargar si no cambia
    if (this.lastId === id) return;
    this.lastId = id;

    if (console && console.log) console.log('[Dashboard] Cargando datos de condominio', id);
    this.reset();
    this.subs.unsubscribe();
    this.subs = new Subscription();
    this.cargarData(id);
  }, { allowSignalWrites: true });

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private reset() {
    this.loading.set(false);
    this.condominio.set(null);
    this.unidades.set({ total: 0, ocupadas: 0, libres: 0 });
    this.kpis.set({ ingresosMes: 0, deuda: 0 });
    this.proximosPagos.set([]);
    this.pagosRecientes.set([]);
    this.contratosRecientes.set([]);
    this.ingresosMensuales.set([]);
    this.estadosData = { ...this.estadosData, datasets: [{ ...this.estadosData.datasets[0], data: [0, 0, 0, 0] }] };
    this.ingresosData = { labels: [], datasets: [{ data: [], label: 'Ingresos (USD)', backgroundColor: '#2b59ff' }] };
  }

  private cargarData(condominioId: number) {
    this.loading.set(true);
    this.subs.add(
      this.condoService.getById(condominioId).subscribe({
        next: (c) => this.condominio.set(c),
        error: () => {
          this.condCtx.setCondominioActual(null);
          this.reset();
        },
      })
    );

    this.subs.add(
      this.condoService.unidadesPorCondominio(condominioId).subscribe({
        next: (list: any[]) => {
          const total = list.length;
          const ocupadas = list.filter((u) => (u.estado || '').toUpperCase() === 'OCUPADA').length;
          const libres = list.filter((u) => (u.estado || '').toUpperCase() === 'LIBRE').length;
          this.unidades.set({ total, ocupadas, libres });
        },
        error: () => this.unidades.set({ total: 0, ocupadas: 0, libres: 0 }),
      })
    );

    this.subs.add(
      this.condoService.resumenOcupacion(condominioId).subscribe({
        next: (res) => {
          const total = res?.total ?? res?.unidadesTotales ?? this.unidades().total;
          const libres = res?.libres ?? res?.unidadesLibres ?? this.unidades().libres;
          const ocupadas = res?.ocupadas ?? res?.unidadesOcupadas ?? this.unidades().ocupadas;
          this.unidades.set({ total, ocupadas, libres });
        },
        error: () => {},
      })
    );

    this.subs.add(
      this.dashboardService
        .getResidentesByCondominio(condominioId)
        .pipe(
          switchMap((residentes: any[]) => {
            if (!residentes.length) return of({ contratos: [] as ContratoResumen[], ordenes: [] as DashboardOrden[] });
            const contratosReqs = residentes
              .map((r) => r.id)
              .filter((id: any): id is number => id != null)
              .map((id) => this.contratoService.listByResidente(id));
            const contratos$ = contratosReqs.length ? forkJoin(contratosReqs).pipe(map((chunks: any[]) => chunks.flat())) : of<ContratoResumen[]>([]);
            return contratos$.pipe(
              switchMap((contratos: ContratoResumen[]) => {
                if (!contratos.length) return of({ contratos, ordenes: [] as DashboardOrden[] });
                const ordenesReqs = contratos
                  .map((c) => c.id)
                  .filter((id): id is number => id != null)
                  .map((id) => this.dashboardService.getOrdenesByContrato(id));
                const ordenes$ = ordenesReqs.length ? forkJoin(ordenesReqs).pipe(map((chunks: any[]) => chunks.flat())) : of<DashboardOrden[]>([]);
                return forkJoin([of(contratos), ordenes$]).pipe(map(([contratos, ordenes]) => ({ contratos, ordenes })));
              })
            );
          })
        )
        .subscribe({
          next: ({ contratos, ordenes }: { contratos: ContratoResumen[]; ordenes: DashboardOrden[] }) => {
            this.contratosRecientes.set(
              [...contratos].sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || '')).slice(0, 5)
            );
            this.setStatsFromOrdenes(ordenes);
          },
          error: () => {
            this.reset();
          },
          complete: () => this.loading.set(false),
        })
    );
  }

  private setStatsFromOrdenes(ordenes: DashboardOrden[]) {
    const hoy = new Date();
    const monthKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const ingresosMes = ordenes
      .filter((o) => (o.estado || '').toLowerCase() === 'pagada')
      .filter((o) => (o.fechaEmision || o.fechaVencimiento || '').toString().startsWith(monthKey))
      .reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const deuda = ordenes
      .filter((o) => ['pendiente', 'en_mora', 'vencida'].includes((o.estado || '').toLowerCase()))
      .reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    this.kpis.set({ ingresosMes, deuda });

    const pendientes = ordenes.filter((o) => (o.estado || '').toLowerCase() === 'pendiente').length;
    const pagadas = ordenes.filter((o) => (o.estado || '').toLowerCase() === 'pagada').length;
    const vencidas = ordenes.filter((o) => (o.estado || '').toLowerCase() === 'vencida').length;
    const enMora = ordenes.filter((o) => (o.estado || '').toLowerCase() === 'en_mora').length;
    this.estadosData = {
      ...this.estadosData,
      datasets: [{ ...this.estadosData.datasets[0], data: [pendientes, pagadas, vencidas, enMora] }],
    };

    const ingresosByMonth: Record<string, number> = {};
    ordenes
      .filter((o) => (o.estado || '').toLowerCase() === 'pagada')
      .forEach((o) => {
        const key = (o.fechaEmision || o.fechaVencimiento || '').toString().slice(0, 7);
        if (!key) return;
        ingresosByMonth[key] = (ingresosByMonth[key] || 0) + (Number(o.total) || 0);
      });
    const serie = Object.entries(ingresosByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, montoTotal]) => ({ mes, montoTotal }));
    this.ingresosMensuales.set(serie);
    this.ingresosData = {
      labels: serie.map((r) => this.formatYearMonth(r.mes)),
      datasets: [{ data: serie.map((r) => r.montoTotal), label: 'Ingresos (USD)', backgroundColor: '#2b59ff' }],
    };

    this.proximosPagos.set(this.pickProximosPagos(ordenes));
    this.pagosRecientes.set(this.pickPagosRecientes(ordenes));
  }

  private pickProximosPagos(ordenes: DashboardOrden[]): DashboardOrden[] {
    const hoy = new Date().getTime();
    return [...ordenes]
      .filter((o) => (o.estado || '').toLowerCase() === 'pendiente')
      .filter((o) => {
        const due = o.fechaVencimiento ? new Date(o.fechaVencimiento).getTime() : null;
        return due ? due >= hoy : false;
      })
      .sort((a, b) => this.orderDate(a) - this.orderDate(b))
      .slice(0, 5);
  }

  private pickPagosRecientes(ordenes: DashboardOrden[]): DashboardOrden[] {
    return [...ordenes]
      .filter((o) => (o.estado || '').toLowerCase() === 'pagada')
      .sort((a, b) => this.orderDate(b) - this.orderDate(a))
      .slice(0, 5);
  }

  refrescar(): void {
    const id = this.condominioId();
    if (id) this.cargarData(id);
  }

  trackByPago = (_: number, o: DashboardOrden) => o.id;
  trackByContrato = (_: number, c: ContratoResumen) => c.id;

  private orderDate(o: DashboardOrden): number {
    const d = o.fechaEmision || o.fechaVencimiento;
    const ts = d ? new Date(d).getTime() : 0;
    return Number.isFinite(ts) ? ts : 0;
  }

  private formatYearMonth(ym: string): string {
    const [y, m] = ym.split('-').map((x) => parseInt(x, 10));
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesTxt = (meses[(m || 1) - 1] || '').trim();
    return `${mesTxt} ${y}`;
  }

  getLogoUrl(): string {
    const c = this.condominio();
    const url = (c as any)?.logoUrl;
    if (!url) return `${environment.apiUrl}/files/defaults/default-condominio-logo.png`;
    if (url.startsWith('http')) return url;
    const base = environment.apiUrl || '';
    if (url.startsWith('/files')) return `${base}${url}`;
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/files/${url}`;
  }

  getPortadaUrl(): string {
    const c = this.condominio();
    const url = (c as any)?.portadaUrl;
    if (!url) return `${environment.apiUrl}/files/defaults/default-condominio-portada.png`;
    if (url.startsWith('http')) return url;
    const base = environment.apiUrl || '';
    if (url.startsWith('/files')) return `${base}${url}`;
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/files/${url}`;
  }
}

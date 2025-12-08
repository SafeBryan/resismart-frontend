import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { CondominioContextService } from '../../../../core/services/condominio-context.service';
import { ResidentesService } from '../../../../core/services/residentes.service';
import { ContratoService } from '../../../../core/services/contrato.service';
import { OrdenesPagoService } from '../../../../core/services/ordenes-pago.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { CondominiosService } from '../../../../core/services/condominios.service';
import { ContratoResumen } from '../../../../core/models/contrato.model';
import { ResidenteRespuestaDTO } from '../../../../core/models/residente.model';
import { OrdenPagoResumenDTO, IngresoMensualDTO } from '../../../../core/models/orden-pago.model';
import { UiButtonComponent } from '../../../../shared/ui/ui-button.component';
import { UiCardComponent } from '../../../../shared/ui/ui-card.component';
import { UiTableComponent } from '../../../../shared/ui/ui-table.component';
import { UiInputFieldComponent } from '../../../../shared/ui/ui-input-field.component';

type TabKey = 'finanzas' | 'mora' | 'ocupacion';

type OrdenView = {
  id: number;
  contratoId: number;
  periodo: string;
  estado: string;
  montoBase: number;
  mora: number;
  saldoPendiente: number;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  inquilino?: string | null;
  unidad?: string | null;
  diasAtraso?: number | null;
};

type ResumenFinanciero = { ingresos: number; egresos: number; deuda: number; balance: number };
type ResumenEstados = Record<string, number>;
type SerieIngreso = { mes: string; monto: number };
type ResumenOcupacion = { total: number; ocupadas: number; libres: number; mantenimiento: number };

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, UiButtonComponent, UiCardComponent, UiTableComponent, UiInputFieldComponent],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css',
})
export class ReportesComponent {
  private condCtx = inject(CondominioContextService);
  private residentesService = inject(ResidentesService);
  private contratoService = inject(ContratoService);
  private ordenesService = inject(OrdenesPagoService);
  private dashboardService = inject(DashboardService);
  private condominiosService = inject(CondominiosService);

  private residenteMap = new Map<number, ResidenteRespuestaDTO>();
  private contratoMap = new Map<number, ContratoResumen>();

  activeTab = signal<TabKey>('finanzas');
  fromDate = signal(this.defaultFrom());
  toDate = signal(this.defaultTo());
  loading = signal(false);
  error = signal<string | null>(null);

  resumenFinanzas = signal<ResumenFinanciero>({ ingresos: 0, egresos: 0, deuda: 0, balance: 0 });
  ingresosSerie = signal<SerieIngreso[]>([]);
  ingresosMax = computed(() => Math.max(0, ...this.ingresosSerie().map((i) => i.monto || 0)));
  resumenEstados = signal<ResumenEstados>({});
  ocupacion = signal<ResumenOcupacion>({ total: 0, ocupadas: 0, libres: 0, mantenimiento: 0 });

  ordenes = signal<OrdenPagoResumenDTO[]>([]);
  morosidadSearch = signal('');
  morosidadEstado = signal<'ALL' | 'VENCIDA' | 'EN_MORA'>('ALL');

  readonly condominioId = computed(() => {
    const current = this.condCtx.condominioActual();
    if (current?.id != null) return Number(current.id);
    const ctx = this.condCtx.state();
    return ctx.condominioActualId ?? null;
  });

  readonly condominioNombre = computed(() => this.condCtx.condominioActual()?.nombre || '');

  readonly ordenesView = computed<OrdenView[]>(() =>
    (this.ordenes() || [])
      .map((o) => this.toOrdenView(o))
      .filter(Boolean)
      .sort((a, b) => (b.periodo || '').localeCompare(a.periodo || '')) as OrdenView[]
  );

  readonly morosidadOrdenes = computed<OrdenView[]>(() => {
    const estadoFiltro = this.morosidadEstado();
    const texto = this.morosidadSearch().toLowerCase().trim();
    return this.ordenesView().filter((o) => {
      const estado = (o.estado || '').toUpperCase();
      const matchEstado =
        estadoFiltro === 'ALL' ? ['VENCIDA', 'EN_MORA'].includes(estado) : estado === estadoFiltro;
      const matchTexto = !texto
        ? true
        : (o.inquilino || '').toLowerCase().includes(texto) ||
          (o.unidad || '').toLowerCase().includes(texto) ||
          String(o.contratoId || '').includes(texto);
      return matchEstado && matchTexto;
    });
  });

  readonly morosidadKpis = computed(() => {
    const list = this.morosidadOrdenes();
    const deuda = list.reduce((acc, o) => acc + (this.parseNumber(o.saldoPendiente) ?? 0), 0);
    const inquilinos = new Set(list.map((o) => o.inquilino || ''));
    return {
      deuda,
      deudores: inquilinos.size,
      ordenes: list.length,
    };
  });

  constructor() {
    this.condCtx.ensureLoaded().subscribe(() => {
      this.loadData();
    });

    effect(
      () => {
        const _id = this.condominioId();
        const _from = this.fromDate();
        const _to = this.toDate();
        void _id;
        void _from;
        void _to;
        this.loadData();
      },
      { allowSignalWrites: true }
    );
  }

  setTab(tab: TabKey) {
    this.activeTab.set(tab);
  }

  resetFechas() {
    this.fromDate.set(this.defaultFrom());
    this.toDate.set(this.defaultTo());
  }

  private defaultFrom(): string {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 5, 1); // últimos 6 meses
    return this.toInputDate(start);
  }

  private defaultTo(): string {
    return this.toInputDate(new Date());
  }

  private toInputDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private inRange(dateStr?: string | null): boolean {
    if (!dateStr) return true;
    const ts = new Date(dateStr).getTime();
    if (Number.isNaN(ts)) return true;
    const fromTs = new Date(this.fromDate()).getTime();
    const toTs = new Date(this.toDate()).getTime();
    return ts >= fromTs && ts <= toTs;
  }

  private filtrarPorRango(list: OrdenPagoResumenDTO[]): OrdenPagoResumenDTO[] {
    return (list || []).filter((o) => this.inRange(o.fechaEmision || o.periodo || o.fechaVencimiento));
  }

  private toOrdenView(o: OrdenPagoResumenDTO): OrdenView {
    const contrato = this.contratoMap.get(Number(o.idContrato));
    const residente = contrato?.idResidente ? this.residenteMap.get(Number(contrato.idResidente)) : null;
    const usuario = residente?.usuario;
    const nombre =
      usuario?.nombres || usuario?.apellidos
        ? `${usuario?.nombres ?? ''} ${usuario?.apellidos ?? ''}`.trim()
        : `${residente?.usuarioNombre ?? ''} ${residente?.usuarioApellido ?? ''}`.trim();
    const correo = usuario?.correo ?? residente?.usuarioEmail ?? '';
    const inquilino = nombre || correo || (contrato ? `Contrato #${contrato.id}` : null);

    const base = this.parseNumber(o.montoBase ?? (o as any).monto) ?? 0;
    const mora = this.parseNumber((o as any).moraAcumulada ?? (o as any).mora) ?? 0;
    const saldoPendiente = this.parseNumber((o as any).saldoPendiente) ?? base + mora;

    const diasAtraso = o.fechaVencimiento
      ? Math.max(
          0,
          Math.floor((new Date().getTime() - new Date(o.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24))
        )
      : null;

    return {
      id: o.id,
      contratoId: o.idContrato,
      periodo: o.periodo,
      estado: (o.estado || '').toString(),
      montoBase: base,
      mora,
      saldoPendiente,
      fechaEmision: o.fechaEmision,
      fechaVencimiento: o.fechaVencimiento,
      inquilino,
      unidad: contrato?.numeroUnidad ?? null,
      diasAtraso,
    };
  }

  private aggregateIngresos(chunks: IngresoMensualDTO[][]): SerieIngreso[] {
    const map = new Map<string, number>();
    (chunks || []).forEach((rows) =>
      (rows || []).forEach((r) => {
        const mesVal: any = (r as any)?.mes;
        let ym = '';
        if (typeof mesVal === 'string') {
          ym = mesVal.slice(0, 7);
        } else if (mesVal) {
          const y = mesVal.year ?? '';
          const m = String(mesVal.monthValue ?? mesVal.month ?? '').padStart(2, '0');
          ym = `${y}-${m}`;
        }
        const key = ym || 'N/D';
        map.set(key, (map.get(key) || 0) + (Number(r.montoTotal) || 0));
      })
    );
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, monto]) => ({ mes, monto }));
  }

  private mergeResumenEstados(list: Array<Record<string, number>>): ResumenEstados {
    const out: ResumenEstados = {};
    (list || []).forEach((m) => {
      Object.entries(m || {}).forEach(([estado, count]) => {
        out[estado] = (out[estado] || 0) + Number(count || 0);
      });
    });
    return out;
  }

  private resetData() {
    this.resumenFinanzas.set({ ingresos: 0, egresos: 0, deuda: 0, balance: 0 });
    this.ingresosSerie.set([]);
    this.resumenEstados.set({});
    this.ocupacion.set({ total: 0, ocupadas: 0, libres: 0, mantenimiento: 0 });
    this.ordenes.set([]);
    this.residenteMap.clear();
    this.contratoMap.clear();
  }

  async loadData() {
    const condId = this.condominioId();
    if (!condId) {
      this.resetData();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    try {
      // 1) Cargar residentes y contratos del condominio seleccionado
      const residentes = await firstValueFrom(
        this.residentesService.listByCondominio(condId).pipe(catchError(() => of<ResidenteRespuestaDTO[]>([])))
      );
      this.residenteMap = new Map(residentes.map((r) => [Number(r.id), r]));

      const contratoCalls =
        residentes && residentes.length
          ? residentes
              .filter((r) => r?.id)
              .map((r) => this.contratoService.listByResidente(Number(r.id)).pipe(catchError(() => of([] as ContratoResumen[]))))
          : [];
      const contratosChunks = contratoCalls.length ? await firstValueFrom(forkJoin(contratoCalls)) : [];
      const contratos = (contratosChunks as ContratoResumen[][]).flat();
      this.contratoMap = new Map(contratos.map((c) => [Number(c.id), c]));
      const contratoIds = contratos.map((c) => Number(c.id)).filter(Boolean);

      // 2) Cargar órdenes del condominio (por contrato) y filtrar por fecha
      const ordenCalls = contratoIds.map((id) =>
        this.ordenesService.listByContrato(id).pipe(catchError(() => of([] as OrdenPagoResumenDTO[])))
      );
      const ordenChunks = ordenCalls.length ? await firstValueFrom(forkJoin(ordenCalls)) : [];
      const todas = (ordenChunks as OrdenPagoResumenDTO[][]).flat();
      this.ordenes.set(this.filtrarPorRango(todas));

      // 3) Datos de reportes (finanzas, resumen estados, ingresos mensuales, ocupación)
      const resumenFin$ = this.dashboardService
        .getFinanciero(condId)
        .pipe(catchError(() => of({ ingresosDelMes: 0, egresosDelMes: 0, totalDeudaPorCobrar: 0, balanceGeneral: 0 })));

      const ingresos$ = contratoIds.length
        ? forkJoin(
            contratoIds.map((id) =>
              this.ordenesService.ingresosMensuales({ contratoId: id, from: this.fromDate(), to: this.toDate() })
            )
          )
        : of<IngresoMensualDTO[][]>([]);

      const resumenEstados$ = contratoIds.length
        ? forkJoin(
            contratoIds.map((id) =>
              this.ordenesService.resumen({ contratoId: id, from: this.fromDate(), to: this.toDate() })
            )
          )
        : of<Array<Record<string, number>>>([]);

      const ocupacion$ = this.condominiosService.resumenOcupacion(condId).pipe(catchError(() => of(null)));

      const [resumenFin, ingresosChunks, resumenEstadosList, ocupacion] = await Promise.all([
        firstValueFrom(resumenFin$),
        firstValueFrom(ingresos$),
        firstValueFrom(resumenEstados$),
        firstValueFrom(ocupacion$),
      ]);

      const serie = this.aggregateIngresos(ingresosChunks as IngresoMensualDTO[][]);
      this.ingresosSerie.set(serie);
      this.resumenEstados.set(this.mergeResumenEstados(resumenEstadosList as Array<Record<string, number>>));

      const ingresosTotal = serie.reduce((acc, r) => acc + (r.monto || 0), 0);
      const egresos = Number((resumenFin as any)?.egresosDelMes ?? 0);
      const deuda = Number((resumenFin as any)?.totalDeudaPorCobrar ?? 0);
      const balance =
        (resumenFin as any)?.balanceGeneral ??
        (Number.isFinite(ingresosTotal) && Number.isFinite(egresos) ? ingresosTotal - egresos : 0);
      this.resumenFinanzas.set({
        ingresos: Number.isFinite(ingresosTotal) && ingresosTotal > 0 ? ingresosTotal : Number((resumenFin as any)?.ingresosDelMes ?? 0),
        egresos,
        deuda,
        balance: Number(balance) || 0,
      });

      this.ocupacion.set({
        total: ocupacion?.total ?? ocupacion?.unidadesTotales ?? 0,
        ocupadas: ocupacion?.ocupadas ?? ocupacion?.unidadesOcupadas ?? 0,
        libres: ocupacion?.libres ?? ocupacion?.unidadesLibres ?? 0,
        mantenimiento: ocupacion?.mantenimiento ?? 0,
      });
    } catch (err) {
      console.error('[Reportes] error cargando datos', err);
      this.error.set('No se pudieron cargar los reportes. Intenta nuevamente.');
      this.resetData();
    } finally {
      this.loading.set(false);
    }
  }

  exportFinanzasCsv() {
    const rows = this.ordenesView().map((o) => ({
      periodo: o.periodo,
      estado: o.estado,
      montoBase: o.montoBase,
      mora: o.mora,
      saldo: o.saldoPendiente,
      fechaEmision: o.fechaEmision,
      fechaVencimiento: o.fechaVencimiento,
      inquilino: o.inquilino ?? '',
      unidad: o.unidad ?? '',
      contrato: o.contratoId,
    }));
    this.exportCsv('reportes-financieros.csv', rows, [
      { key: 'periodo', label: 'Periodo' },
      { key: 'estado', label: 'Estado' },
      { key: 'montoBase', label: 'Monto Base' },
      { key: 'mora', label: 'Mora' },
      { key: 'saldo', label: 'Saldo Pendiente' },
      { key: 'fechaEmision', label: 'Fecha Emision' },
      { key: 'fechaVencimiento', label: 'Fecha Vencimiento' },
      { key: 'inquilino', label: 'Inquilino' },
      { key: 'unidad', label: 'Unidad' },
      { key: 'contrato', label: 'Contrato' },
    ]);
  }

  exportMoraCsv() {
    const rows = this.morosidadOrdenes().map((o) => ({
      inquilino: o.inquilino ?? '',
      unidad: o.unidad ?? '',
      contrato: o.contratoId,
      periodo: o.periodo,
      estado: o.estado,
      saldo: o.saldoPendiente,
      mora: o.mora,
      diasAtraso: o.diasAtraso ?? 0,
      fechaVencimiento: o.fechaVencimiento,
    }));
    this.exportCsv('reporte-morosidad.csv', rows, [
      { key: 'inquilino', label: 'Inquilino' },
      { key: 'unidad', label: 'Unidad' },
      { key: 'contrato', label: 'Contrato' },
      { key: 'periodo', label: 'Periodo' },
      { key: 'estado', label: 'Estado' },
      { key: 'saldo', label: 'Saldo Pendiente' },
      { key: 'mora', label: 'Mora' },
      { key: 'diasAtraso', label: 'Dias atraso' },
      { key: 'fechaVencimiento', label: 'Fecha vencimiento' },
    ]);
  }

  private exportCsv(filename: string, rows: Record<string, unknown>[], headers: { key: string; label: string }[]) {
    const encode = (v: unknown) => {
      const str = v === null || v === undefined ? '' : String(v);
      const needsQuote = str.includes(',') || str.includes('"') || str.includes('\n');
      const escaped = str.replace(/"/g, '""');
      return needsQuote ? `"${escaped}"` : escaped;
    };

    const headerRow = headers.map((h) => encode(h.label)).join(',');
    const dataRows = rows.map((r) => headers.map((h) => encode(r[h.key])).join(','));
    const csv = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  trackByOrden = (_: number, o: OrdenView) => o.id;
}

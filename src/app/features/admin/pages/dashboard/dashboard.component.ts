import { Component, OnInit, signal, computed } from "@angular/core";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { UtilsModule } from "../../../../utils/utils.module";

// ✅ ng2-charts v5+ (standalone)
import {
  BaseChartDirective,
  provideCharts,
  withDefaultRegisterables,
} from "ng2-charts";
import { ChartData, ChartOptions } from "chart.js";

import { DashboardService } from "../../../../core/services/dashboard.service";
import {
  DashboardData,
  DashboardFilters,
  DashboardKpis,
  DashboardOrden,
  DashboardDocumento,
  DashboardActividad,
} from "../../../../core/models/dashboard.model";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, UtilsModule, BaseChartDirective],
  providers: [
    // ✅ Registra todos los elementos/escala/leyendas de Chart.js
    provideCharts(withDefaultRegisterables()),
  ],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
  constructor(
    private router: Router,
    private dashboardService: DashboardService
  ) {}

  // ==============================
  // ESTADO REACTIVO
  // ==============================
  loading = signal(false);
  data = signal<DashboardData | null>(null);
  filtros = signal<DashboardFilters>({});

  kpis = computed<DashboardKpis>(
    () =>
      this.data()?.kpis || {
        totalOrdenes: 0,
        pendientes: 0,
        pagadas: 0,
        vencidas: 0,
        enMora: 0,
        conComprobante: 0,
      }
  );

  ordenes = computed<DashboardOrden[]>(() => this.data()?.ordenes || []);
  documentos = computed<DashboardDocumento[]>(
    () => this.data()?.documentos || []
  );
  actividades = computed<DashboardActividad[]>(
    () => this.data()?.actividad || []
  );

  // ==============================
  // GRÁFICOS
  // ==============================
  estadosData: ChartData<"doughnut"> = {
    labels: ["Pendientes", "Pagadas", "Vencidas", "En Mora"],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ["#facc15", "#4ade80", "#f87171", "#fb7185"],
      },
    ],
  };

  estadosOpts: ChartOptions<"doughnut"> = {
    responsive: true,
    plugins: { legend: { position: "bottom" } },
  };

  ingresosData: ChartData<"bar"> = {
    labels: [],
    datasets: [
      { data: [], label: "Ingresos (USD)", backgroundColor: "#4f46e5" },
    ],
  };

  ingresosOpts: ChartOptions<"bar"> = {
    responsive: true,
    scales: {
      x: { ticks: { color: "#6b7280" } },
      y: { beginAtZero: true, ticks: { color: "#6b7280" } },
    },
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true },
    },
  };

  // ==============================
  // CICLO DE VIDA
  // ==============================
  ngOnInit(): void {
    this.cargarDashboard();
  }

  /** Carga inicial del dashboard */
  cargarDashboard(): void {
    this.loading.set(true);
    const filtros = this.filtros();
    this.dashboardService.loadDashboardData(filtros).subscribe({
      next: (res) => {
        this.data.set(res); // ← incluye actividad reciente desde el service
        this.actualizarCharts();
      },
      error: (err) => console.error("Error al cargar dashboard:", err),
      complete: () => this.loading.set(false),
    });
  }

  // ==============================
  // LÓGICA DE GRÁFICOS
  // ==============================
  private actualizarCharts(): void {
    const k = this.kpis();

    // Donut: estado de pagos
    this.estadosData = {
      labels: ["Pendientes", "Pagadas", "Vencidas", "En Mora"],
      datasets: [
        {
          data: [k.pendientes, k.pagadas, k.vencidas, k.enMora],
          backgroundColor: ["#facc15", "#4ade80", "#f87171", "#fb7185"],
        },
      ],
    };

    // Barras: ingresos mensuales (DINÁMICO usando el endpoint)
    const f = this.filtros();
    this.dashboardService
      .getIngresosMensuales({
        contratoId: f.contratoId,
        from: f.from,
        to: f.to,
      })
      .subscribe({
        next: (rows) => {
          // rows: [{ mes: "YYYY-MM", montoTotal: number }]
          const labels = rows.map((r) => this.formatYearMonth(r.mes));
          const data = rows.map((r) => Number(r.montoTotal || 0));

          this.ingresosData = {
            labels,
            datasets: [
              { data, label: "Ingresos (USD)", backgroundColor: "#4f46e5" },
            ],
          };
        },
        error: (err) => {
          console.error("Ingresos mensuales error:", err);
          // fallback para no dejar el gráfico vacío si falla
          this.ingresosData = {
            labels: [],
            datasets: [
              { data: [], label: "Ingresos (USD)", backgroundColor: "#4f46e5" },
            ],
          };
        },
      });
  }

  // Helper: "2025-10" -> "Oct 2025"
  private formatYearMonth(ym: string): string {
    const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
    const meses = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    const mesTxt = (meses[(m || 1) - 1] || "").trim();
    return `${mesTxt} ${y}`;
  }

  /** Acción de recargar manualmente */
  refrescar(): void {
    this.cargarDashboard();
  }

  /** trackBy para listas de actividad */
  trackByActividad = (_: number, a: DashboardActividad) =>
    `${a.id}-${a.documentoId}-${a.fecha}`;

  /** Cierra sesión */
  logout(): void {
    this.router.navigateByUrl("/login");
  }
}

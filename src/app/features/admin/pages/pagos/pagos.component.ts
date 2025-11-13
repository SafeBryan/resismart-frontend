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

@Component({
  selector: "app-pagos",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
  }
}

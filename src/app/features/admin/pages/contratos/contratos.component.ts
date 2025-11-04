import { Component, OnInit, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UtilsModule } from "../../../../utils/utils.module";
import { SidebarComponent } from "../../../../utils/sidebar/sidebar.component";
import {
  ContratoResumen,
  ContratosFiltro,
  ContratosStats,
  EstadoContrato,
} from "../../../../core/models/contrato.model";
import {
  ContratoService,
  ContratoRenovarInput,
  ContratoRescindirInput,
} from "../../../../core/services/contrato.service";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import {
  ContratoDialogComponent,
  DialogMode,
} from "./components/contrato-dialog/contrato-dialog.component"; // Importamos DialogMode

type EstadoFiltro = "" | EstadoContrato;

@Component({
  selector: "app-contratos",
  standalone: true,
  imports: [
    CommonModule,
    UtilsModule,
    SidebarComponent,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ContratoDialogComponent,
  ],
  templateUrl: "./contratos.component.html",
  styleUrls: ["./contratos.component.css"],
})
export class ContratosComponent implements OnInit {
  constructor(private contratosSrv: ContratoService) {}

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  data = signal<ContratoResumen[]>([]);
  filtros = signal<ContratosFiltro>({ buscar: "", estado: "" as EstadoFiltro });

  readonly estados: { value: EstadoFiltro; label: string }[] = [
    { value: "", label: "Todos los estados" },
    { value: EstadoContrato.PENDIENTE, label: "Pendiente" },
    { value: EstadoContrato.ACTIVO, label: "Activo" },
    { value: EstadoContrato.RESCINDIDO, label: "Rescindido" },
    { value: EstadoContrato.FINALIZADO, label: "Finalizado" },
  ];

  filtrados = computed(() =>
    this.contratosSrv.filterLocal(this.data(), this.filtros())
  );
  stats = computed(() => this.contratosSrv.buildStats(this.filtrados()));
  totalFiltrados = computed(() => this.filtrados().length);

  dialogVisible = signal(false);
  dialogMode = signal<DialogMode>("create");
  dialogContrato = signal<ContratoResumen | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.contratosSrv.listAll().subscribe({
      next: (list) => {
        const ordenados = [...(list || [])].sort((a, b) => {
          const da = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
          const db = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
          return db - da;
        });
        this.data.set(ordenados);
      },
      error: () => this.errorMsg.set("No se pudieron cargar los contratos."),
      complete: () => this.loading.set(false),
    });
  }

  refrescar(): void {
    this.loadData();
  }

  onBuscarChange(value: string): void {
    this.filtros.update((f) => ({ ...f, buscar: value ?? "" }));
  }

  onEstadoChange(value: EstadoFiltro): void {
    this.filtros.update((f) => ({ ...f, estado: value }));
  }

  abrirDetalle(): void {
    this.dialogContrato.set(null);
    this.dialogMode.set("create");
    this.dialogVisible.set(true);
  }

  abrirDetalleExistente(c: ContratoResumen): void {
    this.dialogContrato.set(c);
    this.dialogMode.set("view");
    this.dialogVisible.set(true);
  }

  onDialogClose(): void {
    this.dialogVisible.set(false);
  }

  onDialogSaved(_payload: any): void {
    this.dialogVisible.set(false);
    this.loadData();
  }

  confirmarRenovar(c: ContratoResumen): void {
    const nueva = prompt("Nueva fecha de fin (YYYY-MM-DD):", c.fechaFin || "");
    if (!nueva) return;
    const payload: ContratoRenovarInput = { nuevaFechaFin: nueva };
    this.loading.set(true);
    this.contratosSrv.renovar(Number(c.id), payload).subscribe({
      next: () => this.loadData(),
      error: () => {
        this.errorMsg.set("No se pudo renovar el contrato.");
        this.loading.set(false);
      },
    });
  }

  confirmarRescindir(c: ContratoResumen): void {
    if (!confirm("¿Rescindir este contrato?")) return;
    const payload: ContratoRescindirInput = {};
    this.loading.set(true);
    this.contratosSrv.rescindir(Number(c.id), payload).subscribe({
      next: () => this.loadData(),
      error: () => {
        this.errorMsg.set("No se pudo rescindir el contrato.");
        this.loading.set(false);
      },
    });
  }

  confirmarEliminar(c: ContratoResumen): void {
    if (!confirm("¿Eliminar el contrato de forma permanente?")) return;
    this.loading.set(true);
    this.contratosSrv.delete(Number(c.id)).subscribe({
      next: () => this.loadData(),
      error: () => {
        this.errorMsg.set("No se pudo eliminar el contrato.");
        this.loading.set(false);
      },
    });
  }

  trackById(_idx: number, item: ContratoResumen) {
    return item.id ?? _idx;
  }
}

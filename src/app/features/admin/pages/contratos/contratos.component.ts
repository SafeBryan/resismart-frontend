import { Component, OnInit, computed, effect, signal, inject, Injector, runInInjectionContext } from "@angular/core";
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
import { ToastService } from "../../../../core/services/toast.service";
import { DashboardService } from "../../../../core/services/dashboard.service";
import { CondominioContextService } from "../../../../core/services/condominio-context.service";
import { forkJoin, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";

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
  constructor(
    private contratosSrv: ContratoService,
    private toast: ToastService
  ) {}

  private dashboardSrv = inject(DashboardService);
  private condCtx = inject(CondominioContextService);
  private injector = inject(Injector);
  readonly condominioId = computed(() => this.condCtx.state().condominioActualId ?? null);

  loading = signal(false);
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
    this.condCtx.ensureLoaded().subscribe(() => {
      runInInjectionContext(this.injector, () =>
        effect(
          () => {
            const id = this.condCtx.state().condominioActualId ?? null;
            if (id) {
              this.data.set([]);
              this.loadData(id);
            } else {
              this.data.set([]);
            }
          },
          { allowSignalWrites: true }
        )
      );
    });
  }

  private loadData(condominioId: number): void {
    this.loading.set(true);
    this.data.set([]);
    this.dashboardSrv.getResidentesByCondominio(condominioId).pipe(
      switchMap((residentes) => {
        const ids = (residentes || []).map((r) => r.id).filter((id): id is number => id != null);
        if (!ids.length) return of<ContratoResumen[]>([]);
        const reqs = ids.map((id) => this.contratosSrv.listByResidente(id));
        return (reqs.length === 1 ? reqs[0] : forkJoin(reqs).pipe(map((chunks) => chunks.flat())));
      })
    ).subscribe({
      next: (list) => {
        const ordenados = [...(list || [])].sort((a, b) => {
          const da = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
          const db = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
          return db - da;
        });
        this.data.set(ordenados);
      },
      error: () => {
        this.toast.error("No se pudieron cargar los contratos.");
        this.data.set([]);
      },
      complete: () => this.loading.set(false),
    });
  }

  refrescar(): void {
    const id = this.condCtx.state().condominioActualId ?? null;
    if (id) this.loadData(id);
  }

  onBuscarChange(value: string): void {
    this.filtros.update((f) => ({ ...f, buscar: value ?? "" }));
  }

  onEstadoChange(value: EstadoFiltro): void {
    this.filtros.update((f) => ({ ...f, estado: value }));
  }

  abrirDetalle(): void {
    if (!this.condominioId()) {
      this.toast.error("Selecciona un condominio antes de crear un contrato.");
      return;
    }
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
    const id = this.condCtx.state().condominioActualId ?? null;
    if (id) this.loadData(id);
  }

  confirmarRenovar(c: ContratoResumen): void {
    const nueva = prompt("Nueva fecha de fin (YYYY-MM-DD):", c.fechaFin || "");
    if (!nueva) return;
    const payload: ContratoRenovarInput = { nuevaFechaFin: nueva };
    this.loading.set(true);
    this.contratosSrv.renovar(Number(c.id), payload).subscribe({
      next: () => {
        this.toast.success("Contrato renovado correctamente.");
        const id = this.condCtx.state().condominioActualId ?? null;
        if (id) this.loadData(id);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error("No se pudo renovar el contrato.");
      },
    });
  }

  async confirmarRescindir(c: ContratoResumen): Promise<void> {
    const confirmed = await this.toast.confirm("¿Rescindir este contrato?", {
      confirmText: "Rescindir",
      cancelText: "Cancelar",
      type: "error",
    });
    if (!confirmed) return;
    const payload: ContratoRescindirInput = {};
    this.loading.set(true);
    this.contratosSrv.rescindir(Number(c.id), payload).subscribe({
      next: () => {
        this.toast.success("Contrato rescindido correctamente.");
        const id = this.condCtx.state().condominioActualId ?? null;
        if (id) this.loadData(id);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error("No se pudo rescindir el contrato.");
      },
    });
  }

  async confirmarEliminar(c: ContratoResumen): Promise<void> {
    const confirmed = await this.toast.confirm("¿Eliminar el contrato de forma permanente?", {
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "error",
    });
    if (!confirmed) return;
    this.loading.set(true);
    this.contratosSrv.delete(Number(c.id)).subscribe({
      next: () => {
        this.toast.success("Contrato eliminado correctamente.");
        const id = this.condCtx.state().condominioActualId ?? null;
        if (id) this.loadData(id);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error("No se pudo eliminar el contrato.");
      },
    });
  }

  trackById(_idx: number, item: ContratoResumen) {
    return item.id ?? _idx;
  }
}

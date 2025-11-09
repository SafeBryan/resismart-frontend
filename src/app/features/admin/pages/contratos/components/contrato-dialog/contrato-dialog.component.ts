import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  computed,
  signal,
  inject,
} from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { ContratoService } from "../../../../../../core/services/contrato.service";
import { CondominiosService } from "../../../../../../core/services/condominios.service";
import { ResidentesService } from "../../../../../../core/services/residentes.service";
import {
  ContratoResumen,
  EstadoContrato,
} from "../../../../../../core/models/contrato.model";
import { CondominioResumenDTO } from "../../../../../../core/models/condominio.model";
import { UnidadDTO } from "../../../../../../core/models/unidad.model";
import { ResidenteRespuestaDTO } from "../../../../../../core/models/residente.model";
import { ToastService } from "../../../../../../core/services/toast.service";

export type DialogMode = "create" | "edit" | "view";

@Component({
  selector: "app-contrato-dialog",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: "./contrato-dialog.component.html",
  styleUrls: ["./contrato-dialog.component.css"],
})
export class ContratoDialogComponent implements OnInit {
  @Input() visible = false;
  @Input() mode: DialogMode = "create";
  @Input() contrato: ContratoResumen | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  saving = signal(false);

  condominios = signal<CondominioResumenDTO[]>([]);
  unidades = signal<UnidadDTO[]>([]);
  residentes = signal<ResidenteRespuestaDTO[]>([]);

  isCreate = () => this.mode === "create";
  isEdit = () => this.mode === "edit";
  isView = () => this.mode === "view";

  // Inyectamos servicios
  private fb = inject(FormBuilder);
  private contratoSrv = inject(ContratoService);
  private condoSrv = inject(CondominiosService);
  private resSrv = inject(ResidentesService);
  private toast = inject(ToastService);

  // Declaramos el form con tipo específico
  form: any;

  constructor() {
    // Inicializamos el form en el constructor
    this.form = this.fb.group({
      idCondominio: [null as number | null, []],
      idUnidad: [null as number | null, [Validators.required]],
      idResidente: [null as number | null, [Validators.required]],
      fechaInicio: ["", [Validators.required]],
      fechaFin: [""],
      monto: [null as number | null, [Validators.required, Validators.min(0)]],
      estado: [{ value: EstadoContrato.PENDIENTE, disabled: true }],
    });
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    if (this.contrato) {
      this.form.patchValue({
        idUnidad: this.contrato.idUnidad ?? null,
        idResidente: this.contrato.idResidente
          ? Number(this.contrato.idResidente)
          : null,
        fechaInicio: this.contrato.fechaInicio || "",
        fechaFin: this.contrato.fechaFin || "",
        monto: this.contrato.monto ?? null,
        estado: this.contrato.estado,
      });
      if (this.mode === "view") this.form.disable();
    }

    // CORRECCIÓN: Agregar tipo al parámetro idCondo
    this.form
      .get("idCondominio")
      ?.valueChanges.subscribe((idCondo: number | null) => {
        if (!idCondo) {
          this.unidades.set([]);
          return;
        }
        this.condoSrv
          .unidadesPorCondominio(Number(idCondo))
          .subscribe((u) => this.unidades.set(u || []));
      });
  }

  cargarCatalogos(): void {
    this.condoSrv.list(0, 200).subscribe({
      next: (p) => this.condominios.set(p?.content || []),
      error: () => this.condominios.set([]),
    });
    this.resSrv.list().subscribe({
      next: (r) => this.residentes.set(r || []),
      error: () => this.residentes.set([]),
    });
  }

  cancelar(): void {
    this.close.emit();
  }

  guardar(): void {
    if (this.isView() || this.form.invalid) return;

    const raw = this.form.getRawValue();
    const payloadCreate = {
      idUnidad: Number(raw.idUnidad),
      idResidente: Number(raw.idResidente),
      fechaInicio: String(raw.fechaInicio),
      fechaFin: raw.fechaFin ? String(raw.fechaFin) : undefined,
      monto: Number(raw.monto),
    };

    this.saving.set(true);

    if (this.isCreate()) {
      this.contratoSrv.create(payloadCreate as any).subscribe({
        next: (res) => {
          this.toast.success('Contrato creado correctamente.');
          this.saved.emit(res);
        },
        error: () => {
          this.toast.error('No se pudo crear el contrato.');
          this.saving.set(false);
        },
        complete: () => this.saving.set(false),
      });
      return;
    }

    if (this.isEdit() && this.contrato?.id) {
      const payloadUpdate = {
        fechaInicio: payloadCreate.fechaInicio,
        fechaFin: payloadCreate.fechaFin,
        monto: payloadCreate.monto,
        idUnidad: payloadCreate.idUnidad,
        idResidente: payloadCreate.idResidente,
      };
      this.contratoSrv
        .update(Number(this.contrato.id), payloadUpdate as any)
        .subscribe({
          next: (res) => {
            this.toast.success('Contrato actualizado correctamente.');
            this.saved.emit(res);
          },
          error: () => {
            this.toast.error('No se pudo actualizar el contrato.');
            this.saving.set(false);
          },
          complete: () => this.saving.set(false),
        });
    }
  }
}

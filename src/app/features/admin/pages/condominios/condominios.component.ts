import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { UtilsModule } from '../../../../utils/utils.module';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CondominiosService } from '../../../../core/services/condominios.service';
import { CondominioResumenDTO, CondominioCreateDTO, CondominioUpdateDTO } from '../../../../core/models/condominio.model';
import { UnidadDTO, UnidadCreateDTO, UnidadUpdateDTO } from '../../../../core/models/unidad.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { UsuarioDTO } from '../../../../core/models/residente.model';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-condominios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, UtilsModule, MatSelectModule, MatInputModule, MatButtonModule, MatIconModule, MatPaginatorModule],
  templateUrl: './condominios.component.html',
  styleUrl: './condominios.component.css'
})
export class CondominiosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(CondominiosService);
  private auth = inject(AuthService);
  private usuarios = inject(UsuariosService);
  private toast = inject(ToastService);

  // Data
  readonly loading = signal<boolean>(false);
  readonly condominios = signal<CondominioResumenDTO[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly selected = computed(() => this.condominios().find(c => c.id === this.selectedId()) || null);
  readonly unidades = signal<UnidadDTO[]>([]);
  readonly duenos = signal<UsuarioDTO[]>([]);
  readonly isOwner = computed(() => {
    const r = (this.auth.snapshot.role ?? '').toString().toUpperCase();
    return r === 'OWNER' || r === 'DUEÑO' || r === 'DUENO';
  });
  readonly currentUserId = computed(() => this.auth.snapshot.idUsuario as any);

  // Pagination (client-side for unidades)
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly total = computed(() => this.unidades().length);
  readonly pageData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.unidades().slice(start, start + this.pageSize());
  });

  // Modals
  readonly showAddCondo = signal(false);
  readonly showEditCondo = signal(false);
  readonly showAddUnidad = signal(false);
  readonly showEditUnidad = signal(false);
  editingUnidadId: number | null = null;

  // Forms
  addCondoForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    direccion: ['', Validators.required],
    telefono: [''],
    correo: [''],
    idDueno: [null, Validators.required],
  });
  editCondoForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    direccion: ['', Validators.required],
    telefono: [''],
    correo: [''],
    idDueno: [null, Validators.required],
  });
  addUnidadForm: FormGroup = this.fb.group({
    numero: ['', Validators.required],
    estado: ['LIBRE'],
  });
  editUnidadForm: FormGroup = this.fb.group({
    numero: ['', Validators.required],
    estado: ['LIBRE'],
  });

  ngOnInit(): void {
    this.loadCondominios();
    this.loadDuenosIfAdmin();
  }

  loadCondominios() {
    this.loading.set(true);
    this.service.list(0, 200).subscribe({
      next: (p) => {
        const list = (p?.content ?? []) as CondominioResumenDTO[];
        this.condominios.set(list);
        if (list.length > 0) {
          // Keep selection if still exists
          const curr = this.selectedId();
          const exists = curr && list.some(c => c.id === curr);
          this.selectedId.set(exists ? curr! : list[0].id ?? null);
          this.onSelectCondo(this.selectedId()!);
        } else {
          this.selectedId.set(null);
          this.unidades.set([]);
        }
      },
      error: () => {},
      complete: () => this.loading.set(false),
    });
  }

  loadDuenosIfAdmin() {
    if (this.isOwner()) return;
    this.usuarios.list().subscribe({
      next: (users) => {
        const list = (users || []).filter(u => {
          const rol = (u.rol ?? '').toString().toUpperCase();
          return rol === 'DUEÑO' || rol === 'DUENO' || rol === 'OWNER';
        });
        this.duenos.set(list);
      },
      error: () => this.duenos.set([]),
    });
  }

  onSelectCondo(id: number) {
    this.selectedId.set(id);
    this.pageIndex.set(0);
    this.service.unidadesPorCondominio(id).subscribe({
      next: (list) => this.unidades.set(list || []),
      error: () => this.unidades.set([]),
    });
  }

  onPage(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  // Condominios actions
  openAddCondo() {
    this.addCondoForm.reset();
    if (this.isOwner()) {
      this.addCondoForm.patchValue({ idDueno: this.currentUserId() });
    }
    this.showAddCondo.set(true);
  }
  submitAddCondo() {
    if (this.addCondoForm.invalid) return;
    const dto: CondominioCreateDTO = {
      ...(this.addCondoForm.value),
      idDueno: this.isOwner() ? (this.currentUserId() as number) : this.addCondoForm.value.idDueno,
    } as any;
    this.loading.set(true);
    this.service.create(dto).subscribe({
      next: () => {
        this.toast.success('Condominio agregado correctamente.');
        this.showAddCondo.set(false);
        this.loadCondominios();
      },
      error: () => {
        this.toast.error('No se pudo agregar el condominio.');
        this.loading.set(false);
      },
    });
  }
  openEditCondo() {
    const c = this.selected();
    if (!c) return;
    this.editCondoForm.reset({
      nombre: c.nombre ?? '',
      direccion: c.direccion ?? '',
      telefono: c.telefono ?? '',
      correo: c.correo ?? '',
      idDueno: this.isOwner() ? this.currentUserId() : (c.idDueno ?? null),
    });
    this.showEditCondo.set(true);
  }
  submitEditCondo() {
    if (this.editCondoForm.invalid || !this.selectedId()) return;
    const dto: CondominioUpdateDTO = {
      ...(this.editCondoForm.value),
      idDueno: this.isOwner() ? (this.currentUserId() as number) : this.editCondoForm.value.idDueno,
    } as any;
    this.loading.set(true);
    this.service.update(this.selectedId()!, dto).subscribe({
      next: () => {
        this.toast.success('Condominio actualizado correctamente.');
        this.showEditCondo.set(false);
        this.loadCondominios();
      },
      error: () => {
        this.toast.error('No se pudo actualizar el condominio.');
        this.loading.set(false);
      },
    });
  }
  async deleteCondo() {
    const id = this.selectedId();
    if (!id) return;
    const confirmed = await this.toast.confirm('¿Eliminar condominio seleccionado?', {
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'error',
    });
    if (!confirmed) return;
    this.loading.set(true);
    this.service.delete(id).subscribe({
      next: () => {
        this.toast.success('Condominio eliminado.');
        this.loadCondominios();
      },
      error: () => {
        this.toast.error('No se pudo eliminar el condominio.');
        this.loading.set(false);
      },
    });
  }

  // Unidades actions
  openAddUnidad() {
    this.addUnidadForm.reset({ estado: 'LIBRE' });
    this.showAddUnidad.set(true);
  }
  submitAddUnidad() {
    const condominioId = this.selectedId();
    if (this.addUnidadForm.invalid || !condominioId) return;
    const dto: UnidadCreateDTO = { ...(this.addUnidadForm.value), idCondominio: condominioId } as any;
    this.loading.set(true);
    this.service.agregarUnidad(condominioId, dto).subscribe({
      next: () => {
        this.toast.success('Unidad agregada correctamente.');
        this.showAddUnidad.set(false);
        this.onSelectCondo(condominioId);
      },
      error: () => {
        this.toast.error('No se pudo agregar la unidad.');
        this.loading.set(false);
      },
    });
  }
  openEditUnidad(u: UnidadDTO) {
    this.editingUnidadId = u.id ?? null;
    this.editUnidadForm.reset({ numero: u.numero ?? '', estado: u.estado ?? 'LIBRE' });
    this.showEditUnidad.set(true);
  }
  submitEditUnidad() {
    const id = this.editingUnidadId;
    if (this.editUnidadForm.invalid || id == null) return;
    const dto: UnidadUpdateDTO = this.editUnidadForm.value;
    const condominioId = this.selectedId()!;
    this.loading.set(true);
    this.service.actualizarUnidad(id, dto).subscribe({
      next: () => {
        this.toast.success('Unidad actualizada correctamente.');
        this.showEditUnidad.set(false);
        this.editingUnidadId = null;
        this.onSelectCondo(condominioId);
      },
      error: () => {
        this.toast.error('No se pudo actualizar la unidad.');
        this.loading.set(false);
      },
    });
  }
  async deleteUnidad(u: UnidadDTO) {
    if (!u.id) return;
    const confirmed = await this.toast.confirm('¿Eliminar unidad?', {
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'error',
    });
    if (!confirmed) return;
    const condominioId = this.selectedId()!;
    this.loading.set(true);
    this.service.eliminarUnidad(u.id).subscribe({
      next: () => {
        this.toast.success('Unidad eliminada.');
        this.onSelectCondo(condominioId);
      },
      error: () => {
        this.toast.error('No se pudo eliminar la unidad.');
        this.loading.set(false);
      },
    });
  }
}

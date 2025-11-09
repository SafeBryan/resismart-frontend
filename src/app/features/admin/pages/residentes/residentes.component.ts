import { Component, OnInit, AfterViewInit, computed, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { ResidentesService } from '../../../../core/services/residentes.service';
import { ResidenteRespuestaDTO, ResidenteDTO } from '../../../../core/models/residente.model';
import { CondominiosService } from '../../../../core/services/condominios.service';
import { CondominioResumenDTO } from '../../../../core/models/condominio.model';
import { UnidadDTO } from '../../../../core/models/unidad.model';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-residentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UtilsModule, SidebarComponent, MatIconModule, MatButtonModule, MatSelectModule, MatInputModule, MatPaginatorModule],
  templateUrl: './residentes.component.html',
  styleUrl: './residentes.component.css'
})
export class ResidentesComponent implements OnInit, AfterViewInit {
  private service = inject(ResidentesService);
  private condoService = inject(CondominiosService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  // Data
  readonly loading = signal<boolean>(false);
  readonly residentes = signal<ResidenteRespuestaDTO[]>([]);

  // Condominios y unidades (para modales)
  readonly condominios = signal<CondominioResumenDTO[]>([]);
  readonly unidadesOpciones = signal<UnidadDTO[]>([]);
  readonly selectedCondominioAdd = signal<number | null>(null);
  readonly selectedCondominioEdit = signal<number | null>(null);

  // Filters
  readonly q = signal<string>('');
  readonly estado = signal<'todos' | 'activos' | 'inactivos'>('todos');

  // Pagination (client-side)
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(10);

  readonly filtered = computed(() => {
    const term = this.q().trim().toLowerCase();
    const estado = this.estado();
    return this.residentes().filter(r => {
      const usuario = r.usuario || {} as any;
      const nombre = `${usuario.nombres ?? ''} ${usuario.apellidos ?? ''}`.toLowerCase();
      const email = (usuario.correo ?? '').toLowerCase();
      const cedula = (r.cedula ?? '').toLowerCase();
      const telefono = (r.telefono ?? '').toLowerCase();
      const matchesTerm = !term || nombre.includes(term) || email.includes(term) || cedula.includes(term) || telefono.includes(term);
      const matchesEstado = estado === 'todos' ? true : estado === 'activos' ? !!usuario.estado : !usuario.estado;
      return matchesTerm && matchesEstado;
    });
  });

  readonly total = computed(() => this.filtered().length);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly pageData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  // Stats (simple derivations)
  readonly totalResidentes = this.total;
  readonly activos = computed(() => this.filtered().filter(r => !!(r.usuario?.estado)).length);
  readonly pagosAlDia = computed(() => 0); // No hay dato en API expuesta
  readonly enMora = computed(() => 0); // No hay dato en API expuesta

  // Modals
  readonly showAdd = signal<boolean>(false);
  readonly showEdit = signal<boolean>(false);
  editingId: number | null = null;

  addForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    cedula: ['', [Validators.required]],
    idUnidad: [null],
  });

  editForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    cedula: ['', [Validators.required]],
    idUnidad: [null],
  });

  ngOnInit(): void {
    this.load();
    this.loadCondominios();
  }

  ngAfterViewInit(): void {}

  load() {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (data) => {
        this.residentes.set(data || []);
        this.pageIndex.set(0);
      },
      error: () => {},
      complete: () => this.loading.set(false),
    });
  }

  loadCondominios() {
    this.condoService.list(0, 100).subscribe({
      next: (p) => this.condominios.set((p?.content ?? []) as any),
      error: () => this.condominios.set([]),
    });
  }

  onSearch(value: string) {
    this.q.set(value);
    this.pageIndex.set(0);
  }

  onEstadoChange(value: 'todos' | 'activos' | 'inactivos') {
    this.estado.set(value);
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  openAdd() {
    this.addForm.reset({ idUnidad: null });
    this.selectedCondominioAdd.set(null);
    this.unidadesOpciones.set([]);
    this.showAdd.set(true);
  }
  cancelAdd() { this.showAdd.set(false); }
  submitAdd() {
    if (this.addForm.invalid) return;
    const dto: ResidenteDTO = this.addForm.value;
    this.loading.set(true);
    this.service.create(dto).subscribe({
      next: () => {
        this.toast.success('Residente agregado correctamente.');
        this.showAdd.set(false);
        this.load();
      },
      error: () => {
        this.toast.error('No se pudo agregar el residente.');
        this.loading.set(false);
      },
    });
  }

  openEdit(item: ResidenteRespuestaDTO) {
    const usuario = item.usuario || {} as any;
    this.editingId = item.id_Cliente ?? null;
    this.editForm.reset({
      nombre: usuario.nombres ?? '',
      apellido: usuario.apellidos ?? '',
      email: usuario.correo ?? '',
      telefono: item.telefono ?? '',
      cedula: item.cedula ?? '',
      idUnidad: item.unidad?.id ?? null,
    });
    this.selectedCondominioEdit.set(null);
    this.unidadesOpciones.set([]);
    this.showEdit.set(true);
  }
  cancelEdit() { this.showEdit.set(false); this.editingId = null; }
  submitEdit() {
    if (this.editForm.invalid || this.editingId == null) return;
    const dto: ResidenteDTO = this.editForm.value;
    this.loading.set(true);
    this.service.update(this.editingId, dto).subscribe({
      next: () => {
        this.toast.success('Residente actualizado correctamente.');
        this.showEdit.set(false);
        this.editingId = null;
        this.load();
      },
      error: () => {
        this.toast.error('No se pudo actualizar el residente.');
        this.loading.set(false);
      },
    });
  }

  async delete(item: ResidenteRespuestaDTO) {
    const idUsuario = item.usuario?.id_usuario;
    if (!idUsuario) return;
    const confirmed = await this.toast.confirm('¿Eliminar usuario asociado al residente?', {
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'error',
    });
    if (!confirmed) return;
    this.loading.set(true);
    this.service.deleteUsuario(idUsuario).subscribe({
      next: () => {
        this.toast.success('Residente eliminado.');
        this.load();
      },
      error: () => {
        this.toast.error('No se pudo eliminar el residente.');
        this.loading.set(false);
      },
    });
  }

  // Carga de unidades al seleccionar condominio
  onSelectCondominioAdd(id: number) {
    this.selectedCondominioAdd.set(id);
    this.addForm.patchValue({ idUnidad: null });
    this.condoService.unidadesPorCondominio(id).subscribe({
      next: (list) => this.unidadesOpciones.set(list || []),
      error: () => this.unidadesOpciones.set([]),
    });
  }
  onSelectCondominioEdit(id: number) {
    this.selectedCondominioEdit.set(id);
    this.editForm.patchValue({ idUnidad: null });
    this.condoService.unidadesPorCondominio(id).subscribe({
      next: (list) => this.unidadesOpciones.set(list || []),
      error: () => this.unidadesOpciones.set([]),
    });
  }
}

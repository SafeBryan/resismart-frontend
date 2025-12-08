import {
  AfterViewInit,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  Injector,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { ResidentesService } from '../../../../core/services/residentes.service';
import { ResidenteRespuestaDTO, ResidenteDTO } from '../../../../core/models/residente.model';
import { CondominiosService } from '../../../../core/services/condominios.service';
import { CondominioResumenDTO } from '../../../../core/models/condominio.model';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CondominioContextService } from '../../../../core/services/condominio-context.service';

@Component({
  selector: 'app-residentes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UtilsModule,
    SidebarComponent,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatPaginatorModule,
  ],
  templateUrl: './residentes.component.html',
  styleUrl: './residentes.component.css',
})
export class ResidentesComponent implements OnInit, AfterViewInit {
  private service = inject(ResidentesService);
  private condoService = inject(CondominiosService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private condCtx = inject(CondominioContextService);
  private injector = inject(Injector);

  // Data
  readonly loading = signal<boolean>(false);
  readonly residentes = signal<ResidenteRespuestaDTO[]>([]);
  readonly isAdmin = computed(() => {
    const r = (this.auth.snapshot.role ?? '').toString().toUpperCase();
    return r === 'ADMIN';
  });

  // Condominio actual (para activar la página)
  readonly condominioId = computed<number | null>(() => this.condCtx.state().condominioActualId ?? null);

  // Filters
  readonly q = signal<string>('');
  readonly estado = signal<'todos' | 'activos' | 'inactivos'>('todos');

  // Pagination (client-side)
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(10);

  readonly filtered = computed(() => {
    const term = this.q().trim().toLowerCase();
    const estado = this.estado();
    return this.residentes().filter((r) => {
      const usuario = r.usuario || ({} as any);
      const nombre = `${usuario.nombres ?? ''} ${usuario.apellidos ?? ''}`.toLowerCase();
      const email = (usuario.correo ?? '').toLowerCase();
      const cedula = (r.cedula ?? '').toLowerCase();
      const telefono = (r.telefono ?? '').toLowerCase();
      const matchesTerm =
        !term || nombre.includes(term) || email.includes(term) || cedula.includes(term) || telefono.includes(term);
      const activo = this.isActivo(r);
      const matchesEstado = estado === 'todos' ? true : estado === 'activos' ? activo : !activo;
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
  readonly activos = computed(() => this.filtered().filter((r) => this.isActivo(r)).length);
  readonly pagosAlDia = computed(() => 0); // No hay dato en API expuesta
  readonly enMora = computed(() => 0); // No hay dato en API expuesta
  readonly condominios = signal<CondominioResumenDTO[]>([]);

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
    condominioId: [null as number | null, [Validators.required]],
  });

  editForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    cedula: ['', [Validators.required]],
    condominioId: [null as number | null, [Validators.required]],
  });

  ngOnInit(): void {
    this.condCtx.ensureLoaded().subscribe(() => {
      this.cargarCondominios();
      runInInjectionContext(this.injector, () =>
        effect(
          () => {
            const id = this.condominioId();
            if (id) {
              this.load();
            } else {
              this.residentes.set([]);
              this.loading.set(false);
            }
          },
          { allowSignalWrites: true },
        ),
      );
    });
  }

  ngAfterViewInit(): void {}

  load() {
    const condoId = this.condominioId();
    if (!condoId) {
      this.residentes.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.residentes.set([]);
    this.service.listByCondominio(condoId).subscribe({
      next: (data) => {
        this.residentes.set(data || []);
        this.pageIndex.set(0);
      },
      error: () => {
        this.residentes.set([]);
      },
      complete: () => this.loading.set(false),
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
    const condoId = this.condominioId();
    this.addForm.reset({ condominioId: condoId ?? null });
    this.showAdd.set(true);
  }
  cancelAdd() {
    this.showAdd.set(false);
  }
  submitAdd() {
    const condoId = this.addForm.value?.condominioId as number | null;
    if (this.addForm.invalid || !condoId) {
      this.toast.error('Selecciona un condominio para crear el inquilino.');
      return;
    }
    const dto: ResidenteDTO = this.addForm.value;
    this.loading.set(true);
    this.service.create(dto).subscribe({
      next: () => {
        this.toast.success('Residente agregado correctamente.');
        this.showAdd.set(false);
        this.load();
      },
      error: (err) => {
        const msg = err?.error || 'No se pudo agregar el residente.';
        this.toast.error(msg);
        this.loading.set(false);
      },
    });
  }

  openEdit(item: ResidenteRespuestaDTO) {
    const condoId = this.condominioId();
    const usuario = item.usuario || ({} as any);
    this.editingId = (item.id ?? item.id_Cliente) ?? null;
    this.editForm.reset({
      nombre: usuario.nombres ?? '',
      apellido: usuario.apellidos ?? '',
      email: usuario.correo ?? '',
      telefono: item.telefono ?? '',
      cedula: item.cedula ?? '',
      condominioId: item.condominioId ?? condoId ?? null,
    });
    this.showEdit.set(true);
  }
  cancelEdit() {
    this.showEdit.set(false);
    this.editingId = null;
  }
  submitEdit() {
    const condoId = this.editForm.value?.condominioId as number | null;
    if (this.editForm.invalid || this.editingId == null || !condoId) {
      this.toast.error('Selecciona un condominio para actualizar el inquilino.');
      return;
    }
    const dto: ResidenteDTO = this.editForm.value;
    this.loading.set(true);
    this.service.update(this.editingId, dto).subscribe({
      next: () => {
        this.toast.success('Residente actualizado correctamente.');
        this.showEdit.set(false);
        this.editingId = null;
        this.load();
      },
      error: (err) => {
        const msg = err?.error || 'No se pudo actualizar el residente.';
        this.toast.error(msg);
        this.loading.set(false);
      },
    });
  }

  async delete(item: ResidenteRespuestaDTO) {
    const residenteId = item.id ?? item.id_Cliente ?? null;
    if (!residenteId) return;
    const confirmed = await this.toast.confirm('¿Eliminar el inquilino?', {
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'error',
    });
    if (!confirmed) return;
    this.loading.set(true);
    this.service.delete(residenteId).subscribe({
      next: () => {
        this.toast.success('Residente eliminado.');
        this.load();
      },
      error: (err) => {
        const message = err?.error || 'No se pudo eliminar el residente.';
        this.toast.error(message);
        this.loading.set(false);
      },
    });
  }

  private cargarCondominios() {
    this.condoService.list(0, 200).subscribe({
      next: (p) => this.condominios.set(p?.content || []),
      error: () => this.condominios.set([]),
    });
  }

  isActivo(r: ResidenteRespuestaDTO): boolean {
    const usuario = r.usuario || ({} as any);
    return Boolean(
      usuario.estado ??
      r.usuarioEstado ??
      r.usuarioActivo ??
      usuario.activo
    );
  }
}

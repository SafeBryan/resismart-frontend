import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { UtilsModule } from '../../../../utils/utils.module';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { Usuario, UsuarioCrearRequest, UsuarioEditarRequest, Rol } from '../../../../core/models/usuario.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, UtilsModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatPaginatorModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(UsuariosService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  readonly loading = signal(false);
  readonly usuarios = signal<Usuario[]>([]);
  readonly isOwner = computed(() => {
    const r = (this.auth.snapshot.role ?? '').toString().toUpperCase();
    return r === 'OWNER' || r === 'DUENO' || /^DUE.?O$/.test(r);
  });
  readonly isAdmin = computed(() => {
    const r = (this.auth.snapshot.role ?? '').toString().toUpperCase();
    return r === 'ADMIN';
  });

  readonly q = signal('');
  readonly rolFilter = signal<'todos' | Rol>('todos');
  readonly estadoFilter = signal<'todos' | 'activos' | 'inactivos'>('todos');

  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const rf = this.rolFilter();
    const ef = this.estadoFilter();
    return this.usuarios().filter(u => {
      const name = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.toLowerCase();
      const correo = (u.correo ?? '').toLowerCase();
      const matchesQ = !q || name.includes(q) || correo.includes(q) || (u.username ?? '').toLowerCase().includes(q);
      const matchesR = rf === 'todos' ? true : (u.rol === rf);
      const matchesE = ef === 'todos' ? true : ef === 'activos' ? !!u.estado : !u.estado;
      return matchesQ && matchesR && matchesE;
    });
  });

  readonly total = computed(() => this.filtered().length);
  readonly pageData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  readonly showAdd = signal(false);
  readonly showEdit = signal(false);
  editingId: number | null = null;

  addForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    rol: ['RESIDENTE', Validators.required],
    password: ['', Validators.required],
  });

  editForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    rol: ['RESIDENTE', Validators.required],
    estado: [true, Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  load(opts: { notify?: boolean } = {}) {
    const notify = opts.notify ?? true;
    this.loading.set(true);
    let loadingToastId: number | null = notify ? this.toast.show('Actualizando usuarios...', 'info', 0, false) : null;
    const clearLoadingToast = () => {
      if (loadingToastId != null) {
        this.toast.dismiss(loadingToastId);
        loadingToastId = null;
      }
    };
    this.service.list().subscribe({
      next: (list) => {
        const data = list || [];
        this.usuarios.set(data);
        this.pageIndex.set(0);
        clearLoadingToast();
        if (notify) {
          const message = data.length
            ? `Se cargaron ${data.length} usuarios.`
            : 'No hay usuarios para mostrar.';
          this.toast.success(message);
        }
      },
      error: (err) => {
        clearLoadingToast();
        this.toast.error(this.resolveErrorMessage(err, 'No se pudieron cargar los usuarios.'));
        this.loading.set(false);
      },
      complete: () => {
        clearLoadingToast();
        this.loading.set(false);
      },
    });
  }

  onPage(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    const totalPages = Math.max(1, Math.ceil(this.total() / e.pageSize));
    this.toast.info(`Pagina ${e.pageIndex + 1} de ${totalPages}.`);
  }
  onSearch(v: string) { this.q.set(v); this.pageIndex.set(0); }
  onRole(v: any) {
    this.rolFilter.set(v);
    this.pageIndex.set(0);
    const label = v === 'todos' ? 'todos los roles' : `rol ${String(v).toLowerCase()}`;
    this.toast.info(`Filtro actualizado: ${label}.`);
  }
  onEstado(v: any) {
    this.estadoFilter.set(v);
    this.pageIndex.set(0);
    let label = 'todos los usuarios';
    if (v === 'activos') label = 'solo activos';
    else if (v === 'inactivos') label = 'solo inactivos';
    this.toast.info(`Filtro por estado: ${label}.`);
  }

  openAdd() {
    this.addForm.reset({ rol: 'RESIDENTE' });
    if (this.isOwner()) this.addForm.get('rol')?.disable(); else this.addForm.get('rol')?.enable();
    this.showAdd.set(true);
    this.toast.info('Formulario de registro abierto.');
  }
  submitAdd() {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      this.toast.error('Completa los campos obligatorios antes de guardar.');
      return;
    }
    const raw: any = this.addForm.getRawValue();
    const dto: UsuarioCrearRequest = { ...raw, rol: this.isOwner() ? 'RESIDENTE' : raw.rol };
    const nombre = this.resolveNombre(raw);
    this.loading.set(true);
    this.service.create(dto).subscribe({
      next: () => {
        this.toast.success(`Usuario ${nombre} creado correctamente.`);
        this.showAdd.set(false);
        this.load();
      },
      error: (err) => {
        this.toast.error(this.resolveErrorMessage(err, 'No se pudo crear el usuario.'));
        this.loading.set(false);
      },
    });
  }

  openEdit(u: Usuario) {
    this.editingId = u.id_usuario ?? null;
    this.editForm.reset({
      nombre: u.nombres ?? '',
      apellido: u.apellidos ?? '',
      email: u.correo ?? '',
      telefono: u.telefono ?? '',
      rol: u.rol ?? 'RESIDENTE',
      estado: u.estado ?? true,
    });
    if (this.isOwner()) this.editForm.get('rol')?.disable(); else this.editForm.get('rol')?.enable();
    this.showEdit.set(true);
    const nombre = this.resolveNombre(u);
    this.toast.info(`Editando a ${nombre}.`);
  }
  submitEdit() {
    if (this.editingId == null) {
      this.toast.error('No hay un usuario seleccionado para editar.');
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toast.error('Completa los campos obligatorios antes de actualizar.');
      return;
    }
    const raw: any = this.editForm.getRawValue();
    const dto: UsuarioEditarRequest = { ...raw, rol: this.isOwner() ? 'RESIDENTE' as Rol : raw.rol };
    const nombre = this.resolveNombre({ ...raw });
    this.loading.set(true);
    this.service.update(this.editingId, dto).subscribe({
      next: () => {
        this.toast.success(`Usuario ${nombre} actualizado correctamente.`);
        this.showEdit.set(false);
        this.editingId = null;
        this.load();
      },
      error: (err) => {
        this.toast.error(this.resolveErrorMessage(err, 'No se pudo actualizar el usuario.'));
        this.loading.set(false);
      },
    });
  }

  async delete(u: Usuario) {
    const id = u.id_usuario;
    const nombre = this.resolveNombre(u);
    if (!id) {
      this.toast.error('No se pudo determinar el usuario a eliminar.');
      return;
    }
    const confirmed = await this.toast.confirm(`Eliminar a ${nombre}?`, {
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'error',
    });
    if (!confirmed) {
      this.toast.info('Se cancelo la eliminacion.');
      return;
    }
    this.loading.set(true);
    this.service.delete(id).subscribe({
      next: () => {
        this.toast.success(`Usuario ${nombre} eliminado.`);
        this.load();
      },
      error: (err) => {
        this.toast.error(this.resolveErrorMessage(err, 'No se pudo eliminar el usuario.'));
        this.loading.set(false);
      },
    });
  }

  private resolveErrorMessage(err: any, fallback: string): string {
    const message = err?.error?.message ?? err?.message;
    if (typeof message === 'string' && message.trim().length) return message;
    return fallback;
  }

  private resolveNombre(value: Partial<Usuario> | Record<string, any> | null | undefined): string {
    if (!value) return 'usuario';
    const toText = (input: any) => {
      if (input == null) return '';
      return String(input).trim();
    };
    const nombre = toText((value as any).nombres ?? (value as any).nombre);
    const apellido = toText((value as any).apellidos ?? (value as any).apellido);
    const full = `${nombre} ${apellido}`.trim();
    const fallback =
      toText((value as any).email) ||
      toText((value as any).correo) ||
      toText((value as any).username);
    return full || fallback || 'usuario';
  }
}

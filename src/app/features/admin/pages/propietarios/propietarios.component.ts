import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { Usuario, UsuarioEditarRequest } from '../../../../core/models/usuario.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { normalizeRole } from '../../../../core/utils/role.util';

@Component({
  selector: 'app-propietarios',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './propietarios.component.html',
  styleUrl: './propietarios.component.css',
})
export class PropietariosComponent implements OnInit {
  private readonly usuariosService = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly propietarios = signal<Usuario[]>([]);
  readonly showEdit = signal(false);
  readonly showAdd = signal(false);
  editingId: number | null = null;

  readonly addForm = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    rol: [{ value: 'DUEÑO', disabled: true }],
  });

  readonly editForm = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    estado: [true, Validators.required],
    rol: [{ value: 'DUEÑO', disabled: true }],
  });

  ngOnInit(): void {
    this.loadPropietarios();
  }

  private loadPropietarios(): void {
    this.loading.set(true);
    this.usuariosService.list().subscribe({
      next: (list) => {
        const owners = (list || []).filter((u) => this.esPropietario(u));
        this.propietarios.set(owners);
        this.toast.success(owners.length ? `Propietarios cargados (${owners.length}).` : 'No hay propietarios para mostrar.');
      },
      error: () => this.toast.error('No se pudieron cargar los propietarios.'),
      complete: () => this.loading.set(false),
    });
  }

  private esPropietario(u: Usuario | null | undefined): boolean {
    if (!u) return false;
    return normalizeRole((u.rol ?? '').toString()) === 'OWNER';
  }

  openAdd(): void {
    this.addForm.reset({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      rol: 'DUEÑO',
    });
    this.showAdd.set(true);
  }

  submitAdd(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      this.toast.error('Completa los campos obligatorios antes de guardar.');
      return;
    }
    const raw = this.addForm.getRawValue();
    const dto = {
      nombre: raw.nombre || '',
      apellido: raw.apellido || '',
      email: raw.email || '',
      telefono: raw.telefono || '',
      rol: 'DUEÑO' as const,
    };
    const nombre = this.resolveNombre(raw);
    this.loading.set(true);
    this.usuariosService.create(dto).subscribe({
      next: () => {
        this.toast.success(`Propietario ${nombre} creado correctamente.`);
        this.showAdd.set(false);
        this.loadPropietarios();
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'No se pudo crear el propietario.';
        this.toast.error(msg);
        this.loading.set(false);
      },
    });
  }

  openEdit(u: Usuario): void {
    this.editingId = u.id_usuario ?? null;
    this.editForm.reset({
      nombre: u.nombres ?? '',
      apellido: u.apellidos ?? '',
      email: u.correo ?? '',
      telefono: u.telefono ?? '',
      estado: u.estado ?? true,
      rol: u.rol ?? 'DUEÑO',
    });
    this.showEdit.set(true);
  }

  submitEdit(): void {
    if (this.editingId == null) {
      this.toast.error('No hay un propietario seleccionado para editar.');
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toast.error('Completa los campos obligatorios antes de actualizar.');
      return;
    }
    const dto: UsuarioEditarRequest = { ...this.editForm.getRawValue(), rol: 'DUEÑO' } as UsuarioEditarRequest;
    const nombre = this.resolveNombre(this.editForm.getRawValue());
    this.loading.set(true);
    this.usuariosService.update(this.editingId, dto).subscribe({
      next: () => {
        this.toast.success(`Propietario ${nombre} actualizado.`);
        this.showEdit.set(false);
        this.editingId = null;
        this.loadPropietarios();
      },
      error: (err) => {
        const message = err?.error?.message ?? err?.message ?? 'No se pudo actualizar el propietario.';
        this.toast.error(message);
        this.loading.set(false);
      },
    });
  }

  closeEdit(): void {
    this.showEdit.set(false);
    this.editingId = null;
  }

  private resolveNombre(value: Partial<Usuario> | Record<string, any> | null | undefined): string {
    if (!value) return 'propietario';
    const toText = (input: any) => (input == null ? '' : String(input).trim());
    const nombre = toText((value as any).nombres ?? (value as any).nombre);
    const apellido = toText((value as any).apellidos ?? (value as any).apellido);
    const full = `${nombre} ${apellido}`.trim();
    const fallback = toText((value as any).email ?? (value as any).correo ?? (value as any).username);
    return full || fallback || 'propietario';
  }
}

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

  readonly loading = signal(false);
  readonly usuarios = signal<Usuario[]>([]);
  readonly isOwner = computed(() => {
    const r = (this.auth.snapshot.role ?? '').toString().toUpperCase();
    return r === 'OWNER' || r === 'DUENO' || /^DUE.?O$/.test(r);
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

  load() {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (list) => { this.usuarios.set(list || []); this.pageIndex.set(0); },
      error: () => {},
      complete: () => this.loading.set(false),
    });
  }

  onPage(e: PageEvent) { this.pageIndex.set(e.pageIndex); this.pageSize.set(e.pageSize); }
  onSearch(v: string) { this.q.set(v); this.pageIndex.set(0); }
  onRole(v: any) { this.rolFilter.set(v); this.pageIndex.set(0); }
  onEstado(v: any) { this.estadoFilter.set(v); this.pageIndex.set(0); }

  openAdd() { this.addForm.reset({ rol: 'RESIDENTE' }); if (this.isOwner()) this.addForm.get('rol')?.disable(); else this.addForm.get('rol')?.enable(); this.showAdd.set(true); }
  submitAdd() {
    if (this.addForm.invalid) return;
    const raw: any = this.addForm.getRawValue();
    const dto: UsuarioCrearRequest = { ...raw, rol: this.isOwner() ? 'RESIDENTE' : raw.rol };
    this.loading.set(true);
    this.service.create(dto).subscribe({
      next: () => { this.showAdd.set(false); this.load(); },
      error: () => this.loading.set(false),
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
  }
  submitEdit() {
    if (this.editForm.invalid || this.editingId == null) return;
    const raw: any = this.editForm.getRawValue();
    const dto: UsuarioEditarRequest = { ...raw, rol: this.isOwner() ? 'RESIDENTE' as Rol : raw.rol };
    this.loading.set(true);
    this.service.update(this.editingId, dto).subscribe({
      next: () => { this.showEdit.set(false); this.editingId = null; this.load(); },
      error: () => this.loading.set(false),
    });
  }

  delete(u: Usuario) {
    const id = u.id_usuario; if (!id) return;
    if (!confirm('¿Eliminar usuario?')) return;
    this.loading.set(true);
    this.service.delete(id).subscribe({
      next: () => this.load(),
      error: () => this.loading.set(false),
    });
  }
}

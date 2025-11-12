import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { CondominiosService } from '../../../../core/services/condominios.service';
import { EventosService } from '../../../../core/services/eventos.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CondominioResumenDTO } from '../../../../core/models/condominio.model';
import { EventoCreateDTO, EventoDetalleDTO, EventoParticipanteDTO } from '../../../../core/models/evento.model';
import { isOwner } from '../../../../core/utils/role.util';

@Component({
  selector: 'app-admin-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UtilsModule, SidebarComponent],
  templateUrl: './eventos.component.html',
  styleUrl: './eventos.component.css',
})
export class EventosComponent implements OnInit, OnDestroy {
  private readonly condominiosService = inject(CondominiosService);
  private readonly eventosService = inject(EventosService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly condominios = signal<CondominioResumenDTO[]>([]);
  readonly selectedCondominioId = signal<number | null>(null);
  readonly eventos = signal<EventoDetalleDTO[]>([]);
  readonly isOwnerUser = signal(isOwner(this.auth.getRole()));
  readonly loading = signal(false);
  readonly showModal = signal(false);
  readonly editingId = signal<number | null>(null);

  private creatorId: number | null = null;

  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: ['', [Validators.maxLength(1000)]],
    fechaInicio: ['', Validators.required],
    fechaFin: [''],
    lugar: ['', [Validators.maxLength(120)]],
    tipo: ['REUNION', Validators.required],
    estado: ['PROGRAMADO', Validators.required],
  });

  ngOnInit(): void {
    this.fetchCurrentUser();
    this.loadCondominios();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchCurrentUser(): void {
    this.auth
      .validateToken(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => (this.creatorId = this.toNumericId(this.auth.snapshot.idUsuario)),
        error: () => (this.creatorId = this.toNumericId(this.auth.snapshot.idUsuario)),
      });
  }

  private loadCondominios(): void {
    this.condominiosService.list(0, 100, { ownerOnly: this.isOwnerUser() }).subscribe({
      next: (page) => {
        const list = page?.content ?? [];
        this.condominios.set(list);
        const initial = this.toNumericId(list[0]?.id) ?? null;
        this.selectedCondominioId.set(initial);
        if (initial) this.loadEventos(initial);
      },
      error: () => {
        this.toast.error('No se pudieron cargar los condominios.');
        this.condominios.set([]);
      },
    });
  }

  onSelectCondominio(id: number | string): void {
    const numeric = this.toNumericId(id);
    if (!numeric) return;
    this.selectedCondominioId.set(numeric);
    this.loadEventos(numeric);
  }

  private loadEventos(id: number): void {
    if (!id) return;
    this.loading.set(true);
    this.eventosService.listByCondominio(id).subscribe({
      next: (list) => this.eventos.set(list ?? []),
      error: () => {
        this.toast.error('No se pudieron cargar los eventos.');
        this.eventos.set([]);
      },
      complete: () => this.loading.set(false),
    });
  }

  openModal(evento?: EventoDetalleDTO): void {
    if (evento) {
      this.editingId.set(evento.id ?? null);
      this.form.patchValue({
        titulo: evento.titulo ?? '',
        descripcion: evento.descripcion ?? '',
        fechaInicio: this.toInputDate(evento.fechaInicio),
        fechaFin: this.toInputDate(evento.fechaFin),
        lugar: evento.lugar ?? '',
        tipo: evento.tipo ?? 'REUNION',
        estado: evento.estado ?? 'PROGRAMADO',
      });
    } else {
      this.editingId.set(null);
      this.form.reset({
        titulo: '',
        descripcion: '',
        fechaInicio: '',
        fechaFin: '',
        lugar: '',
        tipo: 'REUNION',
        estado: 'PROGRAMADO',
      });
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const condominioId = this.selectedCondominioId();
    if (!condominioId) {
      this.toast.error('Selecciona un condominio.');
      return;
    }
    const creator =
      this.creatorId ?? this.toNumericId(this.auth.snapshot.idUsuario) ?? null;
    if (!creator) {
      this.toast.error('No se pudo identificar al usuario.');
      return;
    }
    const value = this.form.value;
    const payload: EventoCreateDTO = {
      titulo: value.titulo ?? '',
      descripcion: value.descripcion ?? '',
      fechaInicio: new Date(value.fechaInicio!).toISOString(),
      fechaFin: value.fechaFin ? new Date(value.fechaFin).toISOString() : undefined,
      lugar: value.lugar ?? '',
      tipo: value.tipo ?? 'REUNION',
      estado: value.estado ?? 'PROGRAMADO',
      idCondominio: condominioId,
      idCreador: creator,
    };
    this.loading.set(true);
    const editingId = this.editingId();
    const request = editingId
      ? this.eventosService.update(editingId, payload)
      : this.eventosService.create(payload);

    request.subscribe({
      next: (evento) => {
        this.toast.success(editingId ? 'Evento actualizado.' : 'Evento creado.');
        this.upsertEvento(evento);
        this.closeModal();
      },
      error: () => this.toast.error('No se pudo guardar el evento.'),
      complete: () => this.loading.set(false),
    });
  }

  deleteEvento(evento: EventoDetalleDTO): void {
    if (!evento?.id) return;
    this.toast
      .confirm('¿Eliminar este evento?', { confirmText: 'Eliminar', type: 'error' })
      .then((confirmed) => {
        if (!confirmed) return;
        this.loading.set(true);
        this.eventosService.delete(evento.id!).subscribe({
          next: () => {
            this.toast.success('Evento eliminado.');
            this.eventos.update((items) => items.filter((it) => it.id !== evento.id));
          },
          error: () => this.toast.error('No se pudo eliminar el evento.'),
          complete: () => this.loading.set(false),
        });
      });
  }

  trackById = (_: number, item: EventoDetalleDTO) => item.id ?? _;

  private upsertEvento(evento: EventoDetalleDTO): void {
    this.eventos.update((items) => {
      const exists = items.some((it) => it.id === evento.id);
      if (exists) return items.map((it) => (it.id === evento.id ? evento : it));
      return [evento, ...items];
    });
  }

  formatParticipanteNombre(participante?: EventoParticipanteDTO): string {
    if (!participante) return 'Participante';
    const nombre = `${participante.nombres ?? ''} ${participante.apellidos ?? ''}`.trim();
    if (nombre) return nombre;
    if (participante.correo) return participante.correo;
    const id = this.resolveParticipanteId(participante);
    if (id) return `Usuario #${id}`;
    return 'Participante';
  }

  getParticipanteEstado(participante?: EventoParticipanteDTO): string {
    if (!participante) return 'PENDIENTE';
    return (participante.asistencia ?? participante.estado ?? 'PENDIENTE').toString();
  }

  getParticipanteEstadoClass(participante?: EventoParticipanteDTO): string {
    const estado = this.getParticipanteEstado(participante).toUpperCase();
    switch (estado) {
      case 'CONFIRMADO':
      case 'ASISTIO':
        return 'ok';
      case 'RECHAZADO':
      case 'NO_ASISTIO':
        return 'danger';
      default:
        return 'pending';
    }
  }

  private toInputDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  }
  private toNumericId(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private resolveParticipanteId(participante?: EventoParticipanteDTO): number | null {
    if (!participante) return null;
    return this.toNumericId(participante.usuarioId ?? participante.idUsuario ?? participante.id);
  }
}

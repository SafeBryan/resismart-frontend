import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { EventosService } from '../../../../core/services/eventos.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EventoDetalleDTO, EventoParticipanteDTO } from '../../../../core/models/evento.model';
import { UnidadDTO } from '../../../../core/models/unidad.model';
import { UnidadesService } from '../../../../core/services/unidades.service';
import { RESIDENT_NAV } from '../../resident-nav';

interface EventoRow {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  lugar: string;
  tipo: string;
  estado: string;
  asistencia: 'CONFIRMADO' | 'RECHAZADO' | 'PENDIENTE';
}

@Component({
  selector: 'app-resident-eventos',
  standalone: true,
  imports: [CommonModule, UtilsModule, SidebarComponent],
  templateUrl: './resident-eventos.component.html',
  styleUrl: './resident-eventos.component.css',
})
export class ResidentEventosComponent {
  private readonly eventosService = inject(EventosService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly unidadesService = inject(UnidadesService);

  readonly loading = signal(true);
  readonly eventos = signal<EventoRow[]>([]);
  readonly residentNav = RESIDENT_NAV;
  readonly unidad = signal<UnidadDTO | null>(null);
  readonly condominioNombre = computed(() => {
    const unidad = this.unidad();
    const nombre = unidad?.condominio?.nombre ?? unidad?.condominioNombre ?? '';
    if (nombre?.trim()) return nombre.trim();
    const id = this.getCondominioId(unidad);
    if (id) return `#${id}`;
    return '...';
  });

  private get currentUserId(): number | null {
    const value = this.auth.snapshot.idUsuario;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  constructor() {
    this.loadUnidad();
  }

  private loadUnidad(): void {
    this.loading.set(true);
    this.unidadesService.getUnidadActual().subscribe({
      next: (unidad) => {
        this.unidad.set(unidad);
        const condId = this.getCondominioId(unidad);
        if (condId) {
          this.loadEventos(condId);
        } else {
          this.eventos.set([]);
          this.loading.set(false);
        }
      },
      error: () => {
        this.toast.error('No se pudo obtener tu unidad.');
        this.eventos.set([]);
        this.loading.set(false);
      },
    });
  }

  confirm(evento: EventoRow): void {
    this.eventosService.confirmarAsistencia(evento.id, { estado: 'CONFIRMADO' }).subscribe({
      next: () => {
        this.toast.success('Asistencia confirmada.');
        this.updateAsistencia(evento.id, 'CONFIRMADO');
      },
      error: () => this.toast.error('No se pudo confirmar la asistencia.'),
    });
  }

  reject(evento: EventoRow): void {
    this.eventosService.actualizarAsistencia(evento.id, { estado: 'RECHAZADO' }).subscribe({
      next: () => {
        this.toast.info('Has indicado que no asistirás.');
        this.updateAsistencia(evento.id, 'RECHAZADO');
      },
      error: () => this.toast.error('No se pudo registrar la respuesta.'),
    });
  }

  trackById = (_: number, item: EventoRow) => item.id;

  private loadEventos(condominioId: number): void {
    this.loading.set(true);
    this.eventosService.listByCondominio(condominioId).subscribe({
      next: (list) => this.eventos.set(this.mapEventos(list ?? [])),
      error: () => {
        this.toast.error('No se pudieron obtener los eventos.');
        this.eventos.set([]);
      },
      complete: () => this.loading.set(false),
    });
  }

  private mapEventos(list: EventoDetalleDTO[]): EventoRow[] {
    const userId = this.currentUserId;
    return list.map((evento) => {
      const asistente =
        userId != null
          ? evento.participantes?.find((p) => this.isParticipanteActual(p, userId))
          : undefined;
      const estado =
        (asistente?.asistencia as 'CONFIRMADO' | 'RECHAZADO' | 'PENDIENTE' | undefined) ??
        (asistente?.estado as 'CONFIRMADO' | 'RECHAZADO' | 'PENDIENTE' | undefined) ??
        'PENDIENTE';
      return {
        id: evento.id ?? 0,
        titulo: evento.titulo ?? 'Evento',
        descripcion: evento.descripcion ?? '—',
        fecha: this.formatDate(evento.fechaInicio),
        lugar: evento.lugar ?? 'Por definir',
        tipo: evento.tipo ?? 'REUNION',
        estado: evento.estado ?? 'PROGRAMADO',
        asistencia: estado,
      };
    });
  }

  private formatDate(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private updateAsistencia(id: number, estado: 'CONFIRMADO' | 'RECHAZADO'): void {
    this.eventos.update((rows) =>
      rows.map((row) => (row.id === id ? { ...row, asistencia: estado } : row))
    );
  }
  private isParticipanteActual(participante: EventoParticipanteDTO | undefined, userId: number): boolean {
    if (!participante) return false;
    const candidates = [participante.usuarioId, participante.idUsuario];
    return candidates.some((value) => this.toNumericId(value) === userId);
  }

  private getCondominioId(unidad: UnidadDTO | null | undefined): number | null {
    const dynamic = unidad as Record<string, unknown> | null | undefined;
    const raw =
      unidad?.condominio?.id ??
      unidad?.condominioId ??
      (dynamic ? dynamic['idCondominio'] : null);
    return this.toNumericId(raw);
  }

  private toNumericId(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
}

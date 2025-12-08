import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';
import { AvisoDestino, AvisoTipo } from '../../../../core/models/aviso.model';
import { useAvisos, AvisoItem } from '../../../../core/services/avisos-store.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AvisosService } from '../../../../core/services/avisos.service';
import { ToastService } from '../../../../core/services/toast.service';

interface AvisoView {
  id: number;
  titulo: string;
  mensaje: string;
  fecha: string;
  categoria: string;
  estado: string;
  responsable: string;
  etiqueta: string;
  leido: boolean;
  source: AvisoItem;
}

@Component({
  selector: 'app-avisos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UtilsModule, SidebarComponent],
  templateUrl: './avisos.component.html',
  styleUrl: './avisos.component.css',
})
export class AvisosComponent {
  constructor(
    private readonly auth: AuthService,
    private readonly avisosService: AvisosService,
    private readonly toast: ToastService
  ) {}

  readonly avisosFacade = useAvisos();
  readonly filtros = [
    { label: 'Todos', value: 'todos' },
    { label: 'Mantenimiento', value: 'mantenimiento' },
    { label: 'Eventos', value: 'evento' },
    { label: 'Pagos', value: 'pago' },
    { label: 'Seguridad', value: 'seguridad' },
    { label: 'Documentos', value: 'documento' },
  ];

  readonly filtroSeleccionado = signal<'todos' | string>('todos');
  readonly busqueda = signal('');
  readonly tipoMensaje = signal<'general' | 'usuario'>('general');
  readonly tituloNuevo = signal('');
  readonly mensajeNuevo = signal('');
  readonly receptorId = signal<number | null>(null);

  readonly esAdmin = computed(() => {
    const role = (this.auth.snapshot.role ?? '').toString().toUpperCase();
    return role === 'ADMIN';
  });

  readonly avisos = computed<AvisoView[]>(() =>
    this.avisosFacade
      .avisos()
      .map((aviso) => this.mapAviso(aviso))
  );

  readonly avisosFiltrados = computed<AvisoView[]>(() => {
    const filtro = this.filtroSeleccionado();
    const search = this.busqueda().trim().toLowerCase();
    return this.avisos().filter((aviso) => {
      const matchesFiltro = filtro === 'todos' ? true : aviso.categoria === filtro;
      const matchesSearch =
        !search ||
        aviso.titulo.toLowerCase().includes(search) ||
        aviso.mensaje.toLowerCase().includes(search);
      return matchesFiltro && matchesSearch;
    });
  });

  seleccionarFiltro(value: string): void {
    this.filtroSeleccionado.set(value);
  }

  onSearch(value: string): void {
    this.busqueda.set(value);
  }

  markAll(): void {
    this.avisosFacade.markAllVisible();
  }

  archivar(aviso: AvisoView): void {
    this.avisosFacade.ack([aviso.id]);
  }

  verDetalle(aviso: AvisoView): void {
    this.avisosFacade.navigate(aviso.source);
  }

  trackById = (_: number, aviso: AvisoView) => aviso.id;

  crearAviso(): void {
    if (!this.esAdmin()) {
      this.toast.error('Solo ADMIN puede enviar avisos.');
      return;
    }
    const mensaje = this.mensajeNuevo().trim();
    if (!mensaje) {
      this.toast.error('Ingresa un mensaje.');
      return;
    }
    const titulo = this.tituloNuevo().trim() || 'Mensaje';
    const destino = this.tipoMensaje() === 'usuario' ? ('USUARIO' as AvisoDestino) : ('TODOS' as AvisoDestino);
    const destinoReferencia = destino === 'USUARIO' ? (this.receptorId() ? String(this.receptorId()) : null) : null;
    if (destino === 'USUARIO' && !destinoReferencia) {
      this.toast.error('Ingresa el ID de usuario destinatario.');
      return;
    }

    const req = {
      tipo: 'ALERTA_GENERAL' as AvisoTipo,
      titulo,
      mensaje,
      destino,
      destinoReferencia,
    };

    this.avisosService.crearAviso(req).subscribe({
      next: () => {
        this.toast.success('Aviso enviado.');
        this.mensajeNuevo.set('');
        this.tituloNuevo.set('');
        this.receptorId.set(null);
        this.avisosFacade.refresh();
      },
      error: (err) => {
        console.error(err);
        this.toast.error('No se pudo enviar el aviso.');
      },
    });
  }

  private mapAviso(aviso: AvisoItem): AvisoView {
    return {
      id: aviso.id,
      titulo: aviso.titulo ?? this.resolveTitulo(aviso.tipo),
      mensaje: aviso.mensaje ?? '',
      fecha: aviso.relativeEmitido || this.formatDate(aviso.emitidoEn),
      categoria: this.resolveCategoria(aviso.tipo),
      estado: aviso.destino ?? 'USUARIO',
      responsable: this.resolveResponsable(aviso),
      etiqueta: this.resolveEtiqueta(aviso.tipo),
      leido: !!aviso.leido,
      source: aviso,
    };
  }

  private resolveTitulo(tipo: AvisoTipo | undefined): string {
    if (!tipo) return 'Aviso del condominio';
    return this.capitalize(tipo.replace(/_/g, ' '));
  }

  private resolveCategoria(tipo: AvisoTipo | undefined): string {
    if (!tipo) return 'otros';
    if (tipo.startsWith('EVENTO')) return 'evento';
    if (tipo.startsWith('ORDEN_PAGO')) return 'pago';
    if (tipo.startsWith('DOCUMENTO')) return 'documento';
    if (tipo === 'ALERTA_GENERAL') return 'seguridad';
    return 'mantenimiento';
  }

  private resolveEtiqueta(tipo: AvisoTipo | undefined): string {
    switch (tipo) {
      case 'ALERTA_GENERAL':
      case 'DOCUMENTO_RECHAZADO':
        return 'importante';
      case 'ORDEN_PAGO_PROX_VENCER':
      case 'EVENTO_CANCELADO':
        return 'alerta';
      case 'ORDEN_PAGO_GENERADA':
      case 'ORDEN_PAGO_PAGADA':
      case 'DOCUMENTO_APROBADO':
        return 'pago';
      default:
        return 'info';
    }
  }

  private resolveResponsable(aviso: AvisoItem): string {
    const meta = aviso.metadata ?? {};
    if (typeof meta['responsable'] === 'string') return String(meta['responsable']);
    if (typeof meta['autorizadoPor'] === 'string') return String(meta['autorizadoPor']);
    return 'Administración';
  }

  private formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value ?? '';
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private capitalize(value: string): string {
    if (!value) return '';
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
}

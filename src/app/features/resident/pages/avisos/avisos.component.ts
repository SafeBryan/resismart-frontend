import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UtilsModule } from '../../../../utils/utils.module';
import { AvisoTipo } from '../../../../core/models/aviso.model';
import { useAvisos, AvisoItem } from '../../../../core/services/avisos-store.service';
import { RESIDENT_NAV } from '../../resident-nav';
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
  senderId?: number | null;
  source: AvisoItem;
}

@Component({
  selector: 'app-resident-avisos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UtilsModule],
  templateUrl: './avisos.component.html',
  styleUrl: './avisos.component.css',
})
export class ResidentAvisosComponent {
  constructor(
    private readonly avisosService: AvisosService,
    private readonly toast: ToastService
  ) {}

  readonly residentNav = RESIDENT_NAV;
  readonly avisosFacade = useAvisos();

  readonly filtros = [
    { label: 'Todos', value: 'todos' },
    { label: 'Mantenimiento', value: 'mantenimiento' },
    { label: 'Eventos', value: 'evento' },
    { label: 'Pagos', value: 'pago' },
    { label: 'Seguridad', value: 'seguridad' },
    { label: 'Documentos', value: 'documento' },
  ];

  readonly filtroSeleccionado = signal<string>('todos');
  readonly loading = this.avisosFacade.loading;
  readonly error = this.avisosFacade.error;
  readonly replyingId = signal<number | null>(null);
  readonly replyMessage = signal('');

  readonly avisos = computed<AvisoView[]>(() =>
    this.avisosFacade
      .avisos()
      .map((aviso) => this.mapAviso(aviso))
  );

  readonly avisosFiltrados = computed<AvisoView[]>(() => {
    const filtro = this.filtroSeleccionado();
    if (filtro === 'todos') return this.avisos();
    return this.avisos().filter((aviso) => aviso.categoria === filtro);
  });

  seleccionarFiltro(valor: string): void {
    this.filtroSeleccionado.set(valor);
  }

  markAll(): void {
    this.avisosFacade.markAllVisible();
  }

  verDetalle(aviso: AvisoView): void {
    this.avisosFacade.navigate(aviso.source);
  }

  archivar(aviso: AvisoView): void {
    this.avisosFacade.ack([aviso.id]);
  }

  puedeResponder(aviso: AvisoView): boolean {
    // Permite responder si conocemos un sender (se asume ADMIN/DUEÑO en backend)
    return !!aviso.senderId;
  }

  abrirRespuesta(aviso: AvisoView): void {
    if (!this.puedeResponder(aviso)) {
      this.toast.error('No puedes responder este aviso.');
      return;
    }
    this.replyingId.set(aviso.id);
    this.replyMessage.set('');
  }

  cancelarRespuesta(): void {
    this.replyingId.set(null);
    this.replyMessage.set('');
  }

  enviarRespuesta(aviso: AvisoView): void {
    if (!this.puedeResponder(aviso)) {
      this.toast.error('No puedes responder este aviso.');
      return;
    }
    const msg = this.replyMessage().trim();
    if (!msg) {
      this.toast.error('Escribe un mensaje para responder.');
      return;
    }
    const req = {
      tipo: 'ALERTA_GENERAL' as AvisoTipo,
      mensaje: msg,
    };
    this.avisosService.responder(aviso.id, req as any).subscribe({
      next: () => {
        this.toast.success('Respuesta enviada.');
        this.cancelarRespuesta();
        this.avisosFacade.refresh();
      },
      error: (err) => {
        console.error(err);
        this.toast.error('No se pudo enviar la respuesta.');
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
      senderId: (aviso as any).senderId ?? (aviso as any).sender_id ?? null,
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
        return 'recordatorio';
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
    return 'Administracion del condominio';
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


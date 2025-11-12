import {
  Component,
  HostListener,
  Input,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { useAvisos, AvisoItem } from '../../core/services/avisos-store.service';

@Component({
  selector: 'app-avisos-bell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './avisos-bell.component.html',
  styleUrl: './avisos-bell.component.css',
})
export class AvisosBellComponent {
  @Input() limit = 5;
  @Input() align: 'left' | 'right' = 'right';

  readonly facade = useAvisos();
  readonly open = signal(false);

  readonly topAvisos = computed(() =>
    this.facade
      .avisos()
      .slice(0, this.limit)
      .map((item) => ({
        ...item,
        etiqueta: this.resolveEtiqueta(item.tipo),
        categoria: this.resolveCategoria(item.tipo),
        relative: item.relativeEmitido || '',
      }))
  );

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    const next = !this.open();
    this.open.set(next);
    if (next) this.markVisible();
  }

  markVisible(): void {
    const ids = this.topAvisos()
      .filter((item) => !item.leido)
      .map((item) => item.id);
    if (ids.length) this.facade.markAllVisible(ids);
  }

  onCardClick(aviso: AvisoItem, event?: MouseEvent): void {
    event?.stopPropagation();
    this.facade.navigate(aviso);
    this.open.set(false);
  }

  onAck(aviso: AvisoItem, event?: MouseEvent): void {
    event?.stopPropagation();
    this.facade.ack([aviso.id]);
  }

  @HostListener('document:click')
  closeDropdown(): void {
    if (this.open()) this.open.set(false);
  }

  trackById = (_: number, aviso: AvisoItem) => aviso.id;

  private resolveEtiqueta(tipo?: string | null): string {
    switch (tipo) {
      case 'ALERTA_GENERAL':
      case 'EVENTO_CANCELADO':
        return 'importante';
      case 'ORDEN_PAGO_PROX_VENCER':
      case 'DOCUMENTO_RECHAZADO':
        return 'alerta';
      case 'ORDEN_PAGO_GENERADA':
      case 'ORDEN_PAGO_PAGADA':
      case 'DOCUMENTO_APROBADO':
        return 'pago';
      default:
        return 'info';
    }
  }

  private resolveCategoria(tipo?: string | null): string {
    if (!tipo) return 'avisos';
    if (tipo.startsWith('EVENTO')) return 'eventos';
    if (tipo.startsWith('ORDEN_PAGO')) return 'pagos';
    if (tipo.startsWith('DOCUMENTO')) return 'documentos';
    if (tipo === 'ALERTA_GENERAL') return 'alertas';
    return 'avisos';
  }
}

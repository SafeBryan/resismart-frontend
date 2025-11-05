import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UtilsModule } from '../../../../utils/utils.module';
import { RESIDENT_NAV } from '../../resident-nav';

type Aviso = {
  titulo: string;
  fecha: string;
  categoria: 'Mantenimiento' | 'Evento' | 'Pago' | 'Seguridad';
  estado: 'Nuevo' | 'Leído' | 'Importante';
  descripcion: string;
  responsable: string;
};

@Component({
  selector: 'app-resident-avisos',
  standalone: true,
  imports: [CommonModule, RouterModule, UtilsModule],
  templateUrl: './avisos.component.html',
  styleUrl: './avisos.component.css',
})
export class ResidentAvisosComponent {
  residentNav = RESIDENT_NAV;

  filtros = [
    { label: 'Todos', value: 'todos' },
    { label: 'Mantenimiento', value: 'mantenimiento' },
    { label: 'Eventos', value: 'evento' },
    { label: 'Pagos', value: 'pago' },
    { label: 'Seguridad', value: 'seguridad' },
  ];

  avisos: Aviso[] = [
    {
      titulo: 'Mantenimiento programado de ascensores',
      fecha: '10 nov 2025 · 09:00',
      categoria: 'Mantenimiento',
      estado: 'Importante',
      descripcion:
        'Se realizará mantenimiento preventivo al ascensor de la Torre B este martes de 09:00 a 12:00. Usa las escaleras durante ese horario.',
      responsable: 'Administración',
    },
    {
      titulo: 'Entrega de comprobantes de noviembre',
      fecha: '08 nov 2025 · 12:40',
      categoria: 'Pago',
      estado: 'Nuevo',
      descripcion:
        'Recuerda subir tu comprobante de la cuota de mantenimiento antes del 12 de noviembre para evitar recargos automáticos.',
      responsable: 'Área de Cobranza',
    },
    {
      titulo: 'Jornada ecológica en el parque central',
      fecha: '06 nov 2025 · 18:15',
      categoria: 'Evento',
      estado: 'Leído',
      descripcion:
        'Se invita a todos los residentes a la jornada de reciclaje y siembra este sábado 22 a las 08:30 en el parque central.',
      responsable: 'Comité Vecinal',
    },
    {
      titulo: 'Revisión de cámaras de seguridad',
      fecha: '03 nov 2025 · 17:00',
      categoria: 'Seguridad',
      estado: 'Importante',
      descripcion:
        'Personal autorizado revisará las cámaras y accesos este viernes entre 15:00 y 17:00. Se notificará al finalizar.',
      responsable: 'Seguridad ResiSmart',
    },
  ];

  filtroSeleccionado = 'todos';

  get avisosFiltrados(): Aviso[] {
    if (this.filtroSeleccionado === 'todos') return this.avisos;
    return this.avisos.filter(
      (aviso) => this.categoriaClass(aviso.categoria) === this.filtroSeleccionado
    );
  }

  seleccionarFiltro(valor: string): void {
    this.filtroSeleccionado = valor;
  }

  categoriaClass(valor: Aviso['categoria']): string {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  estadoClass(valor: Aviso['estado']): string {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UtilsModule } from '../../../../utils/utils.module';
import { RESIDENT_NAV } from '../../resident-nav';

type ComprobantePendiente = {
  concepto: string;
  periodo: string;
  monto: string;
  estado: 'Pendiente' | 'En revisión' | 'Aprobado';
  vence: string;
  referencia: string;
};

type PasoGuia = { titulo: string; descripcion: string };

@Component({
  selector: 'app-resident-comprobantes',
  standalone: true,
  imports: [CommonModule, RouterModule, UtilsModule],
  templateUrl: './comprobantes.component.html',
  styleUrl: './comprobantes.component.css',
})
export class ResidentComprobantesComponent {
  residentNav = RESIDENT_NAV;

  form = {
    operacion: '',
    monto: '',
    descripcion: '',
  };

  selectedFileName = '';

  pendientes: ComprobantePendiente[] = [
    {
      concepto: 'Cuota de mantenimiento',
      periodo: 'Noviembre 2025',
      monto: '$120.00',
      estado: 'Pendiente',
      vence: '10 nov 2025',
      referencia: 'ORD-45210',
    },
    {
      concepto: 'Fondo de reserva',
      periodo: 'Noviembre 2025',
      monto: '$35.00',
      estado: 'En revisión',
      vence: '10 nov 2025',
      referencia: 'ORD-45211',
    },
    {
      concepto: 'Estacionamiento',
      periodo: 'Octubre 2025',
      monto: '$45.00',
      estado: 'Aprobado',
      vence: '10 oct 2025',
      referencia: 'ORD-44987',
    },
  ];

  pasos: PasoGuia[] = [
    {
      titulo: '1. Realiza tu pago',
      descripcion: 'Puedes usar transferencia bancaria, depósito o pago en línea según las opciones vigentes.',
    },
    {
      titulo: '2. Registra los datos',
      descripcion: 'Completa el número de operación, monto y medio de pago para identificar tu comprobante.',
    },
    {
      titulo: '3. Adjunta el archivo',
      descripcion: 'Sube el comprobante en formato PDF o imagen legible. Tamaño máximo recomendado: 5 MB.',
    },
    {
      titulo: '4. Envía y espera la revisión',
      descripcion: 'El equipo de administración validará la información y te notificará por correo.',
    },
  ];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files ? input.files[0] : null;
    this.selectedFileName = file ? file.name : '';
  }

  statusClass(estado: ComprobantePendiente['estado']): string {
    return estado
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }
}

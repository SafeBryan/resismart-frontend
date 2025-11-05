import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UtilsModule } from '../../../../utils/utils.module';
import { AuthService } from '../../../../core/services/auth.service';
import { RESIDENT_NAV } from '../../resident-nav';

type Aviso = { titulo: string; descripcion: string; fecha: string; etiqueta?: string };
type Evento = { titulo: string; fecha: string; hora: string; lugar: string; descripcion: string };
type Documento = { nombre: string; fecha: string; estado: 'Pendiente' | 'Aprobado' | 'Rechazado' };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, UtilsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private auth = inject(AuthService);

  user$ = this.auth.auth$;

  residentNav = RESIDENT_NAV;

  avisosOpen = false;
  avisos: Aviso[] = [
    {
      titulo: 'Mantenimiento de elevadores',
      descripcion: 'El ascensor de la Torre B estar\u00e1 en mantenimiento el 12 de noviembre de 09:00 a 12:00.',
      fecha: '10 nov 2025',
      etiqueta: 'recordatorio',
    },
    {
      titulo: 'Asamblea general',
      descripcion: 'Se confirm\u00f3 la asamblea extraordinaria para revisar el reglamento interno.',
      fecha: '08 nov 2025',
      etiqueta: 'importante',
    },
    {
      titulo: 'Entrega de estados de cuenta',
      descripcion: 'Tu estado de cuenta de octubre ya est\u00e1 disponible. Revisa tus pagos pendientes.',
      fecha: '05 nov 2025',
    },
  ];

  eventos: Evento[] = [
    {
      titulo: 'Reuni\u00f3n del comit\u00e9 vecinal',
      fecha: '15 nov',
      hora: '19:00',
      lugar: 'Sal\u00f3n Comunal - Torre A',
      descripcion: 'Conversaremos sobre mejoras en las \u00e1reas comunes y presupuesto 2026.',
    },
    {
      titulo: 'Jornada ecol\u00f3gica',
      fecha: '22 nov',
      hora: '08:30',
      lugar: 'Parque central',
      descripcion: 'Actividad familiar para reforestaci\u00f3n del jard\u00edn principal y reciclaje.',
    },
    {
      titulo: 'Simulacro de evacuaci\u00f3n',
      fecha: '28 nov',
      hora: '10:00',
      lugar: 'Punto de encuentro C',
      descripcion: 'Participaci\u00f3n obligatoria. Sigue las instrucciones del personal de seguridad.',
    },
  ];

  documentos: Documento[] = [
    { nombre: 'Comprobante pago \u2013 Octubre', fecha: '03 nov 2025', estado: 'Aprobado' },
    { nombre: 'Contrato de arrendamiento', fecha: '01 oct 2025', estado: 'Aprobado' },
    { nombre: 'Comprobante pago \u2013 Septiembre', fecha: '02 oct 2025', estado: 'Pendiente' },
  ];

  resumenPagos = [
    { concepto: 'Cuota mantenimiento', estado: 'Pagado', monto: '$120.00' },
    { concepto: 'Fondo de reserva', estado: 'Pendiente', monto: '$35.00' },
    { concepto: 'Estacionamiento', estado: 'Pagado', monto: '$45.00' },
  ];

  toggleAvisos(event: MouseEvent): void {
    event.stopPropagation();
    this.avisosOpen = !this.avisosOpen;
  }

  @HostListener('document:click')
  closeAvisos(): void {
    this.avisosOpen = false;
  }

  formatEstado(estado: Documento['estado']): string {
    switch (estado) {
      case 'Aprobado':
        return 'ok';
      case 'Pendiente':
        return 'warn';
      case 'Rechazado':
        return 'danger';
      default:
        return '';
    }
  }
}

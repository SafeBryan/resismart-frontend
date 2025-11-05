import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UtilsModule } from '../../../../utils/utils.module';
import { RESIDENT_NAV } from '../../resident-nav';
import { AuthService } from '../../../../core/services/auth.service';

type Preferencia = { clave: string; titulo: string; descripcion: string };
type RegistroCambio = { fecha: string; accion: string; detalle: string };

@Component({
  selector: 'app-resident-perfil',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UtilsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class ResidentPerfilComponent {
  private auth = inject(AuthService);

  residentNav = RESIDENT_NAV;
  user$ = this.auth.auth$;

  form = {
    nombres: this.auth.snapshot.profile?.nombres ?? '',
    apellidos: this.auth.snapshot.profile?.apellidos ?? '',
    email: this.auth.snapshot.profile?.email ?? '',
    telefono: '',
    telefonoEmergencia: '',
    documento: '',
    vehiculo: '',
    estacionamiento: 'B-12',
    notas: '',
  };

  preferencias: Preferencia[] = [
    {
      clave: 'correo',
      titulo: 'Avisos por correo',
      descripcion: 'Recibir notificaciones y recordatorios en tu correo registrado.',
    },
    {
      clave: 'sms',
      titulo: 'Alertas por SMS',
      descripcion: 'Mensajes cortos para avisos urgentes y mantenimiento.',
    },
    {
      clave: 'whatsapp',
      titulo: 'Mensajes por WhatsApp',
      descripcion: 'Comunicados rápidos a través del canal de atención oficial.',
    },
  ];

  preferenciasSeleccionadas: Record<string, boolean> = {
    correo: true,
    sms: false,
    whatsapp: true,
  };

  historial: RegistroCambio[] = [
    {
      fecha: '02 nov 2025 · 09:12',
      accion: 'Actualizaste tu número de teléfono',
      detalle: 'Número personal actualizado correctamente.',
    },
    {
      fecha: '18 sep 2025 · 16:40',
      accion: 'Confirmaste tus datos de contacto',
      detalle: 'Aceptaste recibir notificaciones por WhatsApp.',
    },
    {
      fecha: '04 jun 2025 · 11:05',
      accion: 'Actualizaste información del vehículo',
      detalle: 'Placa ABC-254 registrada y asociada al estacionamiento B-12.',
    },
  ];

  togglePreferencia(clave: string): void {
    this.preferenciasSeleccionadas[clave] = !this.preferenciasSeleccionadas[clave];
  }
}

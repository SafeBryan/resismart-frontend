import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UtilsModule } from '../../../../utils/utils.module';
import { RESIDENT_NAV } from '../../resident-nav';

type ContratoDetalle = {
  nombre: string;
  vigencia: string;
  estado: 'Activo' | 'Por renovar' | 'Finalizado';
  monto: string;
  descripcion: string;
  proximoPago: string;
};

type RecordatorioPago = {
  titulo: string;
  fecha: string;
  estado: 'Pendiente' | 'Pagado' | 'Vencido';
  detalle: string;
};

type DocumentoContrato = {
  nombre: string;
  tipo: string;
  fecha: string;
  accion: 'Descargar' | 'Firmar' | 'Revisar';
};

@Component({
  selector: 'app-resident-contratos',
  standalone: true,
  imports: [CommonModule, RouterModule, UtilsModule],
  templateUrl: './contratos.component.html',
  styleUrl: './contratos.component.css',
})
export class ResidentContratosComponent {
  residentNav = RESIDENT_NAV;

  contratoActual: ContratoDetalle = {
    nombre: 'Contrato de arrendamiento 2025',
    vigencia: '01 Ene 2025 - 31 Dic 2025',
    estado: 'Activo',
    monto: '$120.00 / mes',
    descripcion: 'Incluye cuota mensual de mantenimiento, acceso a amenidades y estacionamiento asignado.',
    proximoPago: '10 nov 2025',
  };

  renovaciones: RecordatorioPago[] = [
    {
      titulo: 'Cuota de mantenimiento - Noviembre',
      fecha: '10 nov 2025',
      estado: 'Pendiente',
      detalle: 'Monto a pagar: $120.00. Recargo a partir del 15 de noviembre.',
    },
    {
      titulo: 'Fondo de reserva',
      fecha: '10 nov 2025',
      estado: 'Pendiente',
      detalle: 'Monto a pagar: $35.00. Destinado a mejoras del edificio.',
    },
    {
      titulo: 'Contrato 2026',
      fecha: '15 dic 2025',
      estado: 'Pagado',
      detalle: 'Firma digital completada. Copia disponible en documentos.',
    },
  ];

  documentos: DocumentoContrato[] = [
    { nombre: 'Contrato de arrendamiento 2025', tipo: 'PDF', fecha: '02 ene 2025', accion: 'Descargar' },
    { nombre: 'Anexo de reglamento', tipo: 'PDF', fecha: '18 abr 2025', accion: 'Revisar' },
    { nombre: 'Constancia de pagos 2024', tipo: 'PDF', fecha: '15 ene 2025', accion: 'Descargar' },
  ];

  statusClass(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }
}

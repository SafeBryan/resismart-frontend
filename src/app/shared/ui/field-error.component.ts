import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="ui-field-error" *ngIf="message">{{ message }}</span>
  `,
  styleUrls: ['./field-error.component.scss'],
})
export class FieldErrorComponent {
  @Input() control?: AbstractControl | null;
  @Input() error?: string | null;

  get message(): string | null {
    if (this.error) return this.error;
    if (!this.control) return null;
    const ctrl = this.control;
    if (!(ctrl.touched || ctrl.dirty)) return null;

    const errors = ctrl.errors;
    if (!errors) return null;
    if (errors['required']) return 'Este campo es obligatorio.';
    if (errors['email']) return 'Ingresa un correo válido.';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
    if (errors['min']) return `Debe ser mayor o igual a ${errors['min'].min}.`;
    if (errors['max']) return `Debe ser menor o igual a ${errors['max'].max}.`;
    return 'Verifica este campo.';
  }
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiSpinnerComponent } from './ui-spinner.component';

type UiButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type UiButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [CommonModule, UiSpinnerComponent],
  template: `
    <button
      type="{{ type }}"
      [disabled]="disabled || loading"
      class="ui-btn"
      [ngClass]="[variantClass, sizeClass, fullWidth ? 'full' : '']"
      (click)="clicked.emit($event)"
    >
      <app-ui-spinner *ngIf="loading" class="btn-spinner" size="sm" tone="inverse" aria-label="Cargando"></app-ui-spinner>
      <ng-content></ng-content>
    </button>
  `,
  styleUrls: ['./ui-button.component.scss'],
})
export class UiButtonComponent {
  @Input() variant: UiButtonVariant = 'primary';
  @Input() size: UiButtonSize = 'md';
  @Input() fullWidth = false;
  @Input() loading = false;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  @Output() clicked = new EventEmitter<Event>();

  get variantClass() {
    return `ui-btn-${this.variant}`;
  }

  get sizeClass() {
    return `ui-btn-${this.size}`;
  }
}

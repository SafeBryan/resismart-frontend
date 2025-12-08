import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ui-empty">
      <p class="title">{{ title }}</p>
      <p class="message">{{ message }}</p>
    </div>
  `,
  styleUrls: ['./ui-empty-state.component.scss'],
})
export class UiEmptyStateComponent {
  @Input() title = 'Sin datos';
  @Input() message = 'No hay información disponible para mostrar.';
}

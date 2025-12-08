import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { UiSpinnerComponent } from '../ui-spinner.component';

type SpinnerSize = 'sm' | 'md' | 'lg' | number;
type SpinnerTone = 'primary' | 'inverse';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, UiSpinnerComponent],
  template: `
    <div
      class="loading-overlay"
      [class.fullscreen]="fullscreen"
      role="alert"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="overlay-content" [class.invert]="tone === 'inverse'">
        <app-ui-spinner [size]="size" [tone]="tone"></app-ui-spinner>
        <p *ngIf="message">{{ message }}</p>
      </div>
    </div>
  `,
  styleUrls: ['./loading-overlay.component.scss'],
})
export class LoadingOverlayComponent {
  @Input() message?: string;
  @Input() size: SpinnerSize = 'md';
  @Input() tone: SpinnerTone = 'primary';
  @Input() fullscreen = false;
}

import { Component, Input } from '@angular/core';

type SpinnerSize = 'sm' | 'md' | 'lg' | number;
type SpinnerTone = 'primary' | 'inverse';

@Component({
  selector: 'app-ui-spinner',
  standalone: true,
  template: `
    <span
      class="ui-spinner"
      role="status"
      aria-live="polite"
      [attr.aria-label]="ariaLabel"
      [style.width.px]="resolvedSize"
      [style.height.px]="resolvedSize"
      [style.borderWidth.px]="resolvedBorder"
      [style.--spinner-color]="spinnerColor"
      [style.--spinner-muted]="spinnerMuted"
    ></span>
  `,
  styleUrls: ['./ui-spinner.component.scss'],
})
export class UiSpinnerComponent {
  @Input() size: SpinnerSize = 'md';
  @Input() tone: SpinnerTone = 'primary';
  @Input() ariaLabel = 'Cargando';

  private sizeMap: Record<Exclude<SpinnerSize, number>, number> = {
    sm: 20,
    md: 32,
    lg: 48,
  };

  get resolvedSize(): number {
    return typeof this.size === 'number' ? this.size : this.sizeMap[this.size] ?? this.sizeMap.md;
  }

  get resolvedBorder(): number {
    if (this.resolvedSize <= 22) return 2;
    if (this.resolvedSize >= 48) return 4;
    return 3;
  }

  get spinnerColor(): string {
    return this.tone === 'inverse' ? '#ffffff' : 'var(--color-primary, #47a5f4)';
  }

  get spinnerMuted(): string {
    return this.tone === 'inverse' ? 'rgba(255,255,255,0.38)' : 'var(--color-primary-soft, #e9f4ff)';
  }
}

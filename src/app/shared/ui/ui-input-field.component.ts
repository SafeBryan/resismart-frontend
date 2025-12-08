import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ui-input-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <label class="ui-field" [class.disabled]="disabled">
      <span class="ui-field-label" *ngIf="label">{{ label }}</span>
      <input
        class="ui-input"
        [attr.type]="type"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [value]="value"
        (input)="onInput($event)"
        [attr.aria-describedby]="hint ? fieldId + '-hint' : null"
        [attr.aria-invalid]="!!error"
        [id]="fieldId"
        [name]="name || fieldId"
      />
      <span class="ui-field-hint" *ngIf="hint" [id]="fieldId + '-hint'">{{ hint }}</span>
      <span class="ui-field-error" *ngIf="error">{{ error }}</span>
    </label>
  `,
  styleUrls: ['./ui-input-field.component.scss'],
})
export class UiInputFieldComponent {
  @Input() label?: string;
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() disabled = false;
  @Input() error?: string | null;
  @Input() hint?: string;
  @Input() name?: string;
  @Input() value: string | number | null = '';
  @Output() valueChange = new EventEmitter<string | number | null>();

  private static nextId = 0;
  readonly fieldId = `ui-input-${UiInputFieldComponent.nextId++}`;

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(this.type === 'number' ? Number(target.value) : target.value);
  }
}

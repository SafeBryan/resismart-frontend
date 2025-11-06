import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.css',
})
export class InputComponent {
  private static nextId = 0;
  private readonly internalId = `app-input-${InputComponent.nextId++}`;
  @Input() label?: string;
  @Input() placeholder = '';
  @Input() icon?: 'user' | 'lock' | 'logout' | 'eye' | 'eye-off';
  @Input() type: string = 'text';
  @Input() disabled = false;
  @Input() model: any = '';
  @Output() modelChange = new EventEmitter<any>();
  @Input() variant: 'outlined' | 'underline' = 'outlined';
  @Input() placeholderUppercase = false;
  @Input() togglePassword = true; // only for type='password'
  @Input() hint?: string;
  @Input() inputId?: string;
  @Input() name?: string;

  visible = false;

  get controlId(): string {
    return this.inputId ?? this.internalId;
  }

  get controlName(): string {
    return this.name ?? this.controlId;
  }

  get inputType(): string {
    if (this.type === 'password' && this.togglePassword) {
      return this.visible ? 'text' : 'password';
    }
    return this.type;
  }

  get iconMatName(): string {
    switch (this.icon) {
      case 'user': return 'person';
      case 'lock': return 'lock';
      case 'logout': return 'logout';
      case 'eye': return 'visibility';
      case 'eye-off': return 'visibility_off';
      default: return '';
    }
  }
}

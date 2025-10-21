import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon';

@Component({
  selector: 'app-input-text',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './input-text.component.html',
  styleUrl: './input-text.component.css',
})
export class InputTextComponent {
  @Input() label?: string;
  @Input() placeholder = '';
  @Input() icon?: 'user' | 'lock';
  @Input() type: 'text' | 'email' = 'text';
  @Input() disabled = false;
  @Input() model: string = '';
  @Output() modelChange = new EventEmitter<string>();
  @Input() variant: 'outlined' | 'underline' = 'outlined';
  @Input() placeholderUppercase = false;
}

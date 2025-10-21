import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon';

@Component({
  selector: 'app-input-password',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './input-password.component.html',
  styleUrl: './input-password.component.css',
})
export class InputPasswordComponent {
  @Input() label?: string;
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() model: string = '';
  @Output() modelChange = new EventEmitter<string>();
  @Input() variant: 'outlined' | 'underline' = 'outlined';
  @Input() placeholderUppercase = false;

  visible = false;
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { IconComponent } from '../icon';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [NgClass, IconComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() label = 'Botón';
  @Input() variant: 'primary' | 'secondary' | 'sky' = 'primary';
  @Input() fullWidth = false;
  @Input() iconLeft?: 'user' | 'lock' | 'logout' | 'eye' | 'eye-off';
  @Input() iconRight?: 'user' | 'lock' | 'logout' | 'eye' | 'eye-off';
  @Input() pill = false;

  @Output() clicked = new EventEmitter<Event>();
}

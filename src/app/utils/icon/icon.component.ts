import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
})
export class IconComponent {
  @Input() name: 'user' | 'lock' | 'logout' | 'eye' | 'eye-off' = 'user';
  @Input() size: number | string = 20;
  @Input() color?: string;

  get sizePx(): number {
    return typeof this.size === 'string' ? parseInt(this.size, 10) || 20 : this.size;
  }
}

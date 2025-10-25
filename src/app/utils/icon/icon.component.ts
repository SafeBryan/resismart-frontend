import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
})
export class IconComponent {
  @Input() name: 'user' | 'lock' | 'logout' | 'eye' | 'eye-off' = 'user';
  @Input() size: number | string = 20;
  @Input() color?: string;

  get matName(): string {
    switch (this.name) {
      case 'user': return 'person';
      case 'lock': return 'lock';
      case 'logout': return 'logout';
      case 'eye': return 'visibility';
      case 'eye-off': return 'visibility_off';
      default: return 'help';
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ui-card" [ngClass]="{ bordered, elevated }">
      <div class="ui-card-header" *ngIf="hasHeader">
        <ng-content select="[card-header]"></ng-content>
      </div>
      <div class="ui-card-body">
        <ng-content></ng-content>
      </div>
      <div class="ui-card-footer" *ngIf="hasFooter">
        <ng-content select="[card-footer]"></ng-content>
      </div>
    </div>
  `,
  styleUrls: ['./ui-card.component.scss'],
})
export class UiCardComponent {
  @Input() bordered = false;
  @Input() elevated = true;
  @Input() hasHeader = false;
  @Input() hasFooter = false;
}

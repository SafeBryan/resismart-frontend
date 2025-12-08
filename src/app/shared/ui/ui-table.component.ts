import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { UiSpinnerComponent } from './ui-spinner.component';
import { UiEmptyStateComponent } from './ui-empty-state.component';

@Component({
  selector: 'app-ui-table',
  standalone: true,
  imports: [CommonModule, UiSpinnerComponent, UiEmptyStateComponent],
  template: `
    <div class="ui-table-wrapper">
      <div class="ui-table-loading" *ngIf="loading"><app-ui-spinner></app-ui-spinner></div>
      <ng-container *ngIf="!loading && !isEmpty; else emptyTpl">
        <table class="ui-table">
          <ng-content select="thead"></ng-content>
          <ng-content select="tbody"></ng-content>
        </table>
      </ng-container>
      <ng-template #emptyTpl>
        <app-ui-empty-state [title]="emptyTitle" [message]="emptyMessage"></app-ui-empty-state>
      </ng-template>
    </div>
  `,
  styleUrls: ['./ui-table.component.scss'],
})
export class UiTableComponent {
  @Input() loading = false;
  @Input() isEmpty = false;
  @Input() emptyTitle = 'Sin datos';
  @Input() emptyMessage = 'No hay información disponible para mostrar.';
}

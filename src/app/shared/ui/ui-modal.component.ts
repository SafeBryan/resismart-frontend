import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

type ModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="ui-modal-backdrop"
      *ngIf="open"
      (click)="onBackdrop($event)"
      role="presentation"
      aria-hidden="true"
    ></div>
    <div
      class="ui-modal"
      *ngIf="open"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title || 'Diálogo'"
    >
      <div class="ui-modal-content" [ngClass]="sizeClass" (click)="$event.stopPropagation()">
        <div class="ui-modal-header">
          <h3 class="ui-modal-title">{{ title }}</h3>
          <button class="ui-modal-close" type="button" aria-label="Cerrar" (click)="closed.emit()">&times;</button>
        </div>
        <div class="ui-modal-body">
          <ng-content></ng-content>
        </div>
        <div class="ui-modal-footer" *ngIf="showFooter">
          <ng-content select="[modal-footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./ui-modal.component.scss'],
})
export class UiModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() size: ModalSize = 'md';
  @Input() showFooter = true;
  @Output() closed = new EventEmitter<void>();

  get sizeClass(): string {
    return `ui-modal-${this.size}`;
  }

  @HostListener('document:keydown.escape')
  handleEsc() {
    if (this.open) this.closed.emit();
  }

  onBackdrop(event: MouseEvent) {
    event.stopPropagation();
    this.closed.emit();
  }
}

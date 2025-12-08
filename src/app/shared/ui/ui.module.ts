import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from './ui-button.component';
import { UiCardComponent } from './ui-card.component';
import { UiInputFieldComponent } from './ui-input-field.component';
import { UiTableComponent } from './ui-table.component';
import { FieldErrorComponent } from './field-error.component';
import { UiSpinnerComponent } from './ui-spinner.component';
import { UiEmptyStateComponent } from './ui-empty-state.component';
import { UiModalComponent } from './ui-modal.component';
import { LoadingOverlayComponent } from './loading-overlay/loading-overlay.component';

@NgModule({
  imports: [
    CommonModule,
    UiButtonComponent,
    UiCardComponent,
    UiInputFieldComponent,
    UiTableComponent,
    FieldErrorComponent,
    UiSpinnerComponent,
    UiEmptyStateComponent,
    UiModalComponent,
    LoadingOverlayComponent,
  ],
  exports: [
    UiButtonComponent,
    UiCardComponent,
    UiInputFieldComponent,
    UiTableComponent,
    FieldErrorComponent,
    UiSpinnerComponent,
    UiEmptyStateComponent,
    UiModalComponent,
    LoadingOverlayComponent,
  ],
})
export class UiModule {}

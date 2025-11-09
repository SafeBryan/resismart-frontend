import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastMessage, ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css',
})
export class ToastContainerComponent {
  private toastService = inject(ToastService);
  readonly toasts = computed(() => this.toastService.toasts());
  readonly confirmToast = computed<ToastMessage | null>(() => {
    return (
      this.toasts().find(
        (toast) => !!toast.actions && toast.actions.length === 2 && !!toast.resolve
      ) ?? null
    );
  });
  readonly regularToasts = computed(() => {
    const confirm = this.confirmToast();
    if (!confirm) return this.toasts();
    return this.toasts().filter((toast) => toast.id !== confirm.id);
  });

  dismiss(id: number) {
    this.toastService.dismiss(id);
  }

  trackById = (_: number, toast: { id: number }) => toast.id;

  handleAction(id: number, value: any) {
    this.toastService.action(id, value);
  }
}

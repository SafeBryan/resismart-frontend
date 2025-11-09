import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  value: any;
  variant?: 'primary' | 'secondary';
}

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  dismissible: boolean;
  timeoutId?: number;
  actions?: ToastAction[];
  resolve?: (value: any) => void;
}

const DEFAULT_DURATION = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private static nextId = 0;
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: string, type: ToastType = 'info', duration = DEFAULT_DURATION, dismissible = true): number {
    const id = ToastService.nextId++;
    this.enqueue({ id, message, type, dismissible }, duration);
    return id;
  }

  success(message: string, duration = DEFAULT_DURATION) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration = DEFAULT_DURATION) {
    return this.show(message, 'error', duration);
  }

  info(message: string, duration = DEFAULT_DURATION) {
    return this.show(message, 'info', duration);
  }

  confirm(
    message: string,
    options?: { confirmText?: string; cancelText?: string; type?: ToastType }
  ): Promise<boolean> {
    const id = ToastService.nextId++;
    const type = options?.type ?? 'info';
    return new Promise<boolean>((resolve) => {
      const toast: ToastMessage = {
        id,
        message,
        type,
        dismissible: false,
        actions: [
          { label: options?.cancelText ?? 'Cancelar', value: false, variant: 'secondary' },
          { label: options?.confirmText ?? 'Confirmar', value: true, variant: 'primary' },
        ],
        resolve,
      };
      this.enqueue(toast, 0);
    });
  }

  action(id: number, value: any) {
    const toast = this.find(id);
    if (!toast) return;
    if (toast.resolve) toast.resolve(value);
    this.dismiss(id, { silent: true });
  }

  dismiss(id: number, opts?: { silent?: boolean }) {
    const toast = this.find(id);
    if (!toast) return;
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    if (!opts?.silent && toast.resolve) toast.resolve(false);
    this.toasts.update((items) => items.filter((t) => t.id !== id));
  }

  clear() {
    this.toasts().forEach((toast) => this.dismiss(toast.id, { silent: true }));
  }

  private enqueue(toast: ToastMessage, duration: number) {
    this.toasts.update((items) => [...items, toast]);
    if (duration > 0) {
      const timeoutId = window.setTimeout(() => this.dismiss(toast.id, { silent: true }), duration);
      this.updateToast(toast.id, { timeoutId });
    }
  }

  private updateToast(id: number, partial: Partial<ToastMessage>) {
    this.toasts.update((items) =>
      items.map((toast) => (toast.id === id ? { ...toast, ...partial } : toast))
    );
  }

  private find(id: number): ToastMessage | undefined {
    return this.toasts().find((toast) => toast.id === id);
  }
}

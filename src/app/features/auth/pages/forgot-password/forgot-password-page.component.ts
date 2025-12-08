import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UtilsModule } from '../../../../utils/utils.module';
import { UiSpinnerComponent } from '../../../../shared/ui/ui-spinner.component';
import { LoadingOverlayComponent } from '../../../../shared/ui/loading-overlay/loading-overlay.component';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, UtilsModule, MatIconModule, UiSpinnerComponent, LoadingOverlayComponent],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss',
})
export class ForgotPasswordPageComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  loading = false;
  infoMessage = '';
  errorMessage = '';

  get email() {
    return this.form.controls.email;
  }

  submit(): void {
    this.infoMessage = '';
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const email = (this.email.value ?? '').trim();
    this.auth
      .forgotPassword(email)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.infoMessage = 'Si el correo existe en el sistema, se ha enviado un enlace para restablecer tu contrasena.';
          this.toast.info(this.infoMessage);
        },
        error: (err) => {
          const msg = err?.message || 'No se pudo enviar el enlace. Intenta de nuevo.';
          this.errorMessage = msg;
          this.toast.error(msg);
        },
      });
  }
}

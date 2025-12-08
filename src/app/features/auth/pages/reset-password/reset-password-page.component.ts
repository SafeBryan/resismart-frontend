import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UtilsModule } from '../../../../utils/utils.module';
import { UiSpinnerComponent } from '../../../../shared/ui/ui-spinner.component';
import { LoadingOverlayComponent } from '../../../../shared/ui/loading-overlay/loading-overlay.component';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, UtilsModule, MatIconModule, UiSpinnerComponent, LoadingOverlayComponent],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
})
export class ResetPasswordPageComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  private redirectTimer?: number;

  form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8), this.passwordComplexityValidator.bind(this)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordsMatchValidator }
  );
  token: string | null = null;
  loading = false;
  infoMessage = '';
  errorMessage = '';

  get password() {
    return this.form.controls.password;
  }

  get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.token = params.get('token');
      if (!this.token) {
        this.errorMessage = 'Token no valido o expirado.';
        this.form.disable({ emitEvent: false });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) {
      window.clearTimeout(this.redirectTimer);
    }
  }

  submit(): void {
    this.infoMessage = '';
    this.errorMessage = '';
    if (!this.token) {
      this.errorMessage = 'Token no valido o expirado.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const password = this.password.value;
    this.loading = true;
    this.auth
      .resetPassword(this.token, password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.infoMessage = 'Tu contrasena ha sido actualizada correctamente.';
          this.toast.success(this.infoMessage);
          this.redirectTimer = window.setTimeout(() => this.router.navigateByUrl('/login'), 1800);
        },
        error: (err) => {
          const msg = err?.message || 'No se pudo actualizar la contrasena. Intenta nuevamente.';
          this.errorMessage = msg;
          this.toast.error(msg);
        },
      });
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (pass && confirm && pass !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value as string) || '';
    if (!value) return null;
    const meets = /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
    return meets ? null : { weakPassword: true };
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UtilsModule } from '../../../utils/utils.module';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, UtilsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  email = '';
  sent = false;

  constructor(private auth: AuthService, private router: Router, private toast: ToastService) {}

  submit(): void {
    const email = this.email?.trim();
    if (!email) {
      this.toast.error('Ingresa tu correo para continuar.');
      return;
    }
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.sent = true;
        this.toast.info('Si el correo existe, se enviaron instrucciones.');
      },
      error: () => {
        this.sent = true;
        this.toast.info('Si el correo existe, se enviaron instrucciones.');
      },
    });
  }

  goLogin(): void {
    this.router.navigateByUrl('/login');
  }
}


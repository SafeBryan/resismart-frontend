import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilsModule } from '../../../utils/utils.module';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, UtilsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  token: string | null = null;
  password = '';
  confirm = '';

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.token = params.get('token');
    });
  }

  submit(): void {
    if (!this.token) {
      this.toast.error('Token no encontrado. Revisa el enlace de recuperacion.');
      return;
    }
    if (!this.password || this.password !== this.confirm) {
      this.toast.error('Las contraseñas deben coincidir.');
      return;
    }
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.toast.success('Contraseña actualizada. Ahora puedes iniciar sesión.');
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        console.error(err);
        this.toast.error('No se pudo actualizar la contraseña. Intenta nuevamente.');
      },
    });
  }
}


import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UtilsModule } from '../../../utils/utils.module';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { isAdmin, isOwner, isResident } from '../../../core/utils/role.util';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [UtilsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private router: Router, private auth: AuthService, private toast: ToastService) {}

  goHome() {
    const email = this.email?.trim();
    const password = this.password;
    if (!email || !password) {
      if (environment.debug) console.log('[Login] Falta email o password');
      this.toast.error('Ingresa tu correo y contrasena para continuar.');
      return;
    }
    if (environment.debug) console.log('[Login] POST /login', { email });
    let pendingToastId: number | null = this.toast.show('Validando credenciales...', 'info', 0, false);
    const clearPendingToast = () => {
      if (pendingToastId != null) {
        this.toast.dismiss(pendingToastId);
        pendingToastId = null;
      }
    };
    this.auth.login(email, password).subscribe({
      next: () => {
        clearPendingToast();
        if (environment.debug) console.log('[Login] OK');
        const id = this.auth.snapshot.idUsuario;
        const role = this.auth.getRole();
        // Admin/Owner pueden consultar por ID; residentes no (evitar 403 â†’ logout del interceptor)
        const r = (role ?? '').toString().toUpperCase();
        const owner = isOwner(role);
        const admin = isAdmin(role);
        const resident = isResident(role);
        // Admin: puede leer /Usuarios/{id}. Dueño y Residente: usa whoami para evitar 403.
        if (id && admin) {
          this.auth.fetchUserById(id).subscribe({
            next: () => {
              if (environment.debug) console.log('[Login] Perfil cargado');
              this.toast.info('Perfil sincronizado correctamente.');
            },
            error: (err) => {
              if (environment.debug) console.error('[Login] Error perfil', err);
              this.toast.error('No se pudo sincronizar el perfil.');
            },
          });
        } else {
          this.auth.validateToken(true).subscribe({
            next: (valid) => {
              if (!valid) {
                this.toast.error('No se pudo validar tu sesion.');
              } else if (environment.debug) {
                console.log('[Login] Sesion validada');
              }
            },
          });
        }
        if (environment.debug) console.log('[Login] rol recibido:', role);
        if (environment.debug) console.log('[Login] Rol normalizado:', r);
        if (environment.debug) console.log('[Login] rol normalizado', { r, owner, admin, resident });
        const target = admin || owner ? 'panel administrativo' : 'inicio de residente';
        const readableRole =
          owner ? 'propietario' : admin ? 'administrador' : resident ? 'residente' : (r || 'usuario').toLowerCase() || 'usuario';
        this.toast.success(`Sesion iniciada como ${readableRole}. Redirigiendo al ${target}...`);
        if (admin || owner) {
          this.router.navigateByUrl('/dashboard');
        } else if (resident) {
          this.router.navigateByUrl('/home');
        } else {
          // Fallback seguro para evitar loops si el rol es desconocido
          if (environment.debug) console.warn('[Login] Rol desconocido, a /login');
          this.router.navigateByUrl('/login');
        }
      },
      error: (err) => {
        if (environment.debug) console.error('[Login] Error', err);
        clearPendingToast();
        this.toast.error(this.resolveLoginError(err));
      },
    });
  }

  private resolveLoginError(err: any): string {
    if (err?.status === 401 || err?.status === 403 || err?.status === 500) {
      return 'Credenciales invalidas. Verifica tu correo y contrasena.';
    }
    if (err?.status === 0) {
      return 'No se pudo contactar con el servidor. Intentalo nuevamente en unos segundos.';
    }
    const msg = err?.error?.message ?? err?.message;
    if (typeof msg === 'string' && msg.trim().length) return msg;
    return 'No se pudo iniciar sesion. Intentalo de nuevo.';
  }
}



import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UtilsModule } from '../../../utils/utils.module';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [UtilsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private router: Router, private auth: AuthService) {}

  goHome() {
    const email = this.email?.trim();
    const password = this.password;
    if (!email || !password) {
      if (environment.debug) console.log('[Login] Falta email o password');
      return;
    }
    if (environment.debug) console.log('[Login] POST /login', { email });
    this.auth.login(email, password).subscribe({
      next: () => {
        if (environment.debug) console.log('[Login] OK');
        const id = this.auth.snapshot.idUsuario;
        const role = this.auth.getRole();
        // Admin/Owner pueden consultar por ID; residentes no (evitar 403 → logout del interceptor)
        const r = (role ?? '').toString().toUpperCase();
        const isOwner = r === 'DUEÑO' || r === 'DUENO' || r === 'OWNER';
        const isAdmin = r === 'ADMIN' || r === 'ADMINISTRADOR';
        const isResident = r === 'RESIDENTE' || r === 'RESIDENT' || r === 'TENANT';
        if (id && (isAdmin || isOwner)) {
          this.auth.fetchUserById(id).subscribe({ next: () => { if (environment.debug) console.log('[Login] Perfil cargado'); } });
        } else {
          // Para residentes u otros, valida con whoami para poblar perfil sin 403
          this.auth.validateToken(true).subscribe();
        }
        if (environment.debug) console.log('[Login] rol recibido:', role);
        if (environment.debug) console.log('[Login] Rol normalizado:', r);
        if (environment.debug) console.log('[Login] rol normalizado', { r, isOwner, isAdmin, isResident });
        if (isAdmin || isOwner) {
          this.router.navigateByUrl('/dashboard');
        } else if (isResident) {
          this.router.navigateByUrl('/home');
        } else {
          // Fallback seguro para evitar loops si el rol es desconocido
          if (environment.debug) console.warn('[Login] Rol desconocido, a /login');
          this.router.navigateByUrl('/login');
        }
      },
      error: (err) => {
        if (environment.debug) console.error('[Login] Error', err);
      },
    });
  }
}

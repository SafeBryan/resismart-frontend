import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

// Si hay token válido, redirige a dashboard (ADMIN/OWNER) o home (RESIDENTE)
export const loginRedirectGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  if (!token) return true; // no token, permitir login

  return auth.validateToken(true).pipe(
    map((valid) => {
      if (!valid) return true; // token inválido, permitir login
      const roleRaw = auth.getRole();
      const r = (roleRaw ?? '').toString().toUpperCase();
      const isOwner = r === 'DUEÑO' || r === 'DUENO' || r === 'OWNER';
      const isAdmin = r === 'ADMIN' || r === 'ADMINISTRADOR';
      const isResident = r === 'RESIDENTE' || r === 'RESIDENT' || r === 'TENANT';
      const target = (isAdmin || isOwner) ? '/dashboard' : (isResident ? '/home' : '/login');
      if (environment.debug) console.log('[LoginRedirectGuard] válido →', target);
      return router.createUrlTree([target]);
    })
  );
};


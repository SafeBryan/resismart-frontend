import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';
import { isAdmin, isOwner, isResident } from '../utils/role.util';

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
      const target = (isAdmin(roleRaw) || isOwner(roleRaw)) ? '/dashboard' : (isResident(roleRaw) ? '/home' : '/login');
      if (environment.debug) console.log('[LoginRedirectGuard] válido →', target);
      return router.createUrlTree([target]);
    })
  );
};


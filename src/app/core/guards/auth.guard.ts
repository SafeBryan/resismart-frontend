import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  const router = inject(Router);
  if (environment.debug) {
    // eslint-disable-next-line no-console
    console.log('[AuthGuard] No autenticado -> /login');
  }
  return router.createUrlTree(['/login']);
};

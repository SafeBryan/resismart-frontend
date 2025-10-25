import { CanMatchFn, Route, UrlSegment, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';
import { normalizeRole, RoleNorm } from '../utils/role.util';

export const roleGuard: CanMatchFn = (route: Route, _segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed: string[] = (route.data as any)?.['roles'] ?? [];
  const roleRaw = auth.getRole();
  const allowedNorm = new Set<RoleNorm>(allowed.map((r) => normalizeRole(r as any)));

  // Equivalencia: ADMIN y OWNER se tratan como el mismo nivel de acceso
  if (allowedNorm.has('ADMIN')) allowedNorm.add('OWNER');
  if (allowedNorm.has('OWNER')) allowedNorm.add('ADMIN');

  // Verifica el token contra el backend en cada cambio de ruta (forzado)
  return auth.validateToken(true).pipe(
    map((valid) => {
      if (!valid) {
        if (environment.debug) console.log('[RoleGuard] Token inválido/expirado, a /login');
        return router.createUrlTree(['/login']);
      }

      const role = normalizeRole(auth.getRole());
      if (environment.debug) {
        console.log('[RoleGuard] allowed=', Array.from(allowedNorm).join(','), 'roleRaw=', roleRaw, 'role=', role);
      }
      if (allowedNorm.size === 0 || allowedNorm.has(role)) return true;

      // Si el rol no está permitido, redirige a una ruta segura según el rol
      if (role === 'RESIDENTE') {
        if (environment.debug) console.log('[RoleGuard] Redirige a /home');
        return router.createUrlTree(['/home']);
      }
      if (role === 'ADMIN' || role === 'OWNER') {
        if (environment.debug) console.log('[RoleGuard] Redirige a /dashboard');
        return router.createUrlTree(['/dashboard']);
      }
      // Fallback seguro
      if (environment.debug) console.log('[RoleGuard] Rol desconocido, a /login');
      return router.createUrlTree(['/login']);
    })
  );
};

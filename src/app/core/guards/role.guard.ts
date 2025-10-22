import { CanMatchFn, Route, UrlSegment, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

export const roleGuard: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed: string[] = (route.data as any)?.['roles'] ?? [];
  const roleRaw = auth.getRole();
  const normalize = (v: string | null | undefined): 'ADMIN' | 'OWNER' | 'RESIDENTE' | 'UNKNOWN' => {
    const r = (v ?? '').toString().toUpperCase();
    if (r === 'ADMIN' || r === 'ADMINISTRADOR') return 'ADMIN';
    if (r === 'DUEÑO' || r === 'DUENO' || r === 'OWNER') return 'OWNER';
    if (r === 'RESIDENTE' || r === 'RESIDENT' || r === 'TENANT') return 'RESIDENTE';
    return 'UNKNOWN';
  };
  const allowedNorm = new Set(allowed.map((r) => normalize(r as any)));

  // Verifica el token contra el backend en cada cambio de ruta (forzado)
  return auth.validateToken(true).pipe(
    map((valid) => {
      if (!valid) {
        if (environment.debug) console.log('[RoleGuard] Token inválido/expirado, a /login');
        return router.createUrlTree(['/login']);
      }

      const role = normalize(auth.getRole());
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

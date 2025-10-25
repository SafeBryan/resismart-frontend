import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  const isAuthCheck = cloned.url.includes('/Usuarios/whoami');
  const isLogin = cloned.url.includes('/login');

  const proceed$ = (environment.debug ? of(true).pipe(tap(() => console.log('[HTTP] →', cloned.method, cloned.url))) : of(true)).pipe(
    switchMap(() => {
      // Validate token lazily before other requests (avoid recursion on whoami and login)
      if (!isAuthCheck && !isLogin && auth.getToken()) {
        return auth.validateToken(false).pipe(
          switchMap((valid) => {
            if (!valid) {
              if (environment.debug) console.warn('[HTTP] Token inválido, cerrando sesión');
              router.navigateByUrl('/login');
              return throwError(() => new Error('Invalid token'));
            }
            return next(cloned);
          })
        );
      }
      return next(cloned);
    })
  );

  return proceed$.pipe(
    tap({
      next: (event: any) => {
        if (environment.debug && event?.status) {
          console.log('[HTTP] ←', event.status, cloned.url);
        }
      },
    }),
    catchError((err) => {
      if (environment.debug) console.error('[HTTP] ×', cloned.url, err.status, err.message);
      if (err.status === 401 || err.status === 403) {
        auth.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};

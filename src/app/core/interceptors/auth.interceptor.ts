import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { throwError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const token = auth.getToken();
  const cloned = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  const isAuthCheck = cloned.url.includes('/Usuarios/whoami');
  const isLogin = cloned.url.includes('/login');
  const isPublicReset = cloned.url.includes('/auth/forgot-password') || cloned.url.includes('/auth/reset-password');

  const proceed$ = (environment.debug ? of(true).pipe(tap(() => console.log('[HTTP]', cloned.method, cloned.url))) : of(true)).pipe(
    switchMap(() => {
      // Validate token lazily before other requests (avoid recursion on whoami/login/reset)
      if (!isAuthCheck && !isLogin && !isPublicReset && auth.getToken()) {
        return auth.validateToken(false).pipe(
          switchMap((valid) => {
            if (!valid) {
              if (environment.debug) console.warn('[HTTP] Token invalido, cerrando sesion');
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
          console.log('[HTTP]', event.status, cloned.url);
        }
      },
    }),
    catchError((err) => {
      if (environment.debug) console.error('[HTTP]', cloned.url, err.status, err.message);
      if (!isPublicReset && err.status === 401) {
        auth.logout();
        router.navigateByUrl('/login');
      } else {
        const msg =
          (err?.error && (err.error.message || err.error.error)) ||
          err?.message ||
          'Ha ocurrido un error inesperado. Intenta nuevamente o contacta al administrador.';
        toast.error(msg);
      }
      // Para 403 dejamos que el componente maneje el error (evita logout por falta de permisos en endpoints no críticos)
      return throwError(() => err);
    })
  );
};

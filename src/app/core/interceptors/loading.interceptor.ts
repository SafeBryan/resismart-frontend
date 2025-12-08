import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';
import { inject } from '@angular/core';

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  const track = MUTATING_METHODS.includes(req.method.toUpperCase());
  if (!track) return next(req);

  loading.show();
  return next(req).pipe(finalize(() => loading.hide()));
};

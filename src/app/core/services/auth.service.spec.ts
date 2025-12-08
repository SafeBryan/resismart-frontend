import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl || 'http://localhost:3000';

  const buildToken = (payload: Record<string, any>) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.signature`;
  };

  const readAuthStorage = () => {
    const stored = localStorage.getItem('auth');
    return stored ? JSON.parse(stored) : null;
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should POST credentials, decode payload, and persist the session on login', () => {
    const token = buildToken({ rol: 'ADMIN', idUsuario: 99 });

    service.login('admin@mail.com', 'secret').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@mail.com', password: 'secret' });

    req.flush({ token });

    expect(service.snapshot.token).toBe(token);
    expect(service.snapshot.idUsuario).toBe(99);
    expect(service.getRole()).toBe('ADMIN');
    expect(readAuthStorage()).toEqual({ token, profile: null });
  });

  it('should clear session data and persisted payload on logout', () => {
    const token = buildToken({ rol: 'RESIDENTE', idUsuario: 'u-1' });

    service.login('user@mail.com', 'pwd').subscribe();
    httpMock.expectOne(`${apiUrl}/login`).flush({ token });

    service.logout();

    expect(service.snapshot.token).toBeNull();
    expect(service.snapshot.idUsuario).toBeNull();
    expect(service.getRole()).toBeNull();
    expect(readAuthStorage()).toEqual({ token: null, profile: null });
  });

  it('should logout and emit false when validateToken finds an expired JWT', (done) => {
    const expiredToken = buildToken({ exp: Math.floor(Date.now() / 1000) - 10 });
    (service as any).state$.next({ token: expiredToken, role: 'ADMIN', idUsuario: 1, profile: null });
    localStorage.setItem('auth', JSON.stringify({ token: expiredToken, profile: null }));

    service.validateToken().subscribe((valid) => {
      expect(valid).toBeFalse();
      expect(service.snapshot.token).toBeNull();
      expect(readAuthStorage()).toEqual({ token: null, profile: null });
      done();
    });

    httpMock.expectNone(`${apiUrl}/Usuarios/whoami`);
  });
});

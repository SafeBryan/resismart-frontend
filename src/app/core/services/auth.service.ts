import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of, map, catchError, finalize, shareReplay, throwError } from 'rxjs';
import { AuthState, LoginResponse, Role, JwtPayload } from '../models/auth.model';
import { UserProfile } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { CondominioContextService } from './condominio-context.service';
import { normalizeRole } from '../utils/role.util';
import { UsuariosService } from './usuarios.service';

const API_URL: string = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private condominioContext = inject(CondominioContextService);
  private usuariosService = inject(UsuariosService);

  private state$ = new BehaviorSubject<AuthState & { profile?: UserProfile | null }>(this.loadFromStorage());

  get auth$(): Observable<AuthState & { profile?: UserProfile | null }> {
    return this.state$.asObservable();
  }

  get snapshot(): AuthState & { profile?: UserProfile | null } {
    return this.state$.value;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    const body = { email, password };
    const url = `${API_URL}/auth/login`;
    if (environment.debug) console.log('[AuthService] POST', url, body);
    return this.http.post<LoginResponse | { access_token: string } | string>(url, body).pipe(
      tap((resp: any) => {
        if (environment.debug) console.log('[AuthService] login response', resp);
        const token: string = (resp && (resp.token || resp.access_token)) || (typeof resp === 'string' ? resp : '');
        const payload = this.decodeJwt(token);
        const role: Role | null = (payload?.rol || payload?.role || null) as Role | null;
        const idUsuario: any = payload?.idUsuario ?? payload?.user_id ?? payload?.id ?? null;
        const next: AuthState = { token: token || null, role, idUsuario };
        this.state$.next(next as any);
        this.saveToStorage(next as any);
        const normalizedRole = normalizeRole(role);
        if (normalizedRole === 'ADMIN' || normalizedRole === 'OWNER') {
          // Precarga condominios solo si aplica; errores ya se manejan en el servicio
          this.condominioContext.loadMisCondominios().subscribe();
        }
      })
    );
  }

  fetchUserById(id: string | number): Observable<UserProfile> {
    if (environment.debug) console.log('[AuthService] GET', `${API_URL}/Usuarios/${id}`);
    return this.http.get<UserProfile>(`${API_URL}/Usuarios/${id}`).pipe(
      tap((profile) => {
        if (environment.debug) console.log('[AuthService] profile', profile);
        const next = { ...this.snapshot, profile };
        this.state$.next(next);
        this.saveToStorage(next);
      })
    );
  }

  logout() {
    const next: AuthState & { profile?: UserProfile | null } = { token: null, role: null, idUsuario: null, profile: null };
    this.state$.next(next);
    this.saveToStorage(next);
  }

  isAuthenticated(): boolean {
    return !!this.snapshot.token;
  }

  getToken(): string | null {
    return this.snapshot.token;
  }

  getRole(): Role | null {
    return this.snapshot.role;
  }

  refreshProfile(): Observable<UserProfile> {
    const url = `${API_URL}/Usuarios/whoami`;
    return this.http.get<UserProfile>(url).pipe(
      tap((profile) => this.mergeProfile(profile))
    );
  }

  updateAvatar(file: File): Observable<void> {
    const auth = this.state$.value;
    if (!auth) {
      return throwError(() => new Error('No hay sesión activa'));
    }

    const request$ = this.usuariosService.uploadMyAvatar(file);

    return request$.pipe(
      tap((updatedUser) => {
        const current = this.state$.value;
        if (!current) return;
        const next = {
          ...current,
          profile: {
            ...(current.profile ?? {}),
            avatarUrl: (updatedUser as any)?.avatarUrl,
          },
        };
        this.state$.next(next as any);
        this.saveToStorage(next as any);
      }),
      map(() => void 0)
    );
  }

  mergeProfile(profile: Partial<UserProfile> | Record<string, any> | null) {
    const currentProfile = this.snapshot.profile ?? null;
    const updatedProfile = profile ? { ...(currentProfile ?? {}), ...profile } : profile;
    const next = { ...this.snapshot, profile: updatedProfile };
    this.state$.next(next);
    this.saveToStorage(next);
  }

  forgotPassword(email: string): Observable<void> {
    const body = { email };
    const url = `${API_URL}/auth/forgot-password`;
    if (environment.debug) console.log('[AuthService] POST', url, body);
    return this.http.post<void>(url, body, { responseType: 'text' as 'json' }).pipe(
      map(() => void 0),
      catchError((err) => throwError(() => this.formatHttpError(err, 'No se pudo enviar el enlace de recuperacion.'))),
    );
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    const body = { token, newPassword };
    const url = `${API_URL}/auth/reset-password`;
    if (environment.debug) console.log('[AuthService] POST', url, body);
    return this.http.post<void>(url, body, { responseType: 'text' as 'json' }).pipe(
      map(() => void 0),
      catchError((err) => throwError(() => this.formatHttpError(err, 'No se pudo actualizar la contrasena.'))),
    );
  }

  // Token validation cache
  private lastValidation = 0;
  private validating$?: Observable<boolean>;

  validateToken(force = false): Observable<boolean> {
    const token = this.getToken();
    if (!token) return of(false);
    // Si el JWT ya expiró según 'exp', evita llamada y cierra sesión
    const payload = this.decodeJwt(token) as any;
    const expMs = payload?.exp ? Number(payload.exp) * 1000 : null;
    if (expMs && Date.now() >= expMs) {
      if (environment.debug) console.warn('[AuthService] JWT expirado localmente');
      this.logout();
      return of(false);
    }
    const now = Date.now();
    if (!force && now - this.lastValidation < 60_000) return of(true);
    if (this.validating$) return this.validating$;

    const url = `${API_URL}/Usuarios/whoami`;
    this.validating$ = this.http.get<UserProfile>(url).pipe(
      tap((profile: any) => {
        // Actualiza estado en memoria con datos no sensibles
        const role: Role | null = (profile?.rol ?? profile?.role ?? this.snapshot.role) as Role | null;
        const idUsuario: any = profile?.id_usuario ?? profile?.idUsuario ?? profile?.id ?? this.snapshot.idUsuario;
        const mergedProfile = { ...(this.snapshot.profile ?? {}), ...profile };
        const next = { ...this.snapshot, role, idUsuario, profile: mergedProfile };
        this.state$.next(next);
        // Persistir solo token y datos básicos (sin rol)
        this.saveToStorage(next);
        this.lastValidation = Date.now();
      }),
      map(() => true),
      catchError((_err) => {
        // On validation error, logout and report invalid
        this.logout();
        return of(false);
      }),
      finalize(() => {
        this.validating$ = undefined;
      }),
      shareReplay(1)
    );
    return this.validating$;
  }

  private saveToStorage(state: AuthState & { profile?: UserProfile | null }) {
    const sanitizedProfile = sanitizeProfile(state.profile);
    const payload = { token: state.token, profile: sanitizedProfile };
    localStorage.setItem('auth', JSON.stringify(payload));
  }

  private loadFromStorage(): AuthState & { profile?: UserProfile | null } {
    try {
      const raw = localStorage.getItem('auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        const token: string | null = parsed?.token ?? null;
        const profile = sanitizeProfile(parsed?.profile);
        return { token, role: null, idUsuario: null, profile };
      }
    } catch {}
    return { token: null, role: null, idUsuario: null };
  }

  private decodeJwt(token: string): JwtPayload | null {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payloadJson = base64UrlDecode(parts[1]);
      return JSON.parse(payloadJson);
    } catch {
      return null;
    }
  }

  private formatHttpError(err: any, fallback: string) {
    const status = err?.status;
    const msg = err?.error?.message ?? err?.error?.error ?? err?.message;
    const message = typeof msg === 'string' && msg.trim().length ? msg : fallback;
    return { status, message };
  }
}

// Helpers
function base64UrlDecode(input: string): string {
  try {
    let s = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = s.length % 4;
    if (pad) s += '='.repeat(4 - pad);
    return atob(s);
  } catch {
    return '';
  }
}

// Persistencia: perfila solo datos generales
function sanitizeProfile(profile: any | null | undefined): any | null {
  if (!profile) return null;
  const email = profile?.email ?? profile?.correo ?? null;
  const nombres = profile?.nombres ?? profile?.nombre ?? null;
  const apellidos = profile?.apellidos ?? null;
  const telefono = profile?.telefono ?? null;
  const avatarUrl = profile?.avatarUrl ?? profile?.avatar_url ?? null;
  const safe: any = {};
  if (email != null) safe.email = email;
  if (nombres != null) safe.nombres = nombres;
  if (apellidos != null) safe.apellidos = apellidos;
  if (telefono != null) safe.telefono = telefono;
  if (avatarUrl != null) safe.avatarUrl = avatarUrl;
  return safe;
}

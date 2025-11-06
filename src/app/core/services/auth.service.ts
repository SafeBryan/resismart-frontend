import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of, map, catchError, finalize, shareReplay } from 'rxjs';
import { AuthState, LoginResponse, Role, JwtPayload } from '../models/auth.model';
import { UserProfile } from '../models/user.model';
import { environment } from '../../../environments/environment';

const API_URL: string = environment.apiUrl || 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private state$ = new BehaviorSubject<AuthState & { profile?: UserProfile | null }>(this.loadFromStorage());

  get auth$(): Observable<AuthState & { profile?: UserProfile | null }> {
    return this.state$.asObservable();
  }

  get snapshot(): AuthState & { profile?: UserProfile | null } {
    return this.state$.value;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    const body = { email, password };
    if (environment.debug) console.log('[AuthService] POST', `${API_URL}/login`, body);
    return this.http.post<LoginResponse | { access_token: string } | string>(`${API_URL}/login`, body).pipe(
      tap((resp: any) => {
        if (environment.debug) console.log('[AuthService] login response', resp);
        const token: string = (resp && (resp.token || resp.access_token)) || (typeof resp === 'string' ? resp : '');
        const payload = this.decodeJwt(token);
        const role: Role | null = (payload?.rol || payload?.role || null) as Role | null;
        const idUsuario: any = payload?.idUsuario ?? payload?.user_id ?? payload?.id ?? null;
        const next: AuthState = { token: token || null, role, idUsuario };
        this.state$.next(next as any);
        this.saveToStorage(next as any);
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

  mergeProfile(profile: Partial<UserProfile> | Record<string, any> | null) {
    const currentProfile = this.snapshot.profile ?? null;
    const updatedProfile = profile ? { ...(currentProfile ?? {}), ...profile } : profile;
    const next = { ...this.snapshot, profile: updatedProfile };
    this.state$.next(next);
    this.saveToStorage(next);
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
  const safe: any = {};
  if (email != null) safe.email = email;
  if (nombres != null) safe.nombres = nombres;
  if (apellidos != null) safe.apellidos = apellidos;
  if (telefono != null) safe.telefono = telefono;
  return safe;
}

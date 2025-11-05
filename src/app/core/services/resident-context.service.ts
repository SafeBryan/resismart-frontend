import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { ResidentesService } from './residentes.service';
import { ContratoService } from './contrato.service';
import { ResidentContext } from '../models/resident-context.model';
import { ResidenteRespuestaDTO } from '../models/residente.model';
import { ContratoResumen } from '../models/contrato.model';
import { Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class ResidentContextService {
  private auth = inject(AuthService);
  private residentes = inject(ResidentesService);
  private contratos = inject(ContratoService);

  private contextSignal = signal<ResidentContext>({
    userId: null,
    contratos: [],
    condominioIds: [],
    loading: true,
  });

  readonly context: Signal<ResidentContext> = computed(() => this.contextSignal());

  constructor() {
    this.bootstrap();
  }

  refresh(): void {
    this.bootstrap(true);
  }

  private bootstrap(force = false): void {
    const fallbackUserId = this.normalizeId(this.auth.snapshot.idUsuario);

    if (!force && !this.contextSignal().loading && this.contextSignal().userId === fallbackUserId) {
      return;
    }

    this.contextSignal.set({
      ...this.contextSignal(),
      userId: fallbackUserId,
      loading: true,
    });

    const shouldForceValidation = force || !this.auth.snapshot.profile;

    this.auth
      .validateToken(shouldForceValidation)
      .pipe(
        catchError(() => of(false)),
        switchMap((valid) => {
          if (!valid) {
            return of(this.composeContext({ userId: null }));
          }

          const profile = this.auth.snapshot.profile as any;
          const userId = this.resolveUserId(profile, fallbackUserId);

          if (!userId) {
            return of(this.composeContext({ userId: null }));
          }

          const usuario = this.extractUsuario(profile);
          const residenteId = this.resolveResidenteId(profile);

          return this.loadResidente(userId, residenteId).pipe(
            switchMap((residente) => {
              const resolvedResidenteId = this.normalizeId(residente?.id_Cliente ?? residenteId);

              const contratos$ = resolvedResidenteId
                ? this.contratos
                    .listByResidente(resolvedResidenteId)
                    .pipe(catchError(() => of<ContratoResumen[]>([])))
                : of<ContratoResumen[]>([]);

              return contratos$.pipe(
                map((contratos) =>
                  this.composeContext({
                    userId,
                    usuario,
                    residente,
                    contratos,
                  })
                )
              );
            }),
            catchError(() =>
              of(
                this.composeContext({
                  userId,
                  usuario,
                  residente: null,
                  contratos: [],
                })
              )
            )
          );
        }),
        catchError(() => of(this.composeContext({ userId: null })))
      )
      .subscribe((ctx) => {
        this.contextSignal.set({ ...ctx, loading: false });
      });
  }

  private loadResidente(
    userId: number | null,
    residenteId: number | null
  ): Observable<ResidenteRespuestaDTO | null> {
    if (residenteId) {
      return this.residentes.getById(residenteId).pipe(
        map((residente) => residente ?? null),
        catchError(() => of<ResidenteRespuestaDTO | null>(null))
      );
    }

    if (userId) {
      return this.residentes.getByUsuarioId(userId).pipe(
        catchError(() => of<ResidenteRespuestaDTO | null>(null))
      );
    }

    return of<ResidenteRespuestaDTO | null>(null);
  }

  private resolveUserId(profile: any, fallback: number | null): number | null {
    return (
      this.normalizeId(profile?.id_usuario) ??
      this.normalizeId(profile?.idUsuario) ??
      this.normalizeId(profile?.id) ??
      fallback ??
      null
    );
  }

  private resolveResidenteId(profile: any): number | null {
    return (
      this.normalizeId(profile?.idCliente) ??
      this.normalizeId(profile?.id_cliente) ??
      this.normalizeId(profile?.idResidente) ??
      this.normalizeId(profile?.residenteId) ??
      this.normalizeId(profile?.residente?.id) ??
      this.normalizeId(profile?.residente?.idCliente) ??
      this.normalizeId(profile?.cliente?.id) ??
      this.normalizeId(profile?.cliente?.idCliente) ??
      null
    );
  }

  private extractUsuario(source: any): Usuario | null {
    if (!source) return null;

    const id = this.normalizeId(source?.id_usuario ?? source?.idUsuario ?? source?.id);

    const usuario: Usuario = {
      id_usuario: id ?? undefined,
      username: source?.username ?? source?.email ?? source?.correo ?? undefined,
      rol: (source?.rol ?? source?.role ?? source?.rolUsuario) as any,
      nombres: source?.nombres ?? source?.nombre ?? undefined,
      apellidos: source?.apellidos ?? source?.apellido ?? undefined,
      telefono: source?.telefono ?? source?.phone ?? undefined,
      correo: source?.correo ?? source?.email ?? undefined,
      estado: typeof source?.estado === 'boolean' ? source.estado : undefined,
      enabled: typeof source?.enabled === 'boolean' ? source.enabled : undefined,
    };

    return usuario;
  }

  private composeContext(params: {
    userId: number | null;
    usuario?: Usuario | null;
    residente?: ResidenteRespuestaDTO | null;
    contratos?: ContratoResumen[];
  }): ResidentContext {
    const contratos = Array.isArray(params?.contratos) ? params.contratos : [];
    const residente = params.residente ?? null;
    const usuario =
      params.usuario ??
      this.extractUsuario(residente?.usuario ?? null) ??
      null;

    const contratoActivo =
      contratos.find((c) => (c.estado ?? '').toString().toUpperCase() === 'ACTIVO') ??
      contratos[0] ??
      null;

    const condominioIds = this.extractCondominios(residente);
    const unidadId = this.normalizeId(
      (residente as any)?.unidad?.id ?? (residente as any)?.unidad?.idUnidad ?? null
    );

    return {
      userId: params.userId ?? null,
      usuario,
      residente,
      contratos,
      contratoActivo,
      condominioIds,
      unidadId,
      loading: false,
    };
  }

  private normalizeId(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private extractCondominios(residente: ResidenteRespuestaDTO | null | undefined): number[] {
    if (!residente?.unidad) return [];
    const unit: any = residente.unidad;
    const condominioId =
      unit?.idCondominio ??
      unit?.condominioId ??
      unit?.condominio?.id ??
      unit?.condominio?.idCondominio ??
      null;
    return condominioId ? [Number(condominioId)] : [];
  }
}

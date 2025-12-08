// resident-context.service.ts
import { Injectable, Signal, computed, inject, signal } from "@angular/core";
import { Observable, catchError, map, of, switchMap } from "rxjs";
import { AuthService } from "./auth.service";
import { ResidentesService } from "./residentes.service";
import { ContratoService } from "./contrato.service";
import { ResidentContext } from "../models/resident-context.model";
import { ResidenteRespuestaDTO } from "../models/residente.model";
import { ContratoResumen } from "../models/contrato.model";
import { Usuario } from "../models/usuario.model";

@Injectable({ providedIn: "root" })
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

  readonly context: Signal<ResidentContext> = computed(() =>
    this.contextSignal()
  );

  constructor() {
    this.bootstrap();
  }

  refresh(): void {
    this.bootstrap(true);
  }

  private bootstrap(force = false): void {
    const fallbackUserId = this.normalizeId(this.auth.snapshot.idUsuario);

    if (
      !force &&
      !this.contextSignal().loading &&
      this.contextSignal().userId === fallbackUserId
    ) {
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
          if (!valid) return of(this.composeContext({ userId: null }));

          const profile = this.auth.snapshot.profile as any;
          const userId = this.resolveUserId(profile, fallbackUserId);
          const username = (profile?.username ?? profile?.correo ?? "")
            .toString()
            .toLowerCase();

          if (!userId && !username)
            return of(this.composeContext({ userId: null }));

          const usuario = this.extractUsuario(profile);

          // 🔴 AQUÍ ESTABA EL PROBLEMA:
          // En Opción A siempre buscamos el residente por idUsuario (nuevo endpoint /Residentes/por-usuario/{idUsuario})
          return this.residentes.findByUsuario({ userId, username }).pipe(
            switchMap((residente: ResidenteRespuestaDTO | null) => {
              // Si no existe residente para ese usuario => contexto sin residente, sin contratos
              if (!residente) {
                return of(
                  this.composeContext({
                    userId,
                    usuario,
                    residente: null,
                    contratos: [],
                  })
                );
              }

              const residenteId =
                this.normalizeId((residente as any)?.id_Cliente) ??
                this.normalizeId((residente as any)?.idCliente) ??
                null;

              const contratos$ = residenteId
                ? this.contratos
                    .listByResidente(residenteId)
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

  // ======================
  // Helpers de extracción
  // ======================
  private resolveUserId(profile: any, fallback: number | null): number | null {
    return (
      this.normalizeId(profile?.id_usuario) ??
      this.normalizeId(profile?.idUsuario) ??
      this.normalizeId(profile?.id) ??
      fallback ??
      null
    );
  }

  private extractUsuario(source: any): Usuario | null {
    if (!source) return null;

    const id = this.normalizeId(
      source?.id_usuario ?? source?.idUsuario ?? source?.id
    );

    const usuario: Usuario = {
      id_usuario: id ?? undefined,
      username:
        source?.username ?? source?.email ?? source?.correo ?? undefined,
      rol: (source?.rol ?? source?.role ?? source?.rolUsuario) as any,
      nombres: source?.nombres ?? source?.nombre ?? undefined,
      apellidos: source?.apellidos ?? source?.apellido ?? undefined,
      telefono: source?.telefono ?? source?.phone ?? undefined,
      correo: source?.correo ?? source?.email ?? undefined,
      estado: typeof source?.estado === "boolean" ? source.estado : undefined,
      enabled:
        typeof source?.enabled === "boolean" ? source.enabled : undefined,
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
      params.usuario ?? this.extractUsuario(residente?.usuario ?? null) ?? null;

    const residenteIdNorm =
      this.normalizeId((residente as any)?.id_Cliente) ??
      this.normalizeId((residente as any)?.idCliente) ??
      this.normalizeId((residente as any)?.id);
    const residenteNormalizado = residente
      ? {
          ...residente,
          idCliente: (residente as any)?.idCliente ?? residenteIdNorm ?? null,
          id_Cliente: (residente as any)?.id_Cliente ?? residenteIdNorm ?? null,
        }
      : null;

    const contratoActivo =
      contratos.find(
        (c) => (c.estado ?? "").toString().toUpperCase() === "ACTIVO"
      ) ??
      contratos[0] ??
      null;

    return {
      userId: params.userId ?? null,
      usuario,
      residente: residenteNormalizado,
      contratos,
      contratoActivo,
      condominioIds: [],
      unidadId: null,
      loading: false,
    };
  }

  private normalizeId(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private extractCondominios(
    _residente: ResidenteRespuestaDTO | null | undefined
  ): number[] {
    // La relación con condominio ahora se resuelve vía contratos, no desde residente.
    return [];
  }
}

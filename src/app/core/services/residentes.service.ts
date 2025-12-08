// residentes.service.ts
import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, map, of } from "rxjs";
import { environment } from "../../../environments/environment";
import { ResidenteDTO, ResidenteRespuestaDTO } from "../models/residente.model";

const API = environment.apiUrl || "http://localhost:8080";

@Injectable({ providedIn: "root" })
export class ResidentesService {
  private http = inject(HttpClient);

  // CRUD estándar (admin / backoffice)
  list(): Observable<ResidenteRespuestaDTO[]> {
    return this.http.get<ResidenteRespuestaDTO[]>(`${API}/Residentes`);
  }

  listByCondominio(condominioId: number): Observable<ResidenteRespuestaDTO[]> {
    if (!condominioId) return of([]);
    return this.http
      .get<ResidenteRespuestaDTO[]>(`${API}/Residentes/condominio/${condominioId}`)
      .pipe(catchError(() => of<ResidenteRespuestaDTO[]>([])));
  }

  getById(id: number | string): Observable<ResidenteRespuestaDTO> {
    return this.http.get<ResidenteRespuestaDTO>(`${API}/Residentes/${id}`);
  }

  create(dto: ResidenteDTO): Observable<any> {
    return this.http.post(`${API}/Residentes`, dto);
  }

  update(id: number | string, dto: ResidenteDTO): Observable<any> {
    return this.http.put(`${API}/Residentes/${id}`, dto);
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete(`${API}/Residentes/${id}`);
  }

  /**
   * Opción A:
   * Resuelve al residente por id de usuario usando el endpoint
   * GET /Residentes/por-usuario/{idUsuario}
   *
   * - Devuelve `null` si el backend responde 404 (no existe el residente).
   * - Devuelve `null` ante otros errores, sin lanzar.
   */
  findByUsuario(params: {
    userId?: number | null;
    username?: string | null; // se ignora aquí
  }): Observable<ResidenteRespuestaDTO | null> {
    const userId = params?.userId ?? null;
    if (!userId) return of(null);

    // 1) Ruta larga que mantiene compatibilidad
    const urlLarga = `${API}/Residentes/Residentes/por-usuario/${userId}`;
    // 2) Fallback a la corta por si luego unificas:
    const urlCorta = `${API}/Residentes/por-usuario/${userId}`;

    return this.http.get<ResidenteRespuestaDTO>(urlLarga).pipe(
      // si la larga responde 404/403/etc, intenta la corta
      catchError(() => this.http.get<ResidenteRespuestaDTO>(urlCorta)),
      map((r) => r ?? null),
      catchError(() => of<ResidenteRespuestaDTO | null>(null))
    );
  }

  /**
   * (Deprecado) Se deja la firma antigua para no romper dependencias.
   * No se usa con la Opción A.
   */
  getByUsuarioId(
    _idUsuario: number | string
  ): Observable<ResidenteRespuestaDTO | null> {
    return of(null);
  }

  getByCondominio(condominioId: number): Observable<ResidenteRespuestaDTO[]> {
    if (!condominioId) return of([]);
    return this.http.get<ResidenteRespuestaDTO[]>(
      `${API}/Residentes/condominio/${condominioId}`
    );
  }
}

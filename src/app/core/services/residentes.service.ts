import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResidenteDTO, ResidenteRespuestaDTO } from '../models/residente.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class ResidentesService {
  private http = inject(HttpClient);

  list(): Observable<ResidenteRespuestaDTO[]> {
    return this.http.get<ResidenteRespuestaDTO[]>(`${API}/Residentes`);
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

  deleteUsuario(idUsuario: number | string): Observable<any> {
    return this.http.delete(`${API}/Usuarios/${idUsuario}`);
  }

  /**
   * Devuelve la ficha del residente asociado al usuario actual utilizando el endpoint específico.
   * Si el backend responde con 404/403 se retorna null sin recurrir a list() (evita scopes de admin).
   */
  getByUsuarioId(idUsuario: number | string): Observable<ResidenteRespuestaDTO | null> {
    if (idUsuario === null || idUsuario === undefined || idUsuario === '') {
      return of(null);
    }
    const url = `${API}/Usuarios/whoami`;
    return this.http.get<ResidenteRespuestaDTO | null>(url).pipe(
      map((residente) => residente ?? null),
      catchError(() => of(null))
    );
  }
}

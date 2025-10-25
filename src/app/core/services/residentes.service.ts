import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}

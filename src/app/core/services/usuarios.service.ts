import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Usuario,
  UsuarioCrearRequest,
  UsuarioCredencialesClienteRequest,
  UsuarioEditarRequest,
  UsuarioPerfilRequest,
} from '../models/usuario.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);

  list(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${API}/Usuarios`);
  }

  getById(id: number | string): Observable<Usuario> {
    return this.http.get<Usuario>(`${API}/Usuarios/${id}`);
  }

  create(dto: UsuarioCrearRequest): Observable<any> {
    return this.http.post(`${API}/Usuarios/guardar`, dto);
  }

  update(id: number | string, dto: UsuarioEditarRequest): Observable<any> {
    return this.http.put(`${API}/Usuarios/${id}`, dto);
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete(`${API}/Usuarios/${id}`);
  }

  updateOwnProfile(dto: UsuarioPerfilRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${API}/Usuarios/me`, dto);
  }

  updateCredencialesCliente(dto: UsuarioCredencialesClienteRequest): Observable<any> {
    return this.http.put(`${API}/Usuarios/credencialesCliente`, dto);
  }
}

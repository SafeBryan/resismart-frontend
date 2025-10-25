import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CondominioResumenDTO, PageCondominioResumenDTO, CondominioCreateDTO, CondominioUpdateDTO } from '../models/condominio.model';
import { UnidadDTO, UnidadCreateDTO, UnidadUpdateDTO } from '../models/unidad.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class CondominiosService {
  private http = inject(HttpClient);

  list(page = 0, size = 50): Observable<PageCondominioResumenDTO> {
    const params = new HttpParams().set('pageable.page', page).set('pageable.size', size);
    // En algunos backends basta con ?page=..&size=..; incluimos ambos por compatibilidad
    const alt = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageCondominioResumenDTO>(`${API}/Condominios`, { params }).pipe() as any;
  }

  getById(id: number): Observable<CondominioResumenDTO> {
    return this.http.get<CondominioResumenDTO>(`${API}/Condominios/${id}`);
  }

  create(dto: CondominioCreateDTO): Observable<any> {
    return this.http.post(`${API}/Condominios`, dto);
  }

  update(id: number, dto: CondominioUpdateDTO): Observable<any> {
    return this.http.put(`${API}/Condominios/${id}`, dto);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${API}/Condominios/${id}`);
  }

  // Variante simple: listar unidades por condominio
  unidadesPorCondominio(idCondominio: number): Observable<UnidadDTO[]> {
    return this.http.get<UnidadDTO[]>(`${API}/Unidades/por-condominio/${idCondominio}`);
  }

  agregarUnidad(idCondominio: number, dto: UnidadCreateDTO): Observable<any> {
    return this.http.post(`${API}/Condominios/${idCondominio}/unidades`, dto);
  }

  actualizarUnidad(idUnidad: number, dto: UnidadUpdateDTO): Observable<any> {
    return this.http.put(`${API}/Unidades/${idUnidad}`, dto);
  }

  eliminarUnidad(idUnidad: number): Observable<any> {
    return this.http.delete(`${API}/Unidades/${idUnidad}`);
  }
}

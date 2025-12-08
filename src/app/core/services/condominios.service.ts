import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CondominioResumenDTO, PageCondominioResumenDTO, CondominioCreateDTO, CondominioUpdateDTO } from '../models/condominio.model';
import { UnidadDTO, UnidadCreateDTO, UnidadUpdateDTO } from '../models/unidad.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class CondominiosService {
  private http = inject(HttpClient);

  list(page = 0, size = 50, opts: { ownerOnly?: boolean } = {}): Observable<PageCondominioResumenDTO> {
    let params = new HttpParams().set('pageable.page', page).set('pageable.size', size);
    params = params.set('page', page).set('size', size);
    if (opts.ownerOnly) params = params.set('dueno', 'true');
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
    return this.http.get<UnidadDTO[]>(`${API}/Unidades/por-condominio/${idCondominio}`).pipe(
      // Fallback a la ruta GET /Condominios/{id}/unidades si la anterior no existe
      catchError(() => this.http.get<UnidadDTO[]>(`${API}/Condominios/${idCondominio}/unidades`))
    );
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

  listarMisCondominios(): Observable<CondominioResumenDTO[]> {
    return this.http.get<CondominioResumenDTO[]>(`${API}/Condominios/mis-condominios`).pipe(
      catchError((err) => {
        if (err?.status === 403) {
          return of<CondominioResumenDTO[]>([]);
        }
        return throwError(() => err);
      })
    );
  }

  resumenOcupacion(idCondominio: number): Observable<any> {
    return this.http.get<any>(`${API}/Condominios/${idCondominio}/resumen-ocupacion`);
  }

  uploadImages(condominioId: number, logo?: File | null, portada?: File | null): Observable<CondominioResumenDTO> {
    const formData = new FormData();
    if (logo) formData.append('logo', logo);
    if (portada) formData.append('portada', portada);
    if (!logo && !portada) {
      return throwError(() => new Error('Debe seleccionar al menos una imagen'));
    }
    return this.http.post<CondominioResumenDTO>(`${API}/Condominios/${condominioId}/imagenes`, formData);
  }
}

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UnidadDTO } from '../models/unidad.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class UnidadesService {
  private http = inject(HttpClient);

  getUnidadActual(): Observable<UnidadDTO> {
    return this.http.get<UnidadDTO>(`${API}/Unidades/me`);
  }
}

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventoDTO } from '../models/evento.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class EventosService {
  private http = inject(HttpClient);

  listByCondominio(condominioId: number): Observable<EventoDTO[]> {
    if (!condominioId) {
      return of([]);
    }
    return this.http
      .get<EventoDTO[]>(`${API}/Eventos/condominio/${condominioId}`)
      .pipe(map((list) => list ?? []));
  }

  getById(id: number): Observable<EventoDTO> {
    return this.http.get<EventoDTO>(`${API}/Eventos/${id}`);
  }
}

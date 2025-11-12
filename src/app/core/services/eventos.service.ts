import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EventoAsistenciaRequest,
  EventoCreateDTO,
  EventoDetalladoResponse,
  EventoDetalleDTO,
  EventoParticipanteDTO,
  EventoParticipanteRequest,
  EventoUpdateDTO,
} from '../models/evento.model';

const API = environment.apiUrl || 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class EventosService {
  private http = inject(HttpClient);

  listByCondominio(condominioId: number): Observable<EventoDetalleDTO[]> {
    if (!condominioId) {
      return of([]);
    }
    return this.http
      .get<EventoDetalladoResponse[]>(`${API}/Eventos/condominio/${condominioId}/detallado`)
      .pipe(map((list) => (list ?? []).map((item) => this.mapEventoDetallado(item))));
  }

  getById(id: number): Observable<EventoDetalleDTO> {
    return this.http.get<EventoDetalleDTO>(`${API}/Eventos/${id}`);
  }

  create(dto: EventoCreateDTO): Observable<EventoDetalleDTO> {
    return this.http.post<EventoDetalleDTO>(`${API}/Eventos`, dto);
  }

  update(id: number, dto: EventoUpdateDTO): Observable<EventoDetalleDTO> {
    return this.http.put<EventoDetalleDTO>(`${API}/Eventos/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/Eventos/${id}`);
  }

  addParticipante(eventoId: number, payload: EventoParticipanteRequest): Observable<EventoParticipanteDTO> {
    return this.http.post<EventoParticipanteDTO>(`${API}/Eventos/${eventoId}/participantes`, payload);
  }

  updateParticipante(
    eventoId: number,
    participanteId: number,
    payload: Partial<EventoParticipanteRequest>
  ): Observable<EventoParticipanteDTO> {
    return this.http.put<EventoParticipanteDTO>(`${API}/Eventos/${eventoId}/participantes/${participanteId}`, payload);
  }

  removeParticipante(eventoId: number, participanteId: number): Observable<void> {
    return this.http.delete<void>(`${API}/Eventos/${eventoId}/participantes/${participanteId}`);
  }

  confirmarAsistencia(eventoId: number, payload: EventoAsistenciaRequest): Observable<EventoDetalleDTO> {
    return this.http.post<EventoDetalleDTO>(`${API}/Eventos/${eventoId}/asistencia`, payload);
  }

  actualizarAsistencia(eventoId: number, payload: EventoAsistenciaRequest): Observable<EventoDetalleDTO> {
    return this.http.put<EventoDetalleDTO>(`${API}/Eventos/${eventoId}/asistencia`, payload);
  }

  private mapEventoDetallado(payload?: EventoDetalladoResponse | null): EventoDetalleDTO {
    const evento = payload?.evento ?? {};
    const participantes = this.normalizeParticipantes(payload?.participantes);
    const noAsisten = this.normalizeParticipantes(payload?.noAsisten);
    return {
      ...evento,
      participantes,
      noAsisten,
    };
  }

  private normalizeParticipantes(
    list?: Array<Partial<EventoParticipanteDTO> & Record<string, any>>
  ): EventoParticipanteDTO[] {
    return (list ?? []).map((participante) => {
      const usuarioId = this.toNumber(participante.usuarioId ?? participante.idUsuario);
      return {
        ...participante,
        usuarioId: usuarioId ?? participante.usuarioId,
        idUsuario: usuarioId ?? participante.idUsuario,
      } as EventoParticipanteDTO;
    });
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }
}

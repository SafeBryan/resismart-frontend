import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable, map, of } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  DocumentoAsociacionDTO,
  DocumentoDetalleDTO,
  DocumentoFiltroDTO,
  DocumentoUploadResponse,
} from "../models/documento.model";

const API = environment.apiUrl || "http://localhost:8080";

@Injectable({ providedIn: "root" })
export class DocumentosService {
  private http = inject(HttpClient);

  list(filtros: DocumentoFiltroDTO = {}): Observable<DocumentoDetalleDTO[]> {
    const params = this.buildParams(filtros);
    return this.http.get<any>(`${API}/documentos`, { params }).pipe(
      map((resp) => {
        if (Array.isArray(resp)) return resp as DocumentoDetalleDTO[];
        if (Array.isArray(resp?.content))
          return resp.content as DocumentoDetalleDTO[];
        if (Array.isArray(resp?.items))
          return resp.items as DocumentoDetalleDTO[];
        return [];
      })
    );
  }

  getDetalle(id: number): Observable<DocumentoDetalleDTO> {
    return this.http.get<DocumentoDetalleDTO>(`${API}/documentos/${id}`);
  }

  upload(
    formData: FormData,
    userId: number | string
  ): Observable<DocumentoUploadResponse> {
    const headers = new HttpHeaders({ "X-USER": String(userId) });
    return this.http.post<DocumentoUploadResponse>(
      `${API}/documentos/upload`,
      formData,
      { headers }
    );
  }

  asociar(
    payload: DocumentoAsociacionDTO,
    userId: number | string
  ): Observable<void> {
    const headers = new HttpHeaders({ "X-USER": String(userId) });
    return this.http.post<void>(`${API}/documentos/asociar`, payload, {
      headers,
    });
  }

  private buildParams(filtros: DocumentoFiltroDTO): HttpParams {
    const filtered = Object.entries(filtros ?? {}).reduce<
      Record<string, string>
    >((acc, [key, value]) => {
      if (value === undefined || value === null || value === "") return acc;
      acc[key] = Array.isArray(value) ? value.join(",") : String(value);
      return acc;
    }, {});
    return new HttpParams({ fromObject: filtered });
  }

  descargarContenido(id: number) {
    return this.http.get(`${API}/documentos/${id}/contenido`, {
      responseType: "blob",
    });
  }
}

import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  DocumentoAsociacionDTO,
  DocumentoDetalleDTO,
  DocumentoFiltroDTO,
  DocumentoUploadResponse,
  DocumentoListItem,
} from "../models/documento.model";

const API = environment.apiUrl || "http://localhost:8080";

@Injectable({ providedIn: "root" })
export class DocumentosService {
  private http = inject(HttpClient);

  /**
   * Lista documentos según filtros.
   * - Si el backend responde con array (flat=true) → DocItem[]
   * - Si responde con PageResponse<DocumentoResumenDTO> → se mapea a DocumentoListItem[]
   */
  list(filtros: DocumentoFiltroDTO = {}): Observable<DocumentoListItem[]> {
    const params = this.buildParams(filtros);
    return this.http.get<any>(`${API}/documentos`, { params }).pipe(
      map((resp) => {
        // 1) Modo flat: el backend devuelve directamente un array de DocItem
        if (Array.isArray(resp)) {
          return resp as DocumentoListItem[];
        }

        // 2) Paginado clásico: PageResponse<DocumentoResumenDTO>
        const items: any[] =
          (resp && Array.isArray(resp.content) && resp.content) ||
          (resp && Array.isArray(resp.items) && resp.items) ||
          [];

        return items.map((d) => this.mapToListItem(d));
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

  descargarContenido(id: number) {
    return this.http.get(`${API}/documentos/${id}/contenido`, {
      responseType: "blob",
    });
  }

  // ========================
  // Helpers
  // ========================

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

  /**
   * Mapea tanto DocumentoResumenDTO como DocItem a DocumentoListItem
   */
  private mapToListItem(d: any): DocumentoListItem {
    // Caso DocItem (backend flat=true → DocumentosController.DocItem)
    if ("id" in d && "nombre" in d) {
      return {
        id: d.id,
        nombre: d.nombre,
        tipo: d.tipo ?? null,
        estadoValidacion: d.estadoValidacion ?? null,
        creadoEn: d.creadoEn ?? null,
        sizeBytes: d.sizeBytes ?? null,
        mimeType: d.mimeType ?? null,
        urlContenido: d.urlContenido ?? null,
      };
    }

    // Caso DocumentoResumenDTO (idDocumento, nombreOriginal, fechaSubida, etc.)
    if ("idDocumento" in d) {
      return {
        id: d.idDocumento,
        nombre: d.nombreOriginal ?? `Documento #${d.idDocumento}`,
        tipo: d.tipo ?? null,
        estadoValidacion: d.estadoValidacion ?? null,
        creadoEn: d.fechaSubida ?? null,
        sizeBytes: d.sizeBytes ?? null,
        mimeType: d.mimeType ?? null,
        urlContenido: null,
      };
    }

    // Fallback defensivo
    return {
      id: d.id ?? 0,
      nombre: d.nombre ?? d.nombreOriginal ?? "Documento",
      tipo: d.tipo ?? null,
      estadoValidacion: d.estadoValidacion ?? null,
      creadoEn: d.creadoEn ?? d.fechaSubida ?? null,
      sizeBytes: d.sizeBytes ?? null,
      mimeType: d.mimeType ?? null,
      urlContenido: d.urlContenido ?? null,
    };
  }
}

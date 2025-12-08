export interface CondominioResumenDTO {
  id?: number;
  nombre?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  idDueno?: number;
   logoUrl?: string;
   portadaUrl?: string;
}

export interface PageCondominioResumenDTO {
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  content: CondominioResumenDTO[];
}

export interface CondominioCreateDTO {
  nombre: string;
  direccion: string;
  telefono?: string;
  correo?: string;
  idDueno: number;
}

export interface CondominioUpdateDTO {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  idDueno?: number;
}

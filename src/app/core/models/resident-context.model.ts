import { ResidenteRespuestaDTO } from './residente.model';
import { Usuario } from './usuario.model';
import { ContratoResumen } from './contrato.model';

export interface ResidentContext {
  userId: number | null;
  usuario?: Usuario | null;
  residente?: ResidenteRespuestaDTO | null;
  contratos: ContratoResumen[];
  contratoActivo?: ContratoResumen | null;
  condominioIds: number[];
  unidadId?: number | null;
  loading?: boolean;
}

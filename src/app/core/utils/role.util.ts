export type RoleNorm = 'ADMIN' | 'OWNER' | 'RESIDENTE' | 'UNKNOWN';

function fixEncodingAnomalies(input: string): string {
  return input
    .replace(/\u00C3\u0091/g, 'N') // Ã‘ -> N
    .replace(/\u00C3\u00B1/g, 'n') // Ã± -> n
    .replace(/Ã‘/g, 'N')
    .replace(/Ã±/g, 'n');
}

// Normaliza roles tolerando acentos y mojibake
export function normalizeRole(v: any): RoleNorm {
  const raw = (v ?? '').toString();
  const fixed = fixEncodingAnomalies(raw);
  let r = fixed.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  r = r.toUpperCase();
  if (r === 'ADMIN' || r === 'ADMINISTRADOR') return 'ADMIN';
  if (r === 'DUENO' || r === 'OWNER') return 'OWNER';
  if (r === 'RESIDENTE' || r === 'RESIDENT' || r === 'TENANT') return 'RESIDENTE';
  return 'UNKNOWN';
}

export const isOwner = (v: any) => normalizeRole(v) === 'OWNER';
export const isAdmin = (v: any) => normalizeRole(v) === 'ADMIN';
export const isResident = (v: any) => normalizeRole(v) === 'RESIDENTE';

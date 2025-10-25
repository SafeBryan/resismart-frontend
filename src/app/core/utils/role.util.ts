export type RoleNorm = 'ADMIN' | 'OWNER' | 'RESIDENTE' | 'UNKNOWN';

function fixEncodingAnomalies(input: string): string {
  // Corrige mojibake más comunes cuando UTF-8 se interpreta como Latin-1
  // Ñ/ñ en particular: "DUEÃ	1O" y "DUEÃ±O"
  return input
    .replace(/\u00C3\u0091/g, 'Ñ') // Ã	1 → Ñ
    .replace(/\u00C3\u00B1/g, 'ñ') // Ã± → ñ
    .replace(/Ã	1/g, 'Ñ')
    .replace(/Ã±/g, 'ñ');
}

// Normaliza roles tolerando acentos y mojibake
export function normalizeRole(v: any): RoleNorm {
  const raw = (v ?? '').toString();
  const fixed = fixEncodingAnomalies(raw);
  // Elimina diacríticos y pasa a mayúsculas
  let r = fixed.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  r = r.toUpperCase();
  // Unificar Ñ → N por si llega correcto
  r = r.replace(/Ñ/g, 'N');
  if (r === 'ADMIN' || r === 'ADMINISTRADOR') return 'ADMIN';
  if (r === 'DUENO' || r === 'OWNER') return 'OWNER';
  if (r === 'RESIDENTE' || r === 'RESIDENT' || r === 'TENANT') return 'RESIDENTE';
  return 'UNKNOWN';
}

export const isOwner = (v: any) => normalizeRole(v) === 'OWNER';
export const isAdmin = (v: any) => normalizeRole(v) === 'ADMIN';
export const isResident = (v: any) => normalizeRole(v) === 'RESIDENTE';

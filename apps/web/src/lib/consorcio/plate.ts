/** Normaliza e valida placa Mercosul / antiga (BR). */

const OLD = /^[A-Z]{3}\d{4}$/;
const MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export function normalizePlate(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

export function formatPlate(raw: string): string {
  const p = normalizePlate(raw);
  if (p.length <= 3) return p;
  return `${p.slice(0, 3)}-${p.slice(3)}`;
}

export function isValidPlate(raw: string): boolean {
  const p = normalizePlate(raw);
  return OLD.test(p) || MERCOSUL.test(p);
}

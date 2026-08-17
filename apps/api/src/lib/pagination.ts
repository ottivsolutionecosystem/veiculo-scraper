/**
 * Cursor opaco (base64 de JSON) para paginação keyset — nunca OFFSET
 * (CLAUDE.md). Cada rota decide as colunas que compõem o cursor conforme
 * seu ORDER BY; isso só empacota/desempacota o valor sem impor forma.
 */
export function encodeCursor(parts: readonly (string | number)[]): string {
  return Buffer.from(JSON.stringify(parts), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | undefined): unknown[] | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const DEFAULT_LIMIT = 24;
export const MAX_LIMIT = 100;

export function parseLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

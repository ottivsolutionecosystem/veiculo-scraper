/** Separa vários documentos HTML colados no mesmo campo (ingestão assistida). */
export function splitHtmlDocuments(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];
  const parts = text
    .split(/(?=<!DOCTYPE\s+html|<html[\s>])/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) return parts;
  return text.length >= 200 ? [text] : [];
}

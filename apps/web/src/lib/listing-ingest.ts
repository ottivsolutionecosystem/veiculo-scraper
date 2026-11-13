const MIN_HTML_CHARS = 500;

/** HTML de listagem Shopcar tem cards `/veiculos/` ou o bloco da busca. */
export function looksLikeShopcarListingHtml(html: string): boolean {
  return /buscaListagem|\/veiculos\/[^"'\s]+|busca\.php/i.test(html);
}

/** Separa vários documentos HTML colados no mesmo campo (ingestão assistida). */
export function splitHtmlDocuments(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];
  const parts = text
    .split(/(?=<!DOCTYPE\s+html|<html[\s>])/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) return parts.filter((p) => p.length >= MIN_HTML_CHARS);
  return text.length >= MIN_HTML_CHARS ? [text] : [];
}

export function validateListingHtmlChunk(html: string): string | null {
  if (html.length < MIN_HTML_CHARS) {
    return "HTML curto demais — cole o código-fonte inteiro da página (Ctrl+U → Ctrl+A → Ctrl+C).";
  }
  if (!looksLikeShopcarListingHtml(html)) {
    return "Isso não parece a listagem do Shopcar. Tem que ter links /veiculos/ ou o bloco da busca — não um pedaço de script do inspetor.";
  }
  return null;
}

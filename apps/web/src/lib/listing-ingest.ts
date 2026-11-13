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

export type ShopcarListingUrl = { url: string; page: number };

/** Extrai links de busca Shopcar (um por linha ou separados por espaço). */
export function parseShopcarListingUrls(raw: string): ShopcarListingUrl[] {
  const found = raw.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const out: ShopcarListingUrl[] = [];
  const seen = new Set<string>();
  for (const rawUrl of found) {
    const cleaned = rawUrl.replace(/[),.;]+$/g, "");
    let parsed: URL;
    try {
      parsed = new URL(cleaned);
    } catch {
      continue;
    }
    if (!parsed.hostname.toLowerCase().endsWith("shopcar.com.br")) continue;
    if (!/busca\.php/i.test(parsed.pathname)) continue;
    const page = Math.max(1, Number.parseInt(parsed.searchParams.get("pagina") || "1", 10) || 1);
    const key = `${page}|${parsed.origin}${parsed.pathname}?${parsed.searchParams.toString()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ url: parsed.toString(), page });
  }
  return out.sort((a, b) => a.page - b.page);
}

/**
 * Monta URLs pagina=from..to a partir de um link de busca (ou query base).
 * Cloudflare bloqueia GET do servidor — a captura é no browser do usuário.
 */
export function buildShopcarListingUrlRange(baseUrl: string, fromPage: number, toPage: number): ShopcarListingUrl[] {
  const from = Math.max(1, Math.floor(fromPage));
  const to = Math.max(from, Math.floor(toPage));
  if (to - from + 1 > 200) {
    throw new Error("No máximo 200 páginas por lote de links.");
  }
  let parsed: URL;
  try {
    parsed = new URL(baseUrl.trim());
  } catch {
    throw new Error("URL base inválida.");
  }
  if (!parsed.hostname.toLowerCase().endsWith("shopcar.com.br")) {
    throw new Error("A URL tem que ser do shopcar.com.br.");
  }
  if (!/busca\.php/i.test(parsed.pathname)) {
    parsed.pathname = "/busca.php";
  }
  const out: ShopcarListingUrl[] = [];
  for (let page = from; page <= to; page++) {
    const u = new URL(parsed.toString());
    u.searchParams.set("pagina", String(page));
    out.push({ url: u.toString(), page });
  }
  return out;
}

/**
 * Script curto para colar no Console do Chrome (F12) na página do Shopcar.
 * Favoritos javascript: o Chrome costuma bloquear ou truncar — o Console é o caminho.
 */
export function buildListingCaptureConsoleScript(opts: {
  apiOrigin: string;
  token: string;
  source: string;
}): string {
  const api = opts.apiOrigin.replace(/\/$/, "");
  const source = opts.source;
  const token = opts.token;
  return `(()=>{const A=${JSON.stringify(api)},S=${JSON.stringify(source)},T=${JSON.stringify(token)};const html="<!DOCTYPE html>"+document.documentElement.outerHTML;const page=Number(new URLSearchParams(location.search).get("pagina")||1);fetch(A+"/api/sources/"+S+"/ingest-listings",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+T},body:JSON.stringify({pages:[{html,page,baseUrl:location.origin}]})}).then(async r=>{const t=await r.text();if(!r.ok)throw new Error(t.slice(0,200)||("HTTP "+r.status));return fetch(A+"/api/sources/"+S+"/ingest-url-queue/advance",{method:"POST",headers:{"Authorization":"Bearer "+T,"Content-Type":"application/json"},body:"{}"});}).then(async r=>r.json()).then(j=>{if(j.next&&j.next.url){console.log("ok pagina",page,"->",j.next.page);location.href=j.next.url;}else{alert("Pagina "+page+" na fila. Fim da lista de links.");}}).catch(e=>alert("Falhou: "+e.message));})();`;
}

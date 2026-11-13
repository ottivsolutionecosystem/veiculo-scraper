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

/** Bookmarklet: envia o HTML da página atual e abre a próxima da lista. */
export function buildListingCaptureBookmarklet(opts: {
  apiOrigin: string;
  token: string;
  source: string;
  urls: ShopcarListingUrl[];
}): string {
  const payload = {
    api: opts.apiOrigin.replace(/\/$/, ""),
    token: opts.token,
    source: opts.source,
    urls: opts.urls.map((u) => ({ u: u.url, p: u.page })),
  };
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  // Minificado de propósito: favorito javascript:
  const body = `(()=>{try{const C=${json};const html="<!DOCTYPE html>"+document.documentElement.outerHTML;const here=location.href.split("#")[0];let i=C.urls.findIndex(x=>here.startsWith(x.u.split("#")[0])||here.includes("pagina="+x.p));if(i<0){const m=location.search.match(/pagina=(\\d+)/);const pg=m?Number(m[1]):1;i=C.urls.findIndex(x=>x.p===pg);if(i<0)i=0;}const cur=C.urls[i]||C.urls[0];const page=cur?cur.p:1;fetch(C.api+"/api/sources/"+encodeURIComponent(C.source)+"/ingest-listings",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+C.token},body:JSON.stringify({pages:[{html:html,page:page,baseUrl:location.origin}]})}).then(async r=>{const t=await r.text();if(!r.ok)throw new Error(t.slice(0,180)||("HTTP "+r.status));const next=C.urls[i+1];if(next){alert("Pagina "+page+" na fila. Abrindo pagina "+next.p+"...");location.href=next.u;}else{alert("Pagina "+page+" na fila. Fim da lista.");}}).catch(e=>alert("Falhou: "+e.message));}catch(e){alert("Falhou: "+e);}})();`;
  return `javascript:${encodeURIComponent(body)}`;
}

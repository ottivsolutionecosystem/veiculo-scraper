/**
 * Resolve o base URL da Fastify na rede Docker/Dokploy.
 * Tenta API_URL e candidatos comuns; cacheia o que respondeu /health.
 */

let cached: string | null = null;
let probing: Promise<string> | null = null;

function normalizeBase(raw: string): string {
  return raw.replace(/\/$/, "");
}

function candidates(): string[] {
  const fromEnv = (process.env.API_URL || "").trim();
  const extra = (process.env.API_HOST_CANDIDATES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((h) => (h.includes("://") ? h : `http://${h.replace(/\/$/, "")}:3001`));

  const defaults = [
    "http://servidor-ii-crawlerapi-jeljvt:3001",
    "https://servidor-ii-crawlerapi-jeljvt-037d2d-162-141-109-97.sslip.io",
    "http://crawler-api:3001",
    "http://api:3001",
    "http://veiculo-api:3001",
    "http://veiculo-scraper-api:3001",
  ];

  const list = [
    ...(fromEnv ? [normalizeBase(fromEnv)] : []),
    ...extra.map(normalizeBase),
    ...defaults,
  ];
  return [...new Set(list)];
}

async function probe(base: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(`${base}/health`, { method: "GET", signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function discover(): Promise<string> {
  const list = candidates();
  const tried: string[] = [];
  for (const base of list) {
    tried.push(base);
    if (await probe(base)) {
      console.info("[api-upstream] usando", base);
      return base;
    }
  }
  throw new Error(`nenhum /health ok entre: ${tried.join(", ")}`);
}

/** Base URL da API (sem barra final). */
export async function resolveApiBase(): Promise<string> {
  if (cached) return cached;
  if (!probing) {
    probing = discover()
      .then((base) => {
        cached = base;
        return base;
      })
      .catch((err) => {
        cached = null;
        throw err;
      })
      .finally(() => {
        probing = null;
      });
  }
  return probing;
}

/** Zera cache (útil após falha de rede / troca de env). */
export function resetApiBaseCache(): void {
  cached = null;
}

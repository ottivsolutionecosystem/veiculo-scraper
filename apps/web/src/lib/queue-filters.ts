export interface QueueListFilters {
  q?: string;
  brand?: string;
  priceMaxCents?: number;
  scoreBand?: "quente" | "boa" | "morna" | "fria";
  source?: string;
}

export function parseQueueListFilters(
  params: Record<string, string | string[] | undefined>,
): QueueListFilters {
  const get = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const q = get("q")?.trim();
  const brand = get("brand")?.trim();
  const priceMax = get("priceMax")?.trim();
  const scoreBand = get("scoreBand");
  const source = get("source")?.trim();
  const bands = new Set(["quente", "boa", "morna", "fria"]);

  return {
    q: q || undefined,
    brand: brand || undefined,
    priceMaxCents: priceMax && Number.isFinite(Number(priceMax)) ? Math.round(Number(priceMax) * 100) : undefined,
    scoreBand: bands.has(scoreBand ?? "") ? (scoreBand as QueueListFilters["scoreBand"]) : undefined,
    source: source || undefined,
  };
}

export function queueFiltersActive(filters: QueueListFilters): boolean {
  return Boolean(filters.q || filters.brand || filters.priceMaxCents || filters.scoreBand || filters.source);
}

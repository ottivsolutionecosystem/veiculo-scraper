import type { BodyTypeFilter } from "@/lib/search";

export interface QueueListFilters {
  q?: string;
  brand?: string;
  city?: string;
  yearMin?: number;
  yearMax?: number;
  priceMinCents?: number;
  priceMaxCents?: number;
  kmMin?: number;
  kmMax?: number;
  transmission?: string;
  fuelType?: string;
  bodyType?: BodyTypeFilter;
  scoreBand?: "quente" | "boa" | "morna" | "fria";
  source?: string;
}

const BODY_TYPES = new Set<BodyTypeFilter>([
  "hatch",
  "sedan",
  "suv",
  "picape",
  "utilitario",
  "van",
  "conversivel",
]);

function reaisToCents(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
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
  const city = get("city")?.trim();
  const yearMin = get("yearMin")?.trim();
  const yearMax = get("yearMax")?.trim();
  const kmMin = get("kmMin")?.trim();
  const kmMax = get("kmMax")?.trim();
  const scoreBand = get("scoreBand");
  const source = get("source")?.trim();
  const transmission = get("transmission")?.trim();
  const fuelType = get("fuelType")?.trim();
  const bodyType = get("bodyType")?.trim();
  const bands = new Set(["quente", "boa", "morna", "fria"]);

  return {
    q: q || undefined,
    brand: brand || undefined,
    city: city || undefined,
    yearMin: yearMin && Number.isFinite(Number(yearMin)) ? Number(yearMin) : undefined,
    yearMax: yearMax && Number.isFinite(Number(yearMax)) ? Number(yearMax) : undefined,
    priceMinCents: reaisToCents(get("priceMin")),
    priceMaxCents: reaisToCents(get("priceMax")),
    kmMin: kmMin && Number.isFinite(Number(kmMin)) ? Number(kmMin) : undefined,
    kmMax: kmMax && Number.isFinite(Number(kmMax)) ? Number(kmMax) : undefined,
    transmission: transmission || undefined,
    fuelType: fuelType || undefined,
    bodyType: bodyType && BODY_TYPES.has(bodyType as BodyTypeFilter) ? (bodyType as BodyTypeFilter) : undefined,
    scoreBand: bands.has(scoreBand ?? "") ? (scoreBand as QueueListFilters["scoreBand"]) : undefined,
    source: source || undefined,
  };
}

export function queueFiltersActive(filters: QueueListFilters): boolean {
  return Boolean(
    filters.q ||
      filters.brand ||
      filters.city ||
      filters.yearMin ||
      filters.yearMax ||
      filters.priceMinCents ||
      filters.priceMaxCents ||
      filters.kmMin ||
      filters.kmMax ||
      filters.transmission ||
      filters.fuelType ||
      filters.bodyType ||
      filters.scoreBand ||
      filters.source,
  );
}

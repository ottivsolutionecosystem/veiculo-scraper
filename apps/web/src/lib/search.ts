export interface SearchFilters {
  brand?: string;
  model?: string;
  city?: string;
  yearMin?: number;
  yearMax?: number;
  priceMaxCents?: number;
  minFipeDiscountPct?: number;
  transmission?: string;
  onlyActive?: boolean;
  sellerType?: "individual" | "dealer";
}

export function parseSearchFilters(params: Record<string, string | string[] | undefined>): SearchFilters {
  const get = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const num = (key: string) => {
    const v = get(key);
    return v ? Number(v) : undefined;
  };

  const sellerType = get("sellerType");

  return {
    brand: get("brand") || undefined,
    model: get("model") || undefined,
    city: get("city") || undefined,
    yearMin: num("yearMin"),
    yearMax: num("yearMax"),
    priceMaxCents: num("priceMaxCents"),
    minFipeDiscountPct: num("minFipeDiscountPct"),
    transmission: get("transmission") || undefined,
    onlyActive: get("onlyActive") === "1",
    sellerType: sellerType === "individual" || sellerType === "dealer" ? sellerType : undefined,
  };
}

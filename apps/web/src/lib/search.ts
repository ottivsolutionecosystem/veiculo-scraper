export interface SearchFilters {
  /** Número que aparece no card — é o próprio id do veículo. */
  vehicleId?: number;
  brand?: string;
  model?: string;
  city?: string;
  yearMin?: number;
  yearMax?: number;
  priceMaxCents?: number;
  minFipeDiscountPct?: number;
  transmission?: string;
  /** Busca mostra só anúncio no ar por padrão; ligar traz o histórico. */
  includeInactive?: boolean;
  priceChanged?: boolean;
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
    vehicleId: num("vehicleId"),
    brand: get("brand") || undefined,
    model: get("model") || undefined,
    city: get("city") || undefined,
    yearMin: num("yearMin"),
    yearMax: num("yearMax"),
    priceMaxCents: num("priceMaxCents"),
    minFipeDiscountPct: num("minFipeDiscountPct"),
    transmission: get("transmission") || undefined,
    includeInactive: get("includeInactive") === "1",
    priceChanged: get("priceChanged") === "1",
    sellerType: sellerType === "dealer" ? "dealer" : sellerType === "individual" ? "individual" : undefined,
  };
}

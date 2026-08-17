import type { Vehicle } from "@veiculo/types";
import { primaryListing } from "@/mocks/vehicles";

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
  };
}

export function filterVehicles(vehicles: Vehicle[], filters: SearchFilters): Vehicle[] {
  return vehicles.filter((vehicle) => {
    const listing = primaryListing(vehicle);
    if (filters.brand && listing.brand !== filters.brand) return false;
    if (filters.model && !listing.model?.toLowerCase().includes(filters.model.toLowerCase())) return false;
    if (filters.city && listing.city !== filters.city) return false;
    if (filters.yearMin && (listing.modelYear ?? 0) < filters.yearMin) return false;
    if (filters.yearMax && (listing.modelYear ?? 0) > filters.yearMax) return false;
    if (filters.priceMaxCents && (listing.priceCents ?? Infinity) > filters.priceMaxCents) return false;
    if (filters.transmission && listing.transmission !== filters.transmission) return false;
    if (filters.onlyActive && !listing.active) return false;
    if (
      filters.minFipeDiscountPct !== undefined &&
      (vehicle.fipeDiscountPct ?? -Infinity) < filters.minFipeDiscountPct
    )
      return false;
    return true;
  });
}

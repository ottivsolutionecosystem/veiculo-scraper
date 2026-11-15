import { describe, expect, it } from "vitest";

import { parseSearchFilters } from "./search";

describe("parseSearchFilters", () => {
  it("lê faixa de preço, km, combustível e carroceria", () => {
    const filters = parseSearchFilters({
      yearMin: "2019",
      yearMax: "2023",
      priceMinCents: "5000000",
      priceMaxCents: "8000000",
      kmMin: "10000",
      kmMax: "60000",
      transmission: "AUTOMATICO",
      fuelType: "FLEX",
      bodyType: "suv",
    });
    expect(filters).toMatchObject({
      yearMin: 2019,
      yearMax: 2023,
      priceMinCents: 5_000_000,
      priceMaxCents: 8_000_000,
      kmMin: 10_000,
      kmMax: 60_000,
      transmission: "AUTOMATICO",
      fuelType: "FLEX",
      bodyType: "suv",
    });
  });

  it("ignora carroceria inválida", () => {
    expect(parseSearchFilters({ bodyType: "aviao" }).bodyType).toBeUndefined();
  });
});

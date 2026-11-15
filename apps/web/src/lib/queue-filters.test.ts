import { describe, expect, it } from "vitest";

import { parseQueueListFilters, queueFiltersActive } from "./queue-filters";

describe("parseQueueListFilters", () => {
  it("converte preço em reais para centavos e lê os demais", () => {
    const filters = parseQueueListFilters({
      city: "Campo Grande",
      yearMin: "2018",
      priceMin: "40000",
      priceMax: "90000",
      kmMax: "80000",
      transmission: "MANUAL",
      fuelType: "DIESEL",
      bodyType: "picape",
    });
    expect(filters).toMatchObject({
      city: "Campo Grande",
      yearMin: 2018,
      priceMinCents: 4_000_000,
      priceMaxCents: 9_000_000,
      kmMax: 80_000,
      transmission: "MANUAL",
      fuelType: "DIESEL",
      bodyType: "picape",
    });
    expect(queueFiltersActive(filters)).toBe(true);
  });
});

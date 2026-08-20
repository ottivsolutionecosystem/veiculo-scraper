import { describe, expect, it } from "vitest";

import { fuelFromYearName, normalizeReferenceMonth } from "./parallelum-fipe-provider.js";

describe("fuelFromYearName", () => {
  it("lê combustível do nome, não do sufixo", () => {
    expect(fuelFromYearName("2023 Flex", "2023-1")).toBe("FLEX");
    expect(fuelFromYearName("2020 Diesel", "2020-3")).toBe("DIESEL");
    expect(fuelFromYearName("2018 Álcool", "2018-2")).toBe("ALCOOL");
  });
});

describe("normalizeReferenceMonth", () => {
  it("converte mês por extenso em YYYY-MM", () => {
    expect(normalizeReferenceMonth("agosto de 2026")).toBe("2026-08");
    expect(normalizeReferenceMonth("2026-07")).toBe("2026-07");
  });
});

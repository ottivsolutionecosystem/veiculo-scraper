import { describe, expect, it } from "vitest";

import { matchInterestScore, type InterestCriteria, type VehicleAttributes } from "./match-interesse.js";

function interest(overrides: Partial<InterestCriteria> = {}): InterestCriteria {
  return {
    brand: null,
    model: null,
    yearMin: null,
    yearMax: null,
    maxKm: null,
    priceMinCents: null,
    priceMaxCents: null,
    transmission: null,
    city: null,
    ...overrides,
  };
}

function vehicle(overrides: Partial<VehicleAttributes> = {}): VehicleAttributes {
  return {
    brand: "HONDA",
    model: "HR-V",
    modelYear: 2022,
    km: 24_000,
    priceCents: 13_990_000,
    transmission: "AUTOMATICO",
    city: "Campo Grande",
    ...overrides,
  };
}

describe("matchInterestScore", () => {
  it("interesse sem nenhum critério casa com qualquer veículo, score máximo", () => {
    expect(matchInterestScore(interest(), vehicle())).toBe(100);
  });

  it("marca diferente nunca casa", () => {
    expect(matchInterestScore(interest({ brand: "TOYOTA" }), vehicle())).toBeNull();
  });

  it("modelo diferente nunca casa mesmo com a marca certa", () => {
    expect(matchInterestScore(interest({ brand: "HONDA", model: "CIVIC" }), vehicle())).toBeNull();
  });

  it("km acima do máximo desqualifica", () => {
    expect(matchInterestScore(interest({ maxKm: 20_000 }), vehicle({ km: 24_000 }))).toBeNull();
  });

  it("ano fora da faixa desqualifica (abaixo e acima)", () => {
    expect(matchInterestScore(interest({ yearMin: 2023 }), vehicle({ modelYear: 2022 }))).toBeNull();
    expect(matchInterestScore(interest({ yearMax: 2021 }), vehicle({ modelYear: 2022 }))).toBeNull();
  });

  it("preço fora do orçamento desqualifica", () => {
    expect(matchInterestScore(interest({ priceMaxCents: 10_000_000 }), vehicle({ priceCents: 13_990_000 }))).toBeNull();
  });

  it("câmbio diferente reduz o score mas não desqualifica", () => {
    const score = matchInterestScore(interest({ transmission: "MANUAL" }), vehicle({ transmission: "AUTOMATICO" }));
    expect(score).not.toBeNull();
    expect(score).toBeLessThan(100);
  });

  it("cidade diferente reduz o score mas não desqualifica", () => {
    const score = matchInterestScore(interest({ city: "Dourados" }), vehicle({ city: "Campo Grande" }));
    expect(score).not.toBeNull();
    expect(score).toBeLessThan(100);
  });

  it("um veículo qualificado nunca cai abaixo do piso mínimo", () => {
    const score = matchInterestScore(
      interest({ transmission: "MANUAL", city: "Dourados" }),
      vehicle({ transmission: "AUTOMATICO", city: "Campo Grande" }),
    );
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it("caso de borda: 3 clientes compatíveis — três interesses distintos casam com o mesmo veículo", () => {
    const v = vehicle({ brand: "HONDA", model: "HR-V", modelYear: 2022 });
    const interesses = [
      interest({ brand: "HONDA", model: "HR-V" }),
      interest({ brand: "HONDA", model: "HR-V", transmission: "MANUAL" }),
      interest({ brand: "HONDA" }),
    ];
    const matches = interesses.map((i) => matchInterestScore(i, v)).filter((s) => s !== null);
    expect(matches).toHaveLength(3);
  });
});

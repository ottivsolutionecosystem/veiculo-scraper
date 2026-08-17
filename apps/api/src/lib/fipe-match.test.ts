import { describe, expect, it } from "vitest";

import { rankFipeCandidates, classifyFipeMatch, type FipeCandidate } from "./fipe-match.js";

const COROLLA_GLI: FipeCandidate = {
  fipeCode: "005123-4",
  brand: "TOYOTA",
  model: "COROLLA",
  trim: "GLI 1.8 16V FLEX",
  modelYear: 2020,
  fuelType: "FLEX",
};
const COROLLA_XEI: FipeCandidate = {
  fipeCode: "005124-6",
  brand: "TOYOTA",
  model: "COROLLA",
  trim: "XEI 2.0 16V FLEX AUT",
  modelYear: 2020,
  fuelType: "FLEX",
};
const COROLLA_ALTIS: FipeCandidate = {
  fipeCode: "005125-8",
  brand: "TOYOTA",
  model: "COROLLA",
  trim: "ALTIS 2.0 16V FLEX AUT",
  modelYear: 2020,
  fuelType: "FLEX",
};
const HILUX: FipeCandidate = {
  fipeCode: "009000-1",
  brand: "TOYOTA",
  model: "HILUX",
  trim: "SRV 2.8 DIESEL",
  modelYear: 2020,
  fuelType: "DIESEL",
};
const GOL: FipeCandidate = {
  fipeCode: "001000-1",
  brand: "VOLKSWAGEN",
  model: "GOL",
  trim: "1.0 FLEX",
  modelYear: 2020,
  fuelType: "FLEX",
};

const CANDIDATES = [COROLLA_GLI, COROLLA_XEI, COROLLA_ALTIS, HILUX, GOL];

describe("rankFipeCandidates", () => {
  it("filtra por marca — GOL nunca aparece pra uma busca TOYOTA", () => {
    const ranked = rankFipeCandidates(
      { brand: "TOYOTA", normalizedTitle: "TOYOTA COROLLA GLI 1.8 16V FLEX 2020", modelYear: 2020, fuelType: "FLEX" },
      CANDIDATES,
    );
    expect(ranked.map((r) => r.candidate.fipeCode)).not.toContain(GOL.fipeCode);
  });

  it("título e ano batendo exatamente dá confiança alta (match automático)", () => {
    const ranked = rankFipeCandidates(
      { brand: "TOYOTA", normalizedTitle: "TOYOTA COROLLA GLI 1.8 16V FLEX 2020", modelYear: 2020, fuelType: "FLEX" },
      CANDIDATES,
    );
    const outcome = classifyFipeMatch(ranked);
    expect(outcome.status).toBe("auto");
    if (outcome.status === "auto") {
      expect(outcome.result.candidate.fipeCode).toBe(COROLLA_GLI.fipeCode);
    }
  });

  it("título sem versão clara entre GLI/XEI cai em revisão com candidatos próximos", () => {
    const ranked = rankFipeCandidates(
      { brand: "TOYOTA", normalizedTitle: "TOYOTA COROLLA 2020", modelYear: 2020, fuelType: "FLEX" },
      CANDIDATES,
    );
    const outcome = classifyFipeMatch(ranked);
    expect(outcome.status).toBe("review");
    if (outcome.status === "review") {
      expect(outcome.candidates.length).toBeGreaterThanOrEqual(2);
      expect(outcome.candidates.every((c) => c.candidate.model === "COROLLA")).toBe(true);
    }
  });

  it("combustível divergente reduz a confiança do candidato", () => {
    const comDiesel = rankFipeCandidates(
      { brand: "TOYOTA", normalizedTitle: "TOYOTA HILUX SRV 2.8 DIESEL 2020", modelYear: 2020, fuelType: "DIESEL" },
      CANDIDATES,
    )[0]!;
    const comFlexErrado = rankFipeCandidates(
      { brand: "TOYOTA", normalizedTitle: "TOYOTA HILUX SRV 2.8 DIESEL 2020", modelYear: 2020, fuelType: "FLEX" },
      CANDIDATES,
    )[0]!;
    expect(comFlexErrado.confidence).toBeLessThan(comDiesel.confidence);
  });

  it("marca sem nenhum candidato correspondente devolve status none", () => {
    const ranked = rankFipeCandidates(
      { brand: "CHERY", normalizedTitle: "CHERY TIGGO 5X 2022", modelYear: 2022, fuelType: "FLEX" },
      CANDIDATES,
    );
    expect(classifyFipeMatch(ranked).status).toBe("none");
  });
});

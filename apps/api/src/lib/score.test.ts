import { describe, expect, it } from "vitest";

import { calculateScore, type ScoreCalcInput } from "./score.js";

const WEIGHTS: ScoreCalcInput["weights"] = [
  { key: "fipe_discount", weight: 0.42 },
  { key: "days_listed", weight: 0.18 },
  { key: "price_drops", weight: 0.22 },
  { key: "model_liquidity", weight: 0.04 },
  { key: "km_vs_average", weight: 0.08 },
  { key: "completeness", weight: 0.06 },
  { key: "internal_demand", weight: 0 },
];
const THRESHOLDS = { hot: 80, good: 60, warm: 40 };

function baseInput(overrides: Partial<ScoreCalcInput> = {}): ScoreCalcInput {
  return {
    fipeDiscountPct: 0,
    daysListed: 0,
    priceDropsCount: 0,
    modelLiquidityScore: 50,
    kmVsAveragePct: 0,
    completenessPct: 0,
    compatibleCustomers: 0,
    riskFlags: [],
    weights: WEIGHTS,
    bandThresholds: THRESHOLDS,
    ...overrides,
  };
}

describe("calculateScore", () => {
  it("veículo sem nenhum sinal positivo fica na faixa fria, nunca negativo", () => {
    const result = calculateScore(baseInput());
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.band).toBe("fria");
  });

  it("todos os sinais no máximo chega perto de 100 e cai em quente", () => {
    const result = calculateScore(
      baseInput({
        fipeDiscountPct: 40,
        daysListed: 90,
        priceDropsCount: 6,
        modelLiquidityScore: 100,
        kmVsAveragePct: -60,
        completenessPct: 100,
        compatibleCustomers: 3,
      }),
    );
    expect(result.total).toBeGreaterThanOrEqual(95);
    expect(result.band).toBe("quente");
  });

  it("total nunca ultrapassa 100 mesmo com múltiplos sinais fortes", () => {
    const result = calculateScore(
      baseInput({
        fipeDiscountPct: 100,
        daysListed: 500,
        priceDropsCount: 20,
        modelLiquidityScore: 100,
        kmVsAveragePct: -200,
        completenessPct: 100,
        compatibleCustomers: 10,
      }),
    );
    expect(result.total).toBe(100);
  });

  it("risco reduz o total sem deixar negativo", () => {
    const semRisco = calculateScore(baseInput({ fipeDiscountPct: 20, compatibleCustomers: 1 }));
    const comRisco = calculateScore(
      baseInput({ fipeDiscountPct: 20, compatibleCustomers: 1, riskFlags: ["sinistro_declarado"] }),
    );
    expect(comRisco.total).toBeLessThan(semRisco.total);

    const riscoExtremo = calculateScore(
      baseInput({ riskFlags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] }),
    );
    expect(riscoExtremo.total).toBeGreaterThanOrEqual(0);
  });

  it("demanda interna com peso zero não altera o total — consignação não ranqueia por comprador", () => {
    const comDemanda = calculateScore(baseInput({ compatibleCustomers: 3 }));
    const semDemanda = calculateScore(baseInput({ compatibleCustomers: 0 }));
    expect(comDemanda.total).toBe(semDemanda.total);
  });

  it("cada componente tem um valor bruto explícito — nunca só a cor (seção 9)", () => {
    const result = calculateScore(baseInput({ fipeDiscountPct: 15 }));
    for (const component of result.components) {
      expect(component).toHaveProperty("points");
      expect(typeof component.points).toBe("number");
    }
  });

  it("faixas respeitam os limiares configurados conforme o total cresce", () => {
    // model_liquidity + completeness entram diretamente (0-100), sem
    // fórmula de conversão — dá pra mirar o total com precisão.
    const quente = calculateScore(
      baseInput({
        modelLiquidityScore: 100,
        completenessPct: 100,
        fipeDiscountPct: 40,
        daysListed: 90,
        priceDropsCount: 4,
        compatibleCustomers: 3,
        kmVsAveragePct: -60,
      }),
    );
    const morna = calculateScore(baseInput({ modelLiquidityScore: 40, completenessPct: 0 }));
    const fria = calculateScore(baseInput({ modelLiquidityScore: 0, completenessPct: 0 }));

    expect(quente.total).toBeGreaterThanOrEqual(THRESHOLDS.hot);
    expect(quente.band).toBe("quente");
    expect(fria.total).toBeLessThan(THRESHOLDS.warm);
    expect(fria.band).toBe("fria");
    // monotonicidade: mais sinal positivo nunca deve resultar em faixa pior.
    expect(rank(quente.band)).toBeGreaterThanOrEqual(rank(morna.band));
    expect(rank(morna.band)).toBeGreaterThanOrEqual(rank(fria.band));

    function rank(band: string) {
      return { fria: 0, morna: 1, boa: 2, quente: 3 }[band] ?? -1;
    }
  });
});

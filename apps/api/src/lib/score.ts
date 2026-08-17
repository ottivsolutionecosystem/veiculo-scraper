import type { ScoreBand, ScoreComponent } from "@veiculo/types";

/**
 * Score de oportunidade (SPEC seção 9). Calculado no worker, nunca em
 * tempo de request (CLAUDE.md) — esta função é chamada pelo job `score`
 * e o resultado é persistido em `scores`.
 *
 * Cada componente entra normalizado 0-100 ("raw"); os pesos (somam ~1.0,
 * vêm de `configuracoes.pesos`) convertem isso em pontos de 0 a 100 no
 * total. Risco é penalidade à parte, subtraída depois — por isso não tem
 * peso configurável (mesma convenção da seção 9: "Risco (negativo)").
 */

export interface ScoreWeightInput {
  key: ScoreComponent["key"];
  weight: number; // 0-1
}

export interface ScoreCalcInput {
  fipeDiscountPct: number | null;
  daysListed: number;
  priceDropsCount: number;
  modelLiquidityScore: number | null; // 0-100, pré-calculado a partir do histórico
  kmVsAveragePct: number | null; // negativo = abaixo da média (bom)
  completenessPct: number; // 0-100
  compatibleCustomers: number;
  riskFlags: string[];
  weights: readonly ScoreWeightInput[];
  bandThresholds: { hot: number; good: number; warm: number };
}

export interface ScoreResult {
  total: number;
  band: ScoreBand;
  components: ScoreComponent[];
}

const RISK_PENALTY_PER_FLAG = 15;
const RISK_PENALTY_MAX = 40;

function rawFipeDiscount(pct: number | null): number {
  if (pct === null) return 0;
  return clamp(pct * 3, 0, 100);
}

function rawDaysListed(days: number): number {
  return clamp((days / 60) * 100, 0, 100);
}

function rawPriceDrops(count: number): number {
  return clamp(count * 25, 0, 100);
}

function rawKmVsAverage(pct: number | null): number {
  if (pct === null) return 50;
  return clamp(50 - pct, 0, 100);
}

function rawInternalDemand(customers: number): number {
  return clamp(customers * 34, 0, 100);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function weightFor(weights: readonly ScoreWeightInput[], key: ScoreComponent["key"]): number {
  return weights.find((w) => w.key === key)?.weight ?? 0;
}

function bandFor(total: number, thresholds: ScoreCalcInput["bandThresholds"]): ScoreBand {
  if (total >= thresholds.hot) return "quente";
  if (total >= thresholds.good) return "boa";
  if (total >= thresholds.warm) return "morna";
  return "fria";
}

export function calculateScore(input: ScoreCalcInput): ScoreResult {
  const raws: Record<Exclude<ScoreComponent["key"], "risk">, number> = {
    fipe_discount: rawFipeDiscount(input.fipeDiscountPct),
    days_listed: rawDaysListed(input.daysListed),
    price_drops: rawPriceDrops(input.priceDropsCount),
    model_liquidity: input.modelLiquidityScore ?? 50,
    km_vs_average: rawKmVsAverage(input.kmVsAveragePct),
    completeness: input.completenessPct,
    internal_demand: rawInternalDemand(input.compatibleCustomers),
  };

  const weightedComponents: ScoreComponent[] = (
    Object.keys(raws) as (keyof typeof raws)[]
  ).map((key) => ({
    key,
    rawValueLabel: "", // preenchido pela camada de apresentação (rótulos em português)
    points: Math.round((raws[key] / 100) * weightFor(input.weights, key) * 100),
  }));

  const riskPenalty = Math.min(RISK_PENALTY_MAX, input.riskFlags.length * RISK_PENALTY_PER_FLAG);
  const riskComponent: ScoreComponent = { key: "risk", rawValueLabel: "", points: -riskPenalty };

  const components = [...weightedComponents, riskComponent];
  const total = clamp(
    Math.round(components.reduce((sum, c) => sum + c.points, 0)),
    0,
    100,
  );

  return { total, band: bandFor(total, input.bandThresholds), components };
}

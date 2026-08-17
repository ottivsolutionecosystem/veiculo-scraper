import type { FipePrice } from "@veiculo/types";
import { BRANDS, MODELS_BY_BRAND } from "./catalog";
import { createRng } from "./rng";

const DIESEL_MODELS = new Set(["RANGER", "HILUX", "S10", "L200", "SW4", "COMMANDER", "TORO"]);

// Preço-base (centavos) por modelo em 2024, decaindo ~9% ao ano para trás.
// Heurística por categoria — não é dado real, só serve para os cálculos de
// desconto FIPE do mock baterem com uma curva plausível.
const BASE_PRICE_CENTS: Record<string, number> = {
  GOL: 7_990_000, POLO: 9_890_000, VIRTUS: 10_490_000, "T-CROSS": 14_990_000,
  NIVUS: 13_990_000, SAVEIRO: 10_990_000, VOYAGE: 8_990_000, JETTA: 16_990_000,
  ONIX: 8_490_000, PRISMA: 8_990_000, TRACKER: 14_490_000, S10: 27_990_000,
  CRUZE: 13_990_000, SPIN: 11_990_000, MONTANA: 11_490_000,
  STRADA: 10_490_000, TORO: 16_990_000, ARGO: 8_490_000, MOBI: 6_990_000,
  CRONOS: 8_990_000, PULSE: 11_990_000, UNO: 6_490_000, PALIO: 6_990_000,
  FASTBACK: 15_990_000,
  KA: 6_990_000, RANGER: 24_990_000, ECOSPORT: 9_990_000, FIESTA: 7_490_000,
  COROLLA: 16_990_000, HILUX: 26_990_000, YARIS: 10_990_000,
  "COROLLA CROSS": 17_990_000, ETIOS: 7_990_000, SW4: 34_990_000,
  CIVIC: 18_990_000, "HR-V": 15_990_000, FIT: 9_990_000, CITY: 12_990_000,
  "WR-V": 13_990_000,
  HB20: 9_490_000, CRETA: 15_490_000, TUCSON: 21_990_000,
  KWID: 6_990_000, SANDERO: 8_490_000, DUSTER: 13_990_000, LOGAN: 8_990_000,
  OROCH: 12_490_000,
  KICKS: 13_990_000, FRONTIER: 28_990_000, VERSA: 10_490_000,
  COMPASS: 19_990_000, RENEGADE: 14_990_000, COMMANDER: 25_990_000,
  L200: 27_990_000, PAJERO: 32_990_000,
};

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];
export const FIPE_REFERENCE_MONTH = "2026-07";

function fipeCode(brandIdx: number, modelIdx: number, yearIdx: number): string {
  const n = brandIdx * 900 + modelIdx * 30 + yearIdx + 1000;
  const check = n % 10;
  return `${String(n).padStart(6, "0")}-${check}`;
}

function buildFipeTable(): FipePrice[] {
  const rng = createRng(20260717);
  const rows: FipePrice[] = [];

  BRANDS.forEach((brand, brandIdx) => {
    const models = MODELS_BY_BRAND[brand] ?? [];
    models.forEach((model, modelIdx) => {
      const base = BASE_PRICE_CENTS[model] ?? 10_000_000;
      const fuel = DIESEL_MODELS.has(model) ? "DIESEL" : "FLEX";
      YEARS.forEach((modelYear, yearIdx) => {
        const idadeAnos = 2024 - modelYear;
        const depreciado = base * Math.pow(0.91, idadeAnos);
        const ruido = 1 + (rng() - 0.5) * 0.04; // ±2% de ruído entre anos
        rows.push({
          fipeCode: fipeCode(brandIdx, modelIdx, yearIdx),
          brand,
          model,
          modelYear,
          fuelType: fuel,
          referenceMonth: FIPE_REFERENCE_MONTH,
          valueCents: Math.round((depreciado * ruido) / 100) * 100,
        });
      });
    });
  });

  return rows;
}

export const FIPE_TABLE: FipePrice[] = buildFipeTable();

export function findFipePrice(
  brand: string | null,
  model: string | null,
  modelYear: number | null,
): FipePrice | undefined {
  if (!brand || !model || !modelYear) return undefined;
  return FIPE_TABLE.find(
    (row) => row.brand === brand && row.model === model && row.modelYear === modelYear,
  );
}

import type {
  Vehicle,
  Listing,
  Score,
  ScoreComponent,
  ScoreBand,
  Transmission,
  FuelType,
  VehicleState,
} from "@veiculo/types";
import { BRANDS, MODELS_BY_BRAND, CITIES, COLORS, DISCARD_REASONS } from "./catalog";
import { findFipePrice, FIPE_REFERENCE_MONTH } from "./fipe";
import { createRng, pick, int, chance } from "./rng";
import { mockPhotos } from "./photos";

const NOW = Date.UTC(2026, 7, 17, 12, 0, 0); // 17/08/2026 — fixo para não variar entre renders
const DAY = 86_400_000;
const isoDaysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

let nextListingId = 1;
let nextVehicleId = 1;

function scoreBand(total: number): ScoreBand {
  if (total >= 80) return "quente";
  if (total >= 60) return "boa";
  if (total >= 40) return "morna";
  return "fria";
}

interface ScoreInput {
  fipeDiscountPct: number | null;
  daysListed: number;
  priceDropsCount: number;
  kmVsAveragePct: number | null; // negativo = abaixo da média (bom)
  completenessPct: number; // 0-100
  compatibleCustomers: number;
  riskPenalty: number; // 0 a 20
}

function buildScore(vehicleId: number, input: ScoreInput): Score {
  const fipePts = input.fipeDiscountPct === null ? 0 : clamp(input.fipeDiscountPct * 1.3, 0, 28);
  const agePts = clamp(input.daysListed / 3, 0, 14);
  const dropsPts = clamp(input.priceDropsCount * 3, 0, 12);
  const liquidityPts = clamp(10 - input.riskPenalty / 2, 0, 10);
  const kmPts = input.kmVsAveragePct === null ? 5 : clamp(-input.kmVsAveragePct / 2, 0, 12);
  const completenessPts = clamp(input.completenessPct / 10, 0, 10);
  const demandPts = clamp(input.compatibleCustomers * 8, 0, 24);
  const riskPts = -input.riskPenalty;

  const components: ScoreComponent[] = [
    {
      key: "fipe_discount",
      rawValueLabel: input.fipeDiscountPct === null ? "sem match FIPE" : `${input.fipeDiscountPct.toFixed(1)}%`,
      points: Math.round(fipePts),
    },
    { key: "days_listed", rawValueLabel: `${input.daysListed} dias no ar`, points: Math.round(agePts) },
    { key: "price_drops", rawValueLabel: `${input.priceDropsCount} quedas`, points: Math.round(dropsPts) },
    { key: "model_liquidity", rawValueLabel: "liquidez média do modelo", points: Math.round(liquidityPts) },
    {
      key: "km_vs_average",
      rawValueLabel: input.kmVsAveragePct === null ? "sem km" : `${input.kmVsAveragePct > 0 ? "+" : ""}${input.kmVsAveragePct.toFixed(0)}% vs média`,
      points: Math.round(kmPts),
    },
    { key: "completeness", rawValueLabel: `${input.completenessPct}% dos campos`, points: Math.round(completenessPts) },
    {
      key: "internal_demand",
      rawValueLabel: input.compatibleCustomers > 0 ? `${input.compatibleCustomers} clientes procurando` : "nenhum cliente",
      points: Math.round(demandPts),
    },
    { key: "risk", rawValueLabel: input.riskPenalty > 0 ? "sinais de risco" : "sem sinais de risco", points: Math.round(riskPts) },
  ];

  const total = clamp(
    components.reduce((sum, c) => sum + c.points, 0),
    0,
    100,
  );

  return {
    vehicleId,
    total: Math.round(total),
    band: scoreBand(total),
    components,
    calculatedAt: isoDaysAgo(0),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

interface ListingSpec {
  source: string;
  brand: string;
  model: string;
  trim?: string | null;
  modelYear: number;
  manufactureYear?: number;
  km: number | null;
  priceCents: number | null;
  transmission?: Transmission | null;
  fuelType?: FuelType | null;
  color?: string | null;
  city?: string;
  state?: string;
  photos?: string[];
  active?: boolean;
  originalTitle?: string;
  normalizedTitle?: string;
  daysAgo?: number;
  pendingFields?: string[];
}

function buildListing(spec: ListingSpec): Listing {
  const id = nextListingId++;
  const manufactureYear = spec.manufactureYear ?? spec.modelYear;
  const originalTitle =
    spec.originalTitle ?? `${spec.brand} ${spec.model} ${spec.trim ?? ""} ${manufactureYear}/${spec.modelYear}`.replace(/\s+/g, " ").trim();
  const normalizedTitle = spec.normalizedTitle ?? originalTitle.toUpperCase();

  return {
    id,
    source: spec.source,
    externalId: `${spec.source}-${100000 + id}`,
    url: `https://www.${spec.source}.com.br/veiculo/${100000 + id}`,
    originalTitle,
    normalizedTitle,
    brand: spec.brand,
    model: spec.model,
    trim: spec.trim ?? null,
    manufactureYear,
    modelYear: spec.modelYear,
    km: spec.km,
    priceCents: spec.priceCents,
    transmission: spec.transmission ?? "MANUAL",
    fuelType: spec.fuelType ?? "FLEX",
    color: spec.color ?? null,
    city: spec.city ?? "Campo Grande",
    stateCode: spec.state ?? "MS",
    photos: spec.photos ?? mockPhotos(id, `${spec.brand} ${spec.model}`, 3),
    fingerprint: `${spec.brand}|${spec.model}|${spec.modelYear}|${spec.city ?? "Campo Grande"}`,
    contentHash: `hash-${id}`,
    pendingFields: spec.pendingFields ?? [],
    firstSeenAt: isoDaysAgo(spec.daysAgo ?? 0),
    lastSeenAt: isoDaysAgo(0),
    active: spec.active ?? true,
  };
}

interface VehicleSpec {
  sellerId: string;
  listings: ListingSpec[];
  state?: VehicleState;
  discardReason?: string | null;
  returnTrigger?: Vehicle["returnTrigger"];
  daysListed: number;
  priceDropCentsSeries?: number[]; // histórico de preço, mais recente por último
  priceDropDaysSpan?: number;
  fipeOverride?: { discountPct: number | null; confidence: number | null; candidates?: Vehicle["fipeMatchCandidates"] };
  kmVsAveragePct?: number | null;
  compatibleCustomers?: number;
  riskPenalty?: number;
}

function buildVehicle(spec: VehicleSpec): Vehicle {
  const id = nextVehicleId++;
  const listings = spec.listings.map(buildListing);
  const primary = listings[0]!;

  const fipe = findFipePrice(primary.brand, primary.model, primary.modelYear);
  let fipeDiscountPct: number | null = null;
  let fipeDiscountCents: number | null = null;
  let fipeConfidence: number | null = fipe ? 0.95 : null;
  let candidates: Vehicle["fipeMatchCandidates"] = null;

  if (spec.fipeOverride) {
    fipeDiscountPct = spec.fipeOverride.discountPct;
    fipeConfidence = spec.fipeOverride.confidence;
    candidates = spec.fipeOverride.candidates ?? null;
    fipeDiscountCents =
      fipe && fipeDiscountPct !== null ? Math.round((fipe.valueCents * fipeDiscountPct) / 100) : null;
  } else if (fipe && primary.priceCents) {
    fipeDiscountCents = fipe.valueCents - primary.priceCents;
    fipeDiscountPct = Number(((fipeDiscountCents / fipe.valueCents) * 100).toFixed(1));
  }

  const priceHistory = (spec.priceDropCentsSeries ?? (primary.priceCents ? [primary.priceCents] : [])).map(
    (priceCents, idx, arr) => ({
      id: 100_000 + id * 10 + idx,
      listingId: primary.id,
      priceCents,
      observedAt: isoDaysAgo(spec.priceDropDaysSpan ? spec.priceDropDaysSpan - idx * (spec.priceDropDaysSpan / (arr.length - 1 || 1)) : (arr.length - 1 - idx) * 4),
    }),
  );

  const filledFields = [primary.brand, primary.model, primary.modelYear, primary.km, primary.priceCents].filter(
    (f) => f !== null && f !== undefined,
  ).length;
  const completenessPct = Math.round((filledFields / 5) * 100);

  const score = buildScore(id, {
    fipeDiscountPct,
    daysListed: spec.daysListed,
    priceDropsCount: Math.max(0, priceHistory.length - 1),
    kmVsAveragePct: spec.kmVsAveragePct ?? null,
    completenessPct,
    compatibleCustomers: spec.compatibleCustomers ?? 0,
    riskPenalty: spec.riskPenalty ?? 0,
  });

  return {
    id,
    fingerprint: primary.fingerprint,
    listings,
    primaryListingId: primary.id,
    state: spec.state ?? "new",
    discardReason: spec.discardReason ?? null,
    returnTrigger: spec.returnTrigger ?? null,
    fipeDiscountPct,
    fipeDiscountCents,
    fipeAdjustedCents: null,
    fipeMatchConfidence: fipeConfidence,
    fipeMatchCandidates: candidates,
    score,
    priceHistory,
    daysListed: spec.daysListed,
    sellerId: spec.sellerId,
    compatibleCustomersCount: spec.compatibleCustomers ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Cenários de borda explícitos (seção 15 do SPEC) — IDs 1..11
// ---------------------------------------------------------------------------

const scenarios: Vehicle[] = [
  // 1. Sem foto
  buildVehicle({
    sellerId: "seller-1",
    daysListed: 12,
    listings: [
      { source: "shopcar", brand: "FIAT", model: "ARGO", modelYear: 2022, km: 32_000, priceCents: 7_490_000, photos: [] },
    ],
  }),
  // 2. Sem km
  buildVehicle({
    sellerId: "seller-2",
    daysListed: 5,
    listings: [
      { source: "shopcar", brand: "HYUNDAI", model: "HB20", modelYear: 2021, km: null, priceCents: 8_290_000, pendingFields: ["km"] },
    ],
  }),
  // 3. Preço 10x fora da curva (erro de digitação típico de classificado)
  buildVehicle({
    sellerId: "seller-3",
    daysListed: 20,
    riskPenalty: 18,
    listings: [
      { source: "olx", brand: "TOYOTA", model: "COROLLA", modelYear: 2021, km: 41_000, priceCents: 169_900_000 },
    ],
  }),
  // 4. Mesmo carro em 3 fontes (dedupe)
  buildVehicle({
    sellerId: "seller-4",
    daysListed: 18,
    compatibleCustomers: 1,
    listings: [
      { source: "shopcar", brand: "CHEVROLET", model: "ONIX", modelYear: 2023, km: 18_500, priceCents: 7_890_000, city: "Campo Grande" },
      { source: "webmotors", brand: "CHEVROLET", model: "ONIX", modelYear: 2023, km: 18_900, priceCents: 8_090_000, city: "Campo Grande" },
      { source: "olx", brand: "CHEVROLET", model: "ONIX", modelYear: 2023, km: 18_200, priceCents: 7_990_000, city: "Campo Grande" },
    ],
  }),
  // 5. Anúncio inativo
  buildVehicle({
    sellerId: "seller-5",
    daysListed: 60,
    listings: [
      { source: "shopcar", brand: "VOLKSWAGEN", model: "VIRTUS", modelYear: 2020, km: 68_000, priceCents: 7_290_000, active: false, daysAgo: 60 },
    ],
  }),
  // 6. Sem match FIPE (marca/modelo fora do dicionário do normalizador)
  buildVehicle({
    sellerId: "seller-6",
    daysListed: 9,
    state: "analyzing",
    fipeOverride: { discountPct: null, confidence: null },
    listings: [
      {
        source: "shopcar",
        brand: "CHERY",
        model: "TIGGO 5X",
        modelYear: 2022,
        km: 29_000,
        priceCents: 9_490_000,
        originalTitle: "CHERY TIGGO 5X 2022 IMPECÁVEL",
        pendingFields: ["fipe"],
      },
    ],
  }),
  // 7. Match ambíguo entre 2 versões (confiança entre 0.60 e 0.85)
  buildVehicle({
    sellerId: "seller-7",
    daysListed: 7,
    state: "analyzing",
    fipeOverride: {
      discountPct: 8.4,
      confidence: 0.72,
      candidates: [
        { fipeCode: "005123-4", label: "COROLLA GLI 1.8 16V FLEX 2020", confidence: 0.72 },
        { fipeCode: "005124-6", label: "COROLLA XEI 2.0 16V FLEX AUT 2020", confidence: 0.61 },
        { fipeCode: "005125-8", label: "COROLLA ALTIS 2.0 16V FLEX AUT 2020", confidence: 0.58 },
      ],
    },
    listings: [
      { source: "shopcar", brand: "TOYOTA", model: "COROLLA", trim: "GLI", modelYear: 2020, km: 55_000, priceCents: 12_490_000 },
    ],
  }),
  // 8. Título sujo
  buildVehicle({
    sellerId: "seller-8",
    daysListed: 3,
    listings: [
      {
        source: "shopcar",
        brand: "VOLKSWAGEN",
        model: "GOL",
        modelYear: 2016,
        manufactureYear: 2015,
        km: 98_000,
        priceCents: 4_290_000,
        originalTitle: "GOL 1.0 FLEX COMPLETÃO 15/16 IPVA PAGO!!! ÚNICO DONO",
        normalizedTitle: "GOL 1.0 FLEX 15/16",
      },
    ],
  }),
  // 9. Descartado com gatilho de retorno já disparado
  buildVehicle({
    sellerId: "seller-9",
    daysListed: 45,
    state: "discarded",
    discardReason: "Preço fora da faixa",
    returnTrigger: { kind: "price_drop", value: 7 },
    priceDropCentsSeries: [11_900_000, 10_490_000],
    priceDropDaysSpan: 30,
    listings: [
      { source: "shopcar", brand: "JEEP", model: "COMPASS", modelYear: 2021, km: 52_000, priceCents: 10_490_000, daysAgo: 45 },
    ],
  }),
  // 10. 6 quedas de preço em 40 dias
  buildVehicle({
    sellerId: "seller-10",
    daysListed: 40,
    priceDropDaysSpan: 40,
    priceDropCentsSeries: [16_990_000, 16_490_000, 15_990_000, 15_490_000, 14_990_000, 14_490_000, 13_990_000],
    listings: [
      { source: "shopcar", brand: "FIAT", model: "TORO", modelYear: 2021, km: 61_000, priceCents: 13_990_000, daysAgo: 40, fuelType: "DIESEL" },
    ],
  }),
  // 11. 3 clientes compatíveis
  buildVehicle({
    sellerId: "seller-11",
    daysListed: 6,
    compatibleCustomers: 3,
    listings: [
      { source: "shopcar", brand: "HONDA", model: "HR-V", modelYear: 2022, km: 24_000, priceCents: 13_990_000 },
    ],
  }),
];

// ---------------------------------------------------------------------------
// Vendedor com 14 anúncios (seção 15) — IDs 12..25
// ---------------------------------------------------------------------------

const heavySellerRng = createRng(140914);
const heavySellerModels: [string, string][] = [
  ["VOLKSWAGEN", "GOL"], ["VOLKSWAGEN", "SAVEIRO"], ["CHEVROLET", "ONIX"], ["CHEVROLET", "PRISMA"],
  ["FIAT", "STRADA"], ["FIAT", "ARGO"], ["FORD", "KA"], ["HYUNDAI", "HB20"],
  ["RENAULT", "SANDERO"], ["RENAULT", "KWID"], ["NISSAN", "VERSA"], ["TOYOTA", "ETIOS"],
  ["FIAT", "MOBI"], ["CHEVROLET", "SPIN"],
];

const heavySeller: Vehicle[] = heavySellerModels.map(([brand, model], idx) => {
  const modelYear = int(heavySellerRng, 2017, 2023);
  const fipe = findFipePrice(brand, model, modelYear);
  const base = fipe?.valueCents ?? 8_000_000;
  return buildVehicle({
    sellerId: "seller-0",
    daysListed: int(heavySellerRng, 2, 90),
    listings: [
      {
        source: "shopcar",
        brand,
        model,
        modelYear,
        km: int(heavySellerRng, 20_000, 120_000),
        priceCents: Math.round((base * (0.85 + heavySellerRng() * 0.2)) / 100) * 100,
        color: pick(heavySellerRng, COLORS),
        daysAgo: int(heavySellerRng, 2, 90),
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Preenchimento (~180 veículos) para passar de 200 no total
// ---------------------------------------------------------------------------

const fillerRng = createRng(2026717);
const FILLER_COUNT = 180;
const FILLER_SELLER_COUNT = 41; // seller-1 .. seller-41 (seller-0 é o vendedor de 14 anúncios)

const filler: Vehicle[] = Array.from({ length: FILLER_COUNT }, () => {
  const brand = pick(fillerRng, BRANDS);
  const model = pick(fillerRng, MODELS_BY_BRAND[brand]!);
  // A tabela FIPE do mock só cobre 2019-2024 (fipe.ts); fora disso é o caso
  // real de "sem match" — mantido raro (15%) para não dominar a fila de revisão.
  const modelYear = chance(fillerRng, 0.85) ? int(fillerRng, 2019, 2024) : int(fillerRng, 2016, 2026);
  const fipe = findFipePrice(brand, model, modelYear);
  const base = fipe?.valueCents ?? 9_000_000;
  const discountFactor = 0.75 + fillerRng() * 0.35; // entre 25% abaixo e 10% acima da FIPE
  const priceCents = Math.round((base * discountFactor) / 100) * 100;
  const { city, state } = pick(fillerRng, CITIES);
  const daysListed = int(fillerRng, 1, 120);
  const dropCount = chance(fillerRng, 0.35) ? int(fillerRng, 1, 4) : 0;
  const priceSeries = Array.from({ length: dropCount + 1 }, (_, i) =>
    Math.round((priceCents * (1 + (dropCount - i) * 0.025)) / 100) * 100,
  );
  const compatibleCustomers = chance(fillerRng, 0.15) ? int(fillerRng, 1, 2) : 0;
  const stateRoll = fillerRng();
  const state_: VehicleState =
    stateRoll < 0.55 ? "new" :
    stateRoll < 0.7 ? "analyzing" :
    stateRoll < 0.8 ? "interested" :
    stateRoll < 0.88 ? "contacted" :
    stateRoll < 0.93 ? "negotiating" :
    stateRoll < 0.97 ? "lost" : "discarded";

  return buildVehicle({
    sellerId: `seller-${int(fillerRng, 1, FILLER_SELLER_COUNT)}`,
    daysListed,
    state: state_,
    discardReason: state_ === "discarded" ? pick(fillerRng, DISCARD_REASONS) : null,
    compatibleCustomers,
    kmVsAveragePct: int(fillerRng, -30, 30),
    priceDropCentsSeries: priceSeries,
    priceDropDaysSpan: daysListed,
    listings: [
      {
        source: pick(fillerRng, ["shopcar", "shopcar", "shopcar", "webmotors", "olx"]),
        brand,
        model,
        modelYear,
        manufactureYear: chance(fillerRng, 0.5) ? modelYear - 1 : modelYear,
        km: chance(fillerRng, 0.95) ? int(fillerRng, 5_000, 140_000) : null,
        priceCents,
        transmission: pick(fillerRng, ["MANUAL", "MANUAL", "AUTOMATICO", "AUTOMATIZADO"] as const),
        color: pick(fillerRng, COLORS),
        city,
        state,
        daysAgo: daysListed,
      },
    ],
  });
});

export const VEHICLES: Vehicle[] = [...scenarios, ...heavySeller, ...filler];

export function vehicleById(id: number): Vehicle | undefined {
  return VEHICLES.find((v) => v.id === id);
}

export function primaryListing(vehicle: Vehicle): Listing {
  return vehicle.listings.find((l) => l.id === vehicle.primaryListingId) ?? vehicle.listings[0]!;
}

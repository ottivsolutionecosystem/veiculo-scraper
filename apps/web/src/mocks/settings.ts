import type { Settings } from "@veiculo/types";

export const SETTINGS: Settings = {
  weights: [
    { key: "fipe_discount", label: "Desconto vs FIPE", weight: 0.28 },
    { key: "days_listed", label: "Dias no ar", weight: 0.12 },
    { key: "price_drops", label: "Quedas de preço", weight: 0.1 },
    { key: "model_liquidity", label: "Liquidez do modelo", weight: 0.1 },
    { key: "km_vs_average", label: "Km vs média do ano", weight: 0.1 },
    { key: "completeness", label: "Completude", weight: 0.08 },
    { key: "internal_demand", label: "Demanda interna", weight: 0.22 },
  ],
  bandThresholds: { hot: 80, good: 60, warm: 40 },
  discardReasons: [
    "Preço fora da faixa",
    "Vendedor sem resposta",
    "Veículo já vendido",
    "Sinistro declarado",
    "Documentação irregular",
    "Duplicidade confirmada",
  ],
  returnTriggerPricePct: 7,
  returnTriggerDays: 30,
  sellerCooldownHours: 24,
  followUpDays: [2, 7],
  kmCurve: [
    { modelYear: 2018, averageKm: 95_000 },
    { modelYear: 2019, averageKm: 82_000 },
    { modelYear: 2020, averageKm: 68_000 },
    { modelYear: 2021, averageKm: 55_000 },
    { modelYear: 2022, averageKm: 42_000 },
    { modelYear: 2023, averageKm: 28_000 },
    { modelYear: 2024, averageKm: 14_000 },
    { modelYear: 2025, averageKm: 6_000 },
  ],
  whatsappTemplate:
    "Olá! Vi o anúncio do seu {{modelo}} {{ano}} por {{preco}} ({{desconto_fipe}} abaixo da FIPE). " +
    "Ainda está disponível? Tenho interesse em avaliar para compra.",
  allowedHoursStart: "08:00",
  allowedHoursEnd: "20:00",
};

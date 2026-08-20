/** Catálogo e PRNG determinístico do seed — mesma técnica da Fase 1
 * (apps/web/src/mocks), reescrita aqui porque o seed roda em Node contra
 * Postgres real, não no browser. */

export function createRng(seed: number) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) throw new Error("pick: array vazio");
  return item;
}

export function int(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function chance(rng: () => number, probability: number): boolean {
  return rng() < probability;
}

export const MODELS_BY_BRAND: Record<string, string[]> = {
  VOLKSWAGEN: ["GOL", "POLO", "VIRTUS", "T-CROSS", "NIVUS", "SAVEIRO", "VOYAGE", "JETTA"],
  CHEVROLET: ["ONIX", "PRISMA", "TRACKER", "S10", "CRUZE", "SPIN", "MONTANA"],
  FIAT: ["STRADA", "TORO", "ARGO", "MOBI", "CRONOS", "PULSE", "UNO", "PALIO", "FASTBACK"],
  FORD: ["KA", "RANGER", "ECOSPORT", "FIESTA"],
  TOYOTA: ["COROLLA", "HILUX", "YARIS", "COROLLA CROSS", "ETIOS", "SW4"],
  HONDA: ["CIVIC", "HR-V", "FIT", "CITY", "WR-V"],
  HYUNDAI: ["HB20", "CRETA", "TUCSON"],
  RENAULT: ["KWID", "SANDERO", "DUSTER", "LOGAN", "OROCH"],
  NISSAN: ["KICKS", "FRONTIER", "VERSA"],
  JEEP: ["COMPASS", "RENEGADE", "COMMANDER"],
  MITSUBISHI: ["L200", "PAJERO"],
};
export const BRANDS = Object.keys(MODELS_BY_BRAND);

export const CITIES = [
  { city: "Campo Grande", state: "MS" },
  { city: "Dourados", state: "MS" },
  { city: "Três Lagoas", state: "MS" },
  { city: "Corumbá", state: "MS" },
  { city: "Ponta Porã", state: "MS" },
  { city: "São Paulo", state: "SP" },
  { city: "Curitiba", state: "PR" },
  { city: "Cuiabá", state: "MT" },
];

export const COLORS = ["BRANCO", "PRATA", "PRETO", "CINZA", "VERMELHO", "AZUL"];

const COLOR_HEX: Record<string, string> = {
  BRANCO: "e8e8e8",
  PRATA: "b0b4b8",
  PRETO: "2a2a2a",
  CINZA: "7a7f85",
  VERMELHO: "b42318",
  AZUL: "1d4ed8",
};

/** SVG em data URI — o seed não baixa foto de rede (CLAUDE.md). */
export function placeholderPhotos(brand: string, model: string, color: string, count: number): string[] {
  const hex = COLOR_HEX[color] ?? "64748b";
  const fg = color === "BRANCO" || color === "PRATA" ? "1e293b" : "ffffff";
  return Array.from({ length: count }, (_, i) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#${hex}"/><text x="320" y="190" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#${fg}">${brand} ${model}</text><text x="320" y="230" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#${fg}" opacity=".8">${color} · foto ${i + 1}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  });
}
export const DISCARD_REASONS = [
  "Preço fora da faixa",
  "Vendedor sem resposta",
  "Veículo já vendido",
  "Sinistro declarado",
  "Documentação irregular",
  "Duplicidade confirmada",
];

export const SELLER_NAMES = [
  "Revenda Show de Carros", "Auto Show Multimarcas", "Carlos Eduardo Silva",
  "João Batista Pereira", "Multicar Veículos", "Maria Aparecida Souza",
  "Garagem do Zé", "Roberto Nunes", "Auto Pátio MS", "Fernanda Lima",
  "Troca Fácil Veículos", "Antônio Carlos Ramos", "Bela Vista Automóveis",
  "Paulo Henrique Costa", "Rota 262 Veículos", "Sandra Regina Alves",
  "Marcos Vinícius Teixeira", "Vitrine Automotiva Dourados", "Lucas Gabriel Martins",
  "Auto Elite Pantanal", "Renata Cristina Gomes", "Diego Fernandes",
  "Garagem Central", "José Roberto Dias", "Multimarcas Sul",
  "Ana Paula Rodrigues", "Big Motors MS", "Eduardo Barbosa",
  "Feirão do Cerrado", "Cláudio Roberto Lima", "Vitória Automóveis",
  "Ricardo Almeida", "Show Room Veículos", "Patrícia Nogueira",
  "Auto Negócios MS", "Bruno Cesar Farias", "Central de Veículos Dourados",
  "Simone Cristina Rocha", "Kaique Vitor Moreira", "Garagem Boa Vista",
  "Tiago Henrique Batista", "Multicenter Automóveis",
];

const DIESEL_MODELS = new Set(["RANGER", "HILUX", "S10", "L200", "SW4", "COMMANDER", "TORO"]);
export function fuelFor(model: string): string {
  return DIESEL_MODELS.has(model) ? "DIESEL" : "FLEX";
}

export const BASE_PRICE_CENTS: Record<string, number> = {
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

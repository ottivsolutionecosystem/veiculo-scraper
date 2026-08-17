import type { Customer, Interest } from "@veiculo/types";
import { createRng, chance, int, pick } from "./rng";
import { BRANDS, MODELS_BY_BRAND, CITIES } from "./catalog";

const rng = createRng(151515);

const CUSTOMER_NAMES = [
  "Gabriel Henrique Souza", "Larissa Fernandes", "Rodrigo Alves Martins",
  "Juliana Cristina Pinto", "Felipe Augusto Ribeiro", "Beatriz Almeida",
  "Thiago Nascimento", "Amanda Carvalho", "Leonardo Vieira Costa",
  "Isabela Moraes", "Vinícius Rocha", "Letícia Barros",
  "André Luiz Fonseca", "Priscila Gomes", "Rafael Duarte Melo",
];

const ORIGINS = ["Indicação", "Instagram", "Loja física", "WhatsApp", "Site"];
const OWNERS = ["Ana Ferreira", "Bruno Castro", "Camila Duarte"];

export const CUSTOMERS: Customer[] = CUSTOMER_NAMES.map((name, idx) => ({
  id: `customer-${idx + 1}`,
  name,
  contact: `(67) 9${8000 + idx * 37}-${1000 + idx * 71}`,
  source: pick(rng, ORIGINS),
  owner: pick(rng, OWNERS),
  notes: chance(rng, 0.3) ? "Prefere contato por WhatsApp após 18h." : null,
  createdAt: new Date(Date.UTC(2026, 6, 1 + idx)).toISOString(),
}));

// Interesses — cliente 1 tem 2 interesses; os demais, 1. O último interesse
// (customer-15) é deliberadamente estreito para não casar com nenhum veículo
// do mock (caso de borda "cliente com interesse sem nenhum match").
export const INTERESTS: Interest[] = [
  {
    id: "interest-1a",
    customerId: "customer-1",
    brand: "HONDA",
    model: "HR-V",
    yearMin: 2021,
    yearMax: 2024,
    maxKm: 40_000,
    priceMinCents: null,
    priceMaxCents: 15_500_000,
    transmission: "AUTOMATICO",
    city: "Campo Grande",
    priority: "high",
    validUntil: new Date(Date.UTC(2026, 9, 1)).toISOString(),
    status: "active",
  },
  {
    id: "interest-1b",
    customerId: "customer-1",
    brand: "TOYOTA",
    model: "COROLLA CROSS",
    yearMin: 2022,
    yearMax: null,
    maxKm: 50_000,
    priceMinCents: null,
    priceMaxCents: 18_000_000,
    transmission: null,
    city: null,
    priority: "medium",
    validUntil: null,
    status: "active",
  },
  ...CUSTOMER_NAMES.slice(1, 14).map((_, i) => {
    const idx = i + 1; // customer-2 .. customer-14
    const brand = pick(rng, BRANDS);
    const model = pick(rng, MODELS_BY_BRAND[brand]!);
    const { city } = pick(rng, CITIES);
    const priceMax = int(rng, 60, 220) * 100_000;
    const interest: Interest = {
      id: `interest-${idx + 1}`,
      customerId: `customer-${idx + 1}`,
      brand,
      model,
      yearMin: int(rng, 2016, 2021),
      yearMax: int(rng, 2022, 2025),
      maxKm: int(rng, 40, 150) * 1000,
      priceMinCents: null,
      priceMaxCents: priceMax,
      transmission: chance(rng, 0.5) ? "AUTOMATICO" : null,
      city: chance(rng, 0.6) ? city : null,
      priority: pick(rng, ["high", "medium", "low"] as const),
      validUntil: null,
      status: "active",
    };
    return interest;
  }),
  {
    id: "interest-15",
    customerId: "customer-15",
    brand: "MITSUBISHI",
    model: "PAJERO",
    yearMin: 2024,
    yearMax: 2025,
    maxKm: 5_000,
    priceMinCents: null,
    priceMaxCents: 20_000_000, // bem abaixo da FIPE de um Pajero — não casa com nada
    transmission: "AUTOMATICO",
    city: "Ponta Porã",
    priority: "low",
    validUntil: new Date(Date.UTC(2026, 8, 30)).toISOString(),
    status: "active",
  },
];

export function interestsByCustomer(customerId: string): Interest[] {
  return INTERESTS.filter((i) => i.customerId === customerId);
}

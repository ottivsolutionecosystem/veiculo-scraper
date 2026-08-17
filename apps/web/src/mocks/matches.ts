import type { InterestMatch } from "@veiculo/types";
import { INTERESTS } from "./customers";
import { VEHICLES } from "./vehicles";
import { createRng, chance, int } from "./rng";

const rng = createRng(424242);

// interest-15 (customer-15) fica de fora de propósito — caso de borda
// "cliente com interesse sem nenhum match".
const MATCHABLE_INTERESTS = INTERESTS.filter((i) => i.id !== "interest-15");

let nextId = 1;
function makeMatch(interestId: string, vehicleId: number, matchScore: number): InterestMatch {
  return {
    id: `match-${nextId++}`,
    interestId,
    vehicleId,
    matchScore,
    state: chance(rng, 0.2) ? "accepted" : "suggested",
    createdAt: new Date(Date.UTC(2026, 7, 10 + (nextId % 7))).toISOString(),
  };
}

const explicit: InterestMatch[] = [
  // Veículo 11 (Honda HR-V) — 3 clientes compatíveis.
  makeMatch("interest-1a", 11, 92),
  makeMatch(MATCHABLE_INTERESTS[2]!.id, 11, 81),
  makeMatch(MATCHABLE_INTERESTS[4]!.id, 11, 76),
  // Veículo 4 (Onix triplicado) — 1 cliente compatível.
  makeMatch(MATCHABLE_INTERESTS[6]!.id, 4, 70),
];

// Casamentos adicionais por marca/modelo, para as fichas de veículo e a tela
// de clientes não ficarem vazias fora dos cenários explícitos.
const additional: InterestMatch[] = [];
for (const interest of MATCHABLE_INTERESTS) {
  if (!chance(rng, 0.5)) continue;
  const candidates = VEHICLES.filter(
    (v) => v.listings.some((l) => l.brand === interest.brand && l.model === interest.model) && v.state !== "discarded",
  );
  if (candidates.length === 0) continue;
  const vehicle = candidates[int(rng, 0, candidates.length - 1)]!;
  additional.push(makeMatch(interest.id, vehicle.id, int(rng, 55, 95)));
}

export const INTEREST_MATCHES: InterestMatch[] = [...explicit, ...additional];

export function matchesByVehicle(vehicleId: number): InterestMatch[] {
  return INTEREST_MATCHES.filter((m) => m.vehicleId === vehicleId);
}

export function matchesByInterest(interestId: string): InterestMatch[] {
  return INTEREST_MATCHES.filter((m) => m.interestId === interestId);
}

import type { Seller } from "@veiculo/types";
import { SELLER_NAMES } from "./catalog";
import { VEHICLES } from "./vehicles";
import { createRng, chance } from "./rng";

const rng = createRng(998877);

function countListingsBySeller(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const vehicle of VEHICLES) {
    if (!vehicle.sellerId) continue;
    counts.set(vehicle.sellerId, (counts.get(vehicle.sellerId) ?? 0) + 1);
  }
  return counts;
}

function maskedPhone(seed: number): string {
  const ddd = 67;
  const last4 = String(1000 + ((seed * 7919) % 9000));
  return `(${ddd}) 9****-${last4}`;
}

const counts = countListingsBySeller();

export const SELLERS: Seller[] = SELLER_NAMES.map((name, idx) => {
  const id = `seller-${idx}`;
  return {
    id,
    name,
    maskedPhone: maskedPhone(idx * 37 + 11),
    totalListings: counts.get(id) ?? 0,
    muted: chance(rng, 0.08),
    doNotDisturb: chance(rng, 0.12),
    lastContactedAt: chance(rng, 0.4) ? new Date(Date.UTC(2026, 7, 17 - Math.floor(rng() * 30))).toISOString() : null,
  };
}).filter((seller) => seller.totalListings > 0);

export function sellerById(id: string): Seller | undefined {
  return SELLERS.find((s) => s.id === id);
}

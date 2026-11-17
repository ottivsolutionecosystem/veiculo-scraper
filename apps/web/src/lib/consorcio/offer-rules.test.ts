import { describe, expect, it } from "vitest";

import type { ConsorcioOffer } from "@veiculo/types";

import { canListOffer, missingRequiredPhotos, offerProgressPct } from "./offer-rules";

function base(): ConsorcioOffer {
  return {
    id: "1",
    publicToken: "tok",
    status: "draft",
    plate: "ABC1D23",
    brand: null,
    model: null,
    modelYear: null,
    color: null,
    km: null,
    fipe: {
      code: "005329-5",
      brand: "VW",
      model: "Amarok",
      modelYear: 2013,
      fuel: "Diesel",
      priceCents: 7268500,
      referenceMonth: "novembro de 2026",
      vehicleType: "carros",
    },
    bidCents: 5000000,
    tires: {
      frontLeft: "good",
      frontRight: "good",
      rearLeft: "fair",
      rearRight: "fair",
      notes: null,
    },
    photos: [],
    ownerName: null,
    ownerPhone: null,
    notes: null,
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    listedAt: null,
    proposals: [],
  };
}

describe("offer-rules", () => {
  it("exige as 6 fotos pra listar", () => {
    const o = base();
    expect(canListOffer(o)).toBe(false);
    expect(missingRequiredPhotos(o)).toHaveLength(6);
  });

  it("mede progresso parcial", () => {
    expect(offerProgressPct(base())).toBe(75);
  });
});

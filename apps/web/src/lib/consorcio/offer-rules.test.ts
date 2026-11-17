import { describe, expect, it } from "vitest";

import type { ConsorcioOffer } from "@veiculo/types";

import { canListOffer, missingRequiredPhotos, offerChecklist, offerProgressPct } from "./offer-rules";

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
    financed: false,
    payoffCents: null,
    hasDamage: false,
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
  it("lista os 7 passos do progresso", () => {
    expect(offerChecklist(base()).map((s) => s.key)).toEqual([
      "plate",
      "fipe",
      "bid",
      "finance",
      "tires",
      "photos",
      "damage",
    ]);
  });

  it("exige as 6 fotos pra listar", () => {
    const o = base();
    expect(canListOffer(o)).toBe(false);
    expect(missingRequiredPhotos(o)).toHaveLength(6);
  });

  it("exige quitação quando financiado", () => {
    const o = {
      ...base(),
      financed: true,
      payoffCents: null,
      photos: (["front", "rear", "side_right", "side_left", "dashboard", "odometer"] as const).map(
        (slot) => ({
          id: slot,
          slot,
          url: "data:image/jpeg;base64,xx",
          caption: null,
          createdAt: new Date().toISOString(),
        }),
      ),
    };
    expect(canListOffer(o)).toBe(false);
    expect(canListOffer({ ...o, payoffCents: 12_000_00 })).toBe(true);
  });

  it("mede progresso parcial", () => {
    // placa + fipe + lance + financiamento + pneus + avarias = 6/7; fotos faltando
    expect(offerProgressPct(base())).toBe(86);
  });
});

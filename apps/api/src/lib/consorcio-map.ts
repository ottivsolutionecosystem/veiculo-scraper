import type {
  ConsorcioDealerProposal,
  ConsorcioFipeSelection,
  ConsorcioOffer,
  ConsorcioOfferStatus,
  ConsorcioPhoto,
  ConsorcioTireReport,
} from "@veiculo/types";

import { deriveStatus } from "./consorcio-rules.js";

const EMPTY_TIRES: ConsorcioTireReport = {
  frontLeft: "unknown",
  frontRight: "unknown",
  rearLeft: "unknown",
  rearRight: "unknown",
  notes: null,
};

export function mapConsorcioRow(row: Record<string, unknown>): ConsorcioOffer {
  const offer: ConsorcioOffer = {
    id: String(row.id),
    publicToken: String(row.public_token),
    status: row.status as ConsorcioOfferStatus,
    plate: String(row.plate ?? ""),
    brand: (row.brand as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    modelYear: row.model_year === null || row.model_year === undefined ? null : Number(row.model_year),
    color: (row.color as string | null) ?? null,
    km: row.km === null || row.km === undefined ? null : Number(row.km),
    fipe: (row.fipe as ConsorcioFipeSelection | null) ?? null,
    bidCents: row.bid_cents === null || row.bid_cents === undefined ? null : Number(row.bid_cents),
    financed: row.financed === null || row.financed === undefined ? null : Boolean(row.financed),
    payoffCents:
      row.payoff_cents === null || row.payoff_cents === undefined ? null : Number(row.payoff_cents),
    tires: (row.tires as ConsorcioTireReport) ?? EMPTY_TIRES,
    photos: (row.photos as ConsorcioPhoto[]) ?? [],
    ownerName: (row.owner_name as string | null) ?? null,
    ownerPhone: (row.owner_phone as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    listedAt: row.listed_at ? new Date(String(row.listed_at)).toISOString() : null,
    proposals: (row.proposals as ConsorcioDealerProposal[]) ?? [],
  };
  offer.status = deriveStatus(offer);
  return offer;
}

export { EMPTY_TIRES };

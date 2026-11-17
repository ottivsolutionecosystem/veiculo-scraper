import type { ConsorcioOffer, ConsorcioRequiredPhotoSlot } from "@veiculo/types";

import { REQUIRED_PHOTO_SLOTS } from "./labels";

export function missingRequiredPhotos(offer: ConsorcioOffer): ConsorcioRequiredPhotoSlot[] {
  const have = new Set(
    offer.photos.filter((p) => p.slot !== "damage").map((p) => p.slot as ConsorcioRequiredPhotoSlot),
  );
  return REQUIRED_PHOTO_SLOTS.filter((s) => !have.has(s));
}

export function damagePhotoCount(offer: ConsorcioOffer): number {
  return offer.photos.filter((p) => p.slot === "damage").length;
}

/** Pronto pra vitrine: placa, FIPE, lance, 6 fotos obrigatórias. */
export function canListOffer(offer: ConsorcioOffer): boolean {
  return (
    Boolean(offer.plate) &&
    Boolean(offer.fipe?.code) &&
    offer.bidCents !== null &&
    offer.bidCents > 0 &&
    missingRequiredPhotos(offer).length === 0
  );
}

export function deriveStatus(offer: ConsorcioOffer): ConsorcioOffer["status"] {
  if (offer.status === "closed") return "closed";
  if (offer.proposals.length > 0) return "proposed";
  if (offer.listedAt) return "listed";
  if (canListOffer(offer)) return "ready";
  if (offer.photos.length > 0 || offer.plate) return "awaiting_photos";
  return "draft";
}

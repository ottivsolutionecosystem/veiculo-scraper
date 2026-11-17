import type { ConsorcioOffer, ConsorcioRequiredPhotoSlot, ConsorcioTireReport } from "@veiculo/types";

const REQUIRED: ConsorcioRequiredPhotoSlot[] = [
  "front",
  "rear",
  "side_right",
  "side_left",
  "dashboard",
  "odometer",
];

export function missingRequiredPhotos(offer: ConsorcioOffer): ConsorcioRequiredPhotoSlot[] {
  const have = new Set(
    offer.photos.filter((p) => p.slot !== "damage").map((p) => p.slot as ConsorcioRequiredPhotoSlot),
  );
  return REQUIRED.filter((s) => !have.has(s));
}

function financeOk(offer: ConsorcioOffer): boolean {
  if (offer.financed === false) return true;
  if (offer.financed === true) {
    return offer.payoffCents !== null && offer.payoffCents > 0;
  }
  return false;
}

function tiresOk(tires: ConsorcioTireReport): boolean {
  return (
    tires.frontLeft !== "unknown" &&
    tires.frontRight !== "unknown" &&
    tires.rearLeft !== "unknown" &&
    tires.rearRight !== "unknown"
  );
}

function damageOk(offer: ConsorcioOffer): boolean {
  if (offer.hasDamage === false) return true;
  if (offer.hasDamage === true) {
    return offer.photos.some((p) => p.slot === "damage");
  }
  return false;
}

export function canListOffer(offer: ConsorcioOffer): boolean {
  return (
    Boolean(offer.plate) &&
    Boolean(offer.fipe?.code) &&
    offer.bidCents !== null &&
    offer.bidCents > 0 &&
    financeOk(offer) &&
    tiresOk(offer.tires) &&
    damageOk(offer) &&
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

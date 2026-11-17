import type {
  ConsorcioDealerProposal,
  ConsorcioOffer,
  ConsorcioPhoto,
  ConsorcioTireReport,
} from "@veiculo/types";

import { deriveStatus } from "./offer-rules";
import { normalizePlate } from "./plate";

const KEY = "ottiv-consorcio-offers-v1";

function emptyTires(): ConsorcioTireReport {
  return {
    frontLeft: "unknown",
    frontRight: "unknown",
    rearLeft: "unknown",
    rearRight: "unknown",
    notes: null,
  };
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readAll(): ConsorcioOffer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConsorcioOffer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: ConsorcioOffer[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listOffers(): ConsorcioOffer[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listListedOffers(): ConsorcioOffer[] {
  return listOffers().filter((o) => o.status === "listed" || o.status === "proposed");
}

export function getOffer(id: string): ConsorcioOffer | null {
  return readAll().find((o) => o.id === id) ?? null;
}

export function getOfferByToken(token: string): ConsorcioOffer | null {
  return readAll().find((o) => o.publicToken === token) ?? null;
}

export function createOffer(partial?: Partial<ConsorcioOffer>): ConsorcioOffer {
  const now = new Date().toISOString();
  const offer: ConsorcioOffer = {
    id: uid(),
    publicToken: uid(),
    status: "draft",
    plate: "",
    brand: null,
    model: null,
    modelYear: null,
    color: null,
    km: null,
    fipe: null,
    bidCents: null,
    tires: emptyTires(),
    photos: [],
    ownerName: null,
    ownerPhone: null,
    notes: null,
    createdBy: null,
    createdAt: now,
    updatedAt: now,
    listedAt: null,
    proposals: [],
    ...partial,
  };
  offer.status = deriveStatus(offer);
  const all = readAll();
  all.unshift(offer);
  writeAll(all);
  return offer;
}

export function updateOffer(
  id: string,
  patch: Partial<ConsorcioOffer> | ((o: ConsorcioOffer) => ConsorcioOffer),
): ConsorcioOffer | null {
  const all = readAll();
  const idx = all.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  const current = all[idx]!;
  const next =
    typeof patch === "function"
      ? patch(current)
      : {
          ...current,
          ...patch,
          plate: patch.plate !== undefined ? normalizePlate(patch.plate) : current.plate,
          updatedAt: new Date().toISOString(),
        };
  next.status = deriveStatus(next);
  all[idx] = next;
  writeAll(all);
  return next;
}

export function upsertPhoto(
  id: string,
  photo: Omit<ConsorcioPhoto, "id" | "createdAt"> & { id?: string },
): ConsorcioOffer | null {
  return updateOffer(id, (o) => {
    const photos = [...o.photos];
    if (photo.slot !== "damage") {
      const i = photos.findIndex((p) => p.slot === photo.slot);
      const row: ConsorcioPhoto = {
        id: photo.id ?? uid(),
        slot: photo.slot,
        url: photo.url,
        caption: photo.caption ?? null,
        createdAt: new Date().toISOString(),
      };
      if (i >= 0) photos[i] = row;
      else photos.push(row);
    } else {
      photos.push({
        id: photo.id ?? uid(),
        slot: "damage",
        url: photo.url,
        caption: photo.caption ?? null,
        createdAt: new Date().toISOString(),
      });
    }
    return { ...o, photos, updatedAt: new Date().toISOString() };
  });
}

export function removePhoto(id: string, photoId: string): ConsorcioOffer | null {
  return updateOffer(id, (o) => ({
    ...o,
    photos: o.photos.filter((p) => p.id !== photoId),
    updatedAt: new Date().toISOString(),
  }));
}

export function listOffer(id: string): ConsorcioOffer | null {
  return updateOffer(id, (o) => ({
    ...o,
    listedAt: o.listedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

export function addProposal(
  id: string,
  input: { dealerName: string; amountCents: number; notes?: string },
): ConsorcioOffer | null {
  const proposal: ConsorcioDealerProposal = {
    id: uid(),
    dealerName: input.dealerName.trim() || "Lojista",
    amountCents: input.amountCents,
    notes: input.notes?.trim() || null,
    createdAt: new Date().toISOString(),
  };
  return updateOffer(id, (o) => ({
    ...o,
    proposals: [proposal, ...o.proposals],
    updatedAt: new Date().toISOString(),
  }));
}

export function deleteOffer(id: string): void {
  writeAll(readAll().filter((o) => o.id !== id));
}

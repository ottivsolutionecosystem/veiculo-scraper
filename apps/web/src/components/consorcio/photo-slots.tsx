"use client";

import * as React from "react";
import { Camera, Trash2 } from "lucide-react";

import type { ConsorcioOffer, ConsorcioPhoto, ConsorcioRequiredPhotoSlot } from "@veiculo/types";
import { Button } from "@/components/ui/button";
import { MAX_DAMAGE_PHOTOS, REQUIRED_PHOTO_LABEL, REQUIRED_PHOTO_SLOTS } from "@/lib/consorcio/labels";
import { fileToDataUrl } from "@/lib/consorcio/photo-file";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function withRequiredPhoto(
  photos: ConsorcioPhoto[],
  slot: ConsorcioRequiredPhotoSlot,
  url: string,
): ConsorcioPhoto[] {
  const row: ConsorcioPhoto = {
    id: uid(),
    slot,
    url,
    caption: null,
    createdAt: new Date().toISOString(),
  };
  const i = photos.findIndex((p) => p.slot === slot);
  if (i >= 0) {
    const next = [...photos];
    next[i] = row;
    return next;
  }
  return [...photos, row];
}

export function PhotoSlots({
  offer,
  onChange,
}: {
  offer: ConsorcioOffer;
  onChange: (next: ConsorcioOffer) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);

  async function addRequired(slot: ConsorcioRequiredPhotoSlot, file: File) {
    setError(null);
    try {
      const url = await fileToDataUrl(file);
      onChange({ ...offer, photos: withRequiredPhoto(offer.photos, slot, url) });
    } catch {
      setError("Não deu pra ler a foto.");
    }
  }

  async function addDamage(file: File) {
    const count = offer.photos.filter((p) => p.slot === "damage").length;
    if (count >= MAX_DAMAGE_PHOTOS) {
      setError(`No máximo ${MAX_DAMAGE_PHOTOS} fotos de avaria.`);
      return;
    }
    setError(null);
    try {
      const url = await fileToDataUrl(file);
      onChange({
        ...offer,
        photos: [
          ...offer.photos,
          {
            id: uid(),
            slot: "damage",
            url,
            caption: null,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    } catch {
      setError("Não deu pra ler a foto.");
    }
  }

  function remove(photoId: string) {
    onChange({ ...offer, photos: offer.photos.filter((p) => p.id !== photoId) });
  }

  const damage = offer.photos.filter((p) => p.slot === "damage");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REQUIRED_PHOTO_SLOTS.map((slot) => {
          const photo = offer.photos.find((p) => p.slot === slot);
          return (
            <SlotCard
              key={slot}
              title={REQUIRED_PHOTO_LABEL[slot]}
              url={photo?.url}
              onFile={(f) => void addRequired(slot, f)}
              onClear={photo ? () => remove(photo.id) : undefined}
            />
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-navy">
            Avarias ({damage.length}/{MAX_DAMAGE_PHOTOS})
          </p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-primary">
            <Camera className="h-4 w-4" />
            Adicionar
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void addDamage(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {damage.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma avaria fotografada.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {damage.map((p) => (
              <div key={p.id} className="relative overflow-hidden rounded-xl border border-navy/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                  onClick={() => remove(p.id)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SlotCard({
  title,
  url,
  onFile,
  onClear,
}: {
  title: string;
  url?: string;
  onFile: (file: File) => void;
  onClear?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy/10 bg-card">
      <div className="aspect-[4/3] bg-navy/[0.03]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-navy/25">
            <Camera className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-2.5">
        <p className="min-w-0 truncate text-xs font-medium text-navy">{title}</p>
        <div className="flex shrink-0 gap-1">
          {onClear && (
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-input px-2 text-xs">
            {url ? "Trocar" : "Foto"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

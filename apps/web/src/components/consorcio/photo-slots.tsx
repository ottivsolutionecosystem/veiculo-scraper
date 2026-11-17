"use client";

import * as React from "react";
import { AlertTriangle, Camera, Trash2 } from "lucide-react";

import type { ConsorcioOffer, ConsorcioPhoto, ConsorcioRequiredPhotoSlot } from "@veiculo/types";
import { Button } from "@/components/ui/button";
import { MAX_DAMAGE_PHOTOS, REQUIRED_PHOTO_LABEL, REQUIRED_PHOTO_SLOTS } from "@/lib/consorcio/labels";
import { fileToDataUrl } from "@/lib/consorcio/photo-file";
import { cn } from "@/lib/utils";

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
  const damage = offer.photos.filter((p) => p.slot === "damage");
  const damageAnswer: boolean | null =
    offer.hasDamage === true || damage.length > 0 ? true : offer.hasDamage;

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
    if (damage.length >= MAX_DAMAGE_PHOTOS) {
      setError(`No máximo ${MAX_DAMAGE_PHOTOS} fotos de avaria.`);
      return;
    }
    setError(null);
    try {
      const url = await fileToDataUrl(file);
      onChange({
        ...offer,
        hasDamage: true,
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

  function chooseDamage(answer: boolean) {
    setError(null);
    if (!answer) {
      onChange({
        ...offer,
        hasDamage: false,
        photos: offer.photos.filter((p) => p.slot !== "damage"),
      });
      return;
    }
    onChange({ ...offer, hasDamage: true });
  }

  return (
    <div className="space-y-5">
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

      <div
        className={cn(
          "space-y-3 rounded-2xl border-2 p-4",
          damageAnswer === null
            ? "border-orange/50 bg-orange/[0.07]"
            : damageAnswer === true
              ? "border-coral/40 bg-coral/[0.06]"
              : "border-navy/10 bg-navy/[0.02]",
        )}
      >
        <div className="flex gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              damageAnswer === false ? "bg-navy/10 text-navy" : "bg-orange/15 text-orange",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold tracking-tight text-navy">
              O veículo tem algum detalhe?
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Batida, amassado, arranhão, retoque de pintura, para-choque riscado, porta amassada —
              qualquer marca conta. Responda com sinceridade: o lojista precisa ver antes de
              propor.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={damageAnswer === true ? "default" : "outline"}
            className="h-11 rounded-xl"
            onClick={() => chooseDamage(true)}
          >
            Sim, tem detalhe
          </Button>
          <Button
            type="button"
            variant={damageAnswer === false ? "default" : "outline"}
            className="h-11 rounded-xl"
            onClick={() => chooseDamage(false)}
          >
            Não, está limpo
          </Button>
        </div>

        {damageAnswer === null ? (
          <p className="rounded-xl border border-dashed border-orange/35 bg-background/70 px-3 py-2 text-xs font-medium text-navy">
            Toque em Sim ou Não — sem essa resposta a avaliação fica incompleta para o lojista.
          </p>
        ) : null}

        {damageAnswer === false ? (
          <p className="rounded-xl border border-navy/10 bg-background/80 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Declarado: sem batida, arranhão nem detalhe de pintura. Se lembrar de algo depois,
            volte e marque <span className="font-medium text-navy">Sim, tem detalhe</span>.
          </p>
        ) : null}

        {damageAnswer === true ? (
          <div className="space-y-3 border-t border-coral/20 pt-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-navy">
                Fotografe cada local ({damage.length}/{MAX_DAMAGE_PHOTOS})
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Uma foto por marca: aproxime bem o detalhe (arranhão, amassado, pintura). Quanto
                mais claro, melhor a proposta.
              </p>
            </div>

            <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-coral/45 bg-background/80 text-sm font-semibold text-coral transition-colors hover:bg-coral/[0.06]">
              <Camera className="h-4 w-4" />
              {damage.length === 0 ? "Adicionar foto do local" : "Adicionar outra foto"}
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

            {damage.length === 0 ? (
              <p className="text-xs font-medium text-coral">
                Ainda falta a foto do detalhe — sem ela o lojista não vê o estado real.
              </p>
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
        ) : null}
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

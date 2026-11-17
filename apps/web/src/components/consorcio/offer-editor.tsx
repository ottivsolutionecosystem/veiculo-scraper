"use client";

import * as React from "react";
import { Check, Copy, Loader2, Send, Store } from "lucide-react";

import type { ConsorcioOffer } from "@veiculo/types";
import { FipeCascade } from "@/components/consorcio/fipe-cascade";
import { PhotoSlots } from "@/components/consorcio/photo-slots";
import { TireFields } from "@/components/consorcio/tire-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCents } from "@/lib/format";
import { canListOffer, missingRequiredPhotos } from "@/lib/consorcio/offer-rules";
import { formatPlate, isValidPlate, normalizePlate } from "@/lib/consorcio/plate";
import { REQUIRED_PHOTO_LABEL } from "@/lib/consorcio/labels";

function parseMoneyToCents(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number.parseInt(digits, 10) * 100;
}

export function OfferEditor({
  offer,
  mode,
  busy = false,
  onChange,
  onPersist,
  onPublish,
  onSubmitPublic,
  publicUrl,
}: {
  offer: ConsorcioOffer;
  mode: "internal" | "public";
  busy?: boolean;
  onChange: (next: ConsorcioOffer) => void;
  onPersist: (patch: Partial<ConsorcioOffer>) => Promise<void> | void;
  onPublish?: () => Promise<void> | void;
  onSubmitPublic?: () => Promise<void> | void;
  publicUrl?: string;
}) {
  const [bidText, setBidText] = React.useState(
    offer.bidCents !== null ? String(Math.round(offer.bidCents / 100)) : "",
  );
  const [copied, setCopied] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    setBidText(offer.bidCents !== null ? String(Math.round(offer.bidCents / 100)) : "");
  }, [offer.id, offer.bidCents]);

  async function persist(patch: Partial<ConsorcioOffer>) {
    setMsg(null);
    await onPersist(patch);
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg("Não copiou — copie o link manualmente.");
    }
  }

  function incompleteMessage() {
    return [
      !offer.plate || !isValidPlate(offer.plate) ? "placa válida" : null,
      !offer.fipe ? "FIPE" : null,
      !offer.bidCents ? "lance" : null,
      ...missingRequiredPhotos(offer).map((s) => `foto ${REQUIRED_PHOTO_LABEL[s]}`),
    ]
      .filter(Boolean)
      .join(", ");
  }

  async function handlePublish() {
    if (!canListOffer(offer)) {
      setMsg(`Falta: ${incompleteMessage()}`);
      return;
    }
    await onPublish?.();
  }

  async function handleSubmitPublic() {
    if (!canListOffer(offer)) {
      setMsg(`Complete antes de enviar: ${incompleteMessage()}`);
      return;
    }
    await onSubmitPublic?.();
    setMsg("Avaliação enviada. O consignador já consegue ver tudo e liberar na vitrine.");
  }

  const readOnlyListed = offer.status === "listed" || offer.status === "proposed" || offer.status === "closed";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Placa e contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Placa</Label>
            <Input
              value={formatPlate(offer.plate)}
              disabled={readOnlyListed && mode === "public"}
              onChange={(e) => {
                const plate = normalizePlate(e.target.value);
                onChange({ ...offer, plate });
                void persist({ plate });
              }}
              placeholder="ABC1D23"
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Km (do velocímetro)</Label>
            <Input
              type="number"
              value={offer.km ?? ""}
              onChange={(e) => {
                const km = e.target.value ? Number.parseInt(e.target.value, 10) : null;
                onChange({ ...offer, km });
                void persist({ km });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Seu nome</Label>
            <Input
              value={offer.ownerName ?? ""}
              onChange={(e) => {
                const ownerName = e.target.value || null;
                onChange({ ...offer, ownerName });
                void persist({ ownerName });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone / WhatsApp</Label>
            <Input
              value={offer.ownerPhone ?? ""}
              onChange={(e) => {
                const ownerPhone = e.target.value || null;
                onChange({ ...offer, ownerPhone });
                void persist({ ownerPhone });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FIPE do veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Se aparecer mais de um ano/combustível, escolha o que bate com o seu carro.
          </p>
          <FipeCascade
            value={offer.fipe}
            onChange={(fipe) => {
              const patch = {
                fipe,
                brand: fipe?.brand ?? null,
                model: fipe?.model ?? null,
                modelYear: fipe?.modelYear ?? null,
              };
              onChange({ ...offer, ...patch });
              void persist(patch);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label>Quanto precisa receber (R$)</Label>
          <Input
            inputMode="numeric"
            value={bidText}
            onChange={(e) => {
              setBidText(e.target.value);
              const bidCents = parseMoneyToCents(e.target.value);
              onChange({ ...offer, bidCents });
              void persist({ bidCents });
            }}
            placeholder="45000"
          />
          <p className="text-xs text-muted-foreground">
            Gravado: {formatCents(offer.bidCents)}
            {offer.fipe && offer.bidCents !== null
              ? ` · ${(((offer.fipe.priceCents - offer.bidCents) / offer.fipe.priceCents) * 100).toFixed(1)}% vs FIPE`
              : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado dos pneus</CardTitle>
        </CardHeader>
        <CardContent>
          <TireFields
            value={offer.tires}
            onChange={(tires) => {
              onChange({ ...offer, tires });
              void persist({ tires });
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos do veículo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mode === "internal" && publicUrl && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-navy/15 bg-navy/[0.02] px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Link completo pro cliente fazer a avaliação:
              </span>
              <code className="truncate font-mono text-[11px] text-navy">{publicUrl}</code>
              <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          )}
          <PhotoSlots
            offer={offer}
            onChange={(next) => {
              onChange(next);
              void persist({ photos: next.photos });
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={offer.notes ?? ""}
            onChange={(e) => {
              const notes = e.target.value || null;
              onChange({ ...offer, notes });
              void persist({ notes });
            }}
            rows={3}
            placeholder="Opcional"
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {mode === "internal" && (
          <Button type="button" disabled={busy} onClick={() => void handlePublish()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
            Liberar na vitrine
          </Button>
        )}
        {mode === "public" && (
          <Button type="button" disabled={busy} onClick={() => void handleSubmitPublic()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar avaliação completa
          </Button>
        )}
      </div>
      {msg && <p className="text-sm text-navy">{msg}</p>}
    </div>
  );
}

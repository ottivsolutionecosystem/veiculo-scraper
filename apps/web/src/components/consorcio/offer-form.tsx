"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Store } from "lucide-react";

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
import { listOffer, updateOffer } from "@/lib/consorcio/store";

/** Interpreta o campo como reais inteiros → centavos. */
function parseMoneyToCents(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number.parseInt(digits, 10) * 100;
}

export function OfferForm({ initial }: { initial: ConsorcioOffer }) {
  const router = useRouter();
  const [offer, setOffer] = React.useState(initial);
  const [bidText, setBidText] = React.useState(
    initial.bidCents !== null ? String(Math.round(initial.bidCents / 100)) : "",
  );
  const [copied, setCopied] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/o/${offer.publicToken}`
      : `/o/${offer.publicToken}`;

  function persist(patch: Partial<ConsorcioOffer>) {
    const next = updateOffer(offer.id, patch);
    if (next) setOffer(next);
  }

  function savePlate(raw: string) {
    const plate = normalizePlate(raw);
    persist({
      plate,
      brand: offer.fipe?.brand ?? offer.brand,
      model: offer.fipe?.model ?? offer.model,
      modelYear: offer.fipe?.modelYear ?? offer.modelYear,
    });
  }

  function publish() {
    if (!canListOffer(offer)) {
      setMsg(
        `Falta: ${[
          !offer.plate || !isValidPlate(offer.plate) ? "placa válida" : null,
          !offer.fipe ? "FIPE" : null,
          !offer.bidCents ? "lance" : null,
          ...missingRequiredPhotos(offer).map((s) => `foto ${s}`),
        ]
          .filter(Boolean)
          .join(", ")}`,
      );
      return;
    }
    const next = listOffer(offer.id);
    if (next) {
      setOffer(next);
      setMsg("Liberado na vitrine do lojista.");
      router.push("/consorcio/vitrine");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg("Não copiou — copie o link manualmente.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-navy">Oferecimento</h2>
          <p className="text-sm text-muted-foreground">Placa, FIPE, fotos, pneus e lance.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/consorcio/oferecimentos">Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Placa e contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Placa</Label>
            <Input
              value={formatPlate(offer.plate)}
              onChange={(e) => savePlate(e.target.value)}
              placeholder="ABC1D23"
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Km (do velocímetro)</Label>
            <Input
              type="number"
              value={offer.km ?? ""}
              onChange={(e) =>
                persist({ km: e.target.value ? Number.parseInt(e.target.value, 10) : null })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nome do dono</Label>
            <Input
              value={offer.ownerName ?? ""}
              onChange={(e) => persist({ ownerName: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input
              value={offer.ownerPhone ?? ""}
              onChange={(e) => persist({ ownerPhone: e.target.value || null })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FIPE</CardTitle>
        </CardHeader>
        <CardContent>
          <FipeCascade
            value={offer.fipe}
            onChange={(fipe) =>
              persist({
                fipe,
                brand: fipe?.brand ?? null,
                model: fipe?.model ?? null,
                modelYear: fipe?.modelYear ?? null,
              })
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label>Quanto precisa (R$)</Label>
          <Input
            inputMode="numeric"
            value={bidText}
            onChange={(e) => {
              setBidText(e.target.value);
              persist({ bidCents: parseMoneyToCents(e.target.value) });
            }}
            placeholder="45000"
          />
          <p className="text-xs text-muted-foreground">
            Gravado: {formatCents(offer.bidCents)}
            {offer.fipe && offer.bidCents !== null
              ? ` · ${(((offer.fipe.priceCents - offer.bidCents) / offer.fipe.priceCents) * 100).toFixed(1)}% abaixo da FIPE`
              : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pneus</CardTitle>
        </CardHeader>
        <CardContent>
          <TireFields value={offer.tires} onChange={(tires) => persist({ tires })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-navy/15 bg-navy/[0.02] px-3 py-2 text-xs">
            <span className="text-muted-foreground">Link público pro cliente enviar fotos:</span>
            <code className="truncate font-mono text-[11px] text-navy">{publicUrl}</code>
            <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <PhotoSlots offer={offer} onChange={setOffer} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={offer.notes ?? ""}
            onChange={(e) => persist({ notes: e.target.value || null })}
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={publish}>
          <Store className="h-4 w-4" /> Liberar na vitrine
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/consorcio/vitrine">Ver vitrine</Link>
        </Button>
      </div>
      {msg && <p className="text-sm text-navy">{msg}</p>}
    </div>
  );
}

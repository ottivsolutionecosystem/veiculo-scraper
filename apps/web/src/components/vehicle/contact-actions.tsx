"use client";

import * as React from "react";
import { Eye, Loader2, MessageCircle, Phone } from "lucide-react";

import { ApiError, getSettings, revealSellerContact } from "@/lib/api";
import { CONTACT_BLOCK_MESSAGE, contactBlockReason } from "@/lib/contato";
import { fillWhatsappTemplate, templateFromSettings, whatsappHref } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

export function ContactActions({
  sellerId,
  maskedPhone,
  muted,
  doNotDisturb,
  hasPhone = true,
  listing,
}: {
  sellerId: number | null | undefined;
  maskedPhone?: string | null;
  muted?: boolean | null;
  doNotDisturb?: boolean | null;
  hasPhone?: boolean;
  listing?: {
    brand: string | null;
    model: string | null;
    year: number | null;
    priceCents: number | null;
    fipeDiscountPct: number | null;
  };
}) {
  const [phone, setPhone] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [template, setTemplate] = React.useState<string | null>(null);

  const block = contactBlockReason({
    muted,
    doNotDisturb,
    hasPhone: Boolean(sellerId) && hasPhone,
  });
  const blockedMsg = !sellerId ? "Sem vendedor neste anúncio." : block ? CONTACT_BLOCK_MESSAGE[block] : null;

  async function reveal() {
    if (!sellerId) return;
    setBusy(true);
    setError(null);
    try {
      const [revealed, settings] = await Promise.all([revealSellerContact(sellerId), getSettings()]);
      setPhone(revealed.phone);
      setTemplate(templateFromSettings(settings));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível revelar o contato.");
    } finally {
      setBusy(false);
    }
  }

  const message = fillWhatsappTemplate(template, {
    brand: listing?.brand ?? null,
    model: listing?.model ?? null,
    year: listing?.year ?? null,
    priceCents: listing?.priceCents ?? null,
    fipeDiscountPct: listing?.fipeDiscountPct ?? null,
  });

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{phone ? "Contato revelado nesta sessão." : maskedPhone || "sem telefone"}</p>
      {blockedMsg ? (
        <p className="text-sm text-destructive">{blockedMsg}</p>
      ) : !phone ? (
        <Button className="min-h-11 w-full" variant="outline" disabled={busy} onClick={() => void reveal()}>
          {busy ? <Loader2 className="animate-spin" /> : <Eye />}
          Revelar contato
        </Button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="min-h-11 flex-1" asChild>
            <a href={`tel:${phone}`}>
              <Phone /> Ligar
            </a>
          </Button>
          <Button className="min-h-11 flex-1" variant="outline" asChild>
            <a href={whatsappHref(phone, message)} target="_blank" rel="noreferrer">
              <MessageCircle /> WhatsApp
            </a>
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

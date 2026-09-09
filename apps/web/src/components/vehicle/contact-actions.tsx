"use client";

import * as React from "react";
import type { CallOutcome } from "@veiculo/types";
import { Eye, Loader2, MessageCircle, Phone } from "lucide-react";

import { ApiError, getSettings, postCall, revealSellerContact } from "@/lib/api";
import { CONTACT_BLOCK_MESSAGE, contactBlockReason, formatPhoneBR } from "@/lib/contato";
import { useCallSession } from "@/lib/use-call-session";
import { fillWhatsappTemplate, templateFromSettings, whatsappHref } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { OutcomeDialog } from "@/components/dialer/outcome-dialog";
import { InCallBar } from "@/components/vehicle/in-call-bar";

export function ContactActions({
  sellerId,
  vehicleId,
  maskedPhone,
  muted,
  doNotDisturb,
  hasPhone = true,
  listing,
}: {
  sellerId: number | null | undefined;
  vehicleId?: number | null;
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
  const [outcomeOpen, setOutcomeOpen] = React.useState(false);
  const call = useCallSession();

  const block = contactBlockReason({
    muted,
    doNotDisturb,
    hasPhone: Boolean(sellerId) && hasPhone,
  });
  const blockedMsg = !sellerId ? "Sem vendedor neste anúncio." : block ? CONTACT_BLOCK_MESSAGE[block] : null;

  React.useEffect(() => {
    if ((call.status === "ended" || call.status === "failed") && call.started) setOutcomeOpen(true);
  }, [call.status, call.started]);

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

  async function handleCall() {
    if (!vehicleId) {
      if (phone) window.location.href = `tel:${phone}`;
      return;
    }
    setError(null);
    try {
      const begun = await call.start(vehicleId);
      setPhone(begun.phone);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Não ligou.");
    }
  }

  async function handleOutcome(outcome: CallOutcome) {
    if (!vehicleId || !call.started) return;
    setBusy(true);
    try {
      await postCall(vehicleId, {
        outcome,
        durationSeconds: call.durationSeconds,
        interactionId: call.started.interactionId,
        channel: call.started.channel,
      });
      setOutcomeOpen(false);
      call.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não gravou o resultado.");
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

  const canDial = Boolean(vehicleId) || Boolean(phone);

  return (
    <div className="space-y-2">
      {phone ? (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="select-all font-semibold tabular-nums tracking-tight text-navy">
            {formatPhoneBR(phone)}
          </span>
          <span className="text-xs text-muted-foreground">revelado nesta sessão</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{maskedPhone || "sem telefone"}</p>
      )}
      {blockedMsg ? (
        <p className="text-sm text-destructive">{blockedMsg}</p>
      ) : call.inCall ? (
        <InCallBar status={call.status} durationSeconds={call.durationSeconds} onHangup={() => void call.hangup()} />
      ) : !phone && !vehicleId ? (
        <Button className="min-h-11 w-full" variant="outline" disabled={busy} onClick={() => void reveal()}>
          {busy ? <Loader2 className="animate-spin" /> : <Eye />}
          Revelar contato
        </Button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="min-h-11 flex-1" disabled={busy || !canDial} onClick={() => void handleCall()}>
            {busy ? <Loader2 className="animate-spin" /> : <Phone />} Ligar
          </Button>
          {phone ? (
            <Button className="min-h-11 flex-1" variant="outline" asChild>
              <a href={whatsappHref(phone, message)} target="_blank" rel="noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
          ) : (
            <Button className="min-h-11 flex-1" variant="outline" disabled={busy} onClick={() => void reveal()}>
              {busy ? <Loader2 className="animate-spin" /> : <Eye />}
              Revelar contato
            </Button>
          )}
        </div>
      )}
      {(error || call.error) && <p className="text-xs text-destructive">{error ?? call.error}</p>}
      <OutcomeDialog open={outcomeOpen} onChoose={handleOutcome} />
    </div>
  );
}

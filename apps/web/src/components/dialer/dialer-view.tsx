"use client";

import * as React from "react";
import type { CallOutcome } from "@veiculo/types";
import { Phone, ThumbsUp, XCircle, ArrowRight, ImageOff, Loader2 } from "lucide-react";

import type { Page, QueueItem } from "@/lib/api-types";
import { getDialerQueue, postCall, postInteraction, discardVehicle } from "@/lib/api";
import { useCallSession } from "@/lib/use-call-session";
import { InCallBar } from "@/components/vehicle/in-call-bar";
import { formatCents, formatKm, daysAgoLabel } from "@/lib/format";
import { CALL_OUTCOME_LABELS } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { OutcomeDialog } from "@/components/dialer/outcome-dialog";

export function DialerView({ initial }: { initial: Page<QueueItem> }) {
  const [items, setItems] = React.useState(initial.items);
  const [cursor, setCursor] = React.useState(initial.nextCursor);
  const [index, setIndex] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [lastOutcome, setLastOutcome] = React.useState<CallOutcome | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [callError, setCallError] = React.useState<string | null>(null);
  const call = useCallSession();

  const item = items[index];

  React.useEffect(() => {
    if ((call.status === "ended" || call.status === "failed") && call.started) setDialogOpen(true);
  }, [call.status, call.started]);

  React.useEffect(() => {
    if (index >= items.length - 3 && cursor && !busy) {
      getDialerQueue({ cursor, limit: 40 }).then((page) => {
        setItems((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, cursor]);

  const next = React.useCallback(() => {
    setLastOutcome(null);
    setIndex((i) => Math.min(i + 1, items.length));
  }, [items.length]);

  async function handleOutcome(outcome: CallOutcome) {
    if (!item) return;
    setBusy(true);
    try {
      await postCall(item.id, {
        outcome,
        durationSeconds: call.durationSeconds || undefined,
        interactionId: call.started?.interactionId,
        channel: call.started?.channel,
      });
      setLastOutcome(outcome);
      setDialogOpen(false);
      call.reset();
      setTimeout(next, 400);
    } finally {
      setBusy(false);
    }
  }

  async function handleCall() {
    if (!item || call.inCall) return;
    setCallError(null);
    try {
      await call.start(item.id);
    } catch (err) {
      setCallError(err instanceof Error ? err.message : "Não ligou.");
    }
  }

  async function handleInterest() {
    if (!item) return;
    setBusy(true);
    try {
      await postInteraction(item.id, { channel: "phone", outcome: "negotiating" });
      next();
    } finally {
      setBusy(false);
    }
  }

  async function handleDiscard() {
    if (!item) return;
    setBusy(true);
    try {
      await discardVehicle(item.id, "Vendedor sem resposta");
      next();
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (dialogOpen || !item || busy) return;
      if (e.key === "l" || e.key === "L") void handleCall();
      if (e.key === "d" || e.key === "D") void handleDiscard();
      if (e.key === "i" || e.key === "I") void handleInterest();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, item, busy, next]);

  if (!item) {
    return (
      <EmptyState
        icon={Phone}
        title="Fila de ligação vazia"
        description="Sem veículos pendentes de contato agora. Volte mais tarde ou ajuste os filtros de descarte."
      />
    );
  }

  const { listing } = item;
  const photo = listing.photos[0];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        {index + 1} de {items.length}
        {cursor ? "+" : ""} · atalhos: L ligar · D descartar · I interesse · → próximo
      </p>

      <Card className="overflow-hidden">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URI local, sem chamada de rede
          <img src={photo} alt="" className="h-56 w-full object-cover" />
        ) : (
          <div className="flex h-56 items-center justify-center bg-muted">
            <ImageOff className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">
              {listing.brand} {listing.model} {listing.modelYear}
            </h2>
            <ScoreBadge score={item.score} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{formatCents(listing.priceCents)}</span>
            <span>{formatKm(listing.km)}</span>
            <span>{daysAgoLabel(item.daysListed)}</span>
          </div>
          {item.sellerName && (
            <div className="rounded-md border p-2 text-sm">
              <p className="font-medium">{item.sellerName}</p>
              <p className="text-muted-foreground">{item.sellerMaskedPhone ?? "sem telefone"}</p>
            </div>
          )}
          {lastOutcome && (
            <Badge variant="outline">Último resultado: {CALL_OUTCOME_LABELS[lastOutcome]}</Badge>
          )}

          {call.inCall && (
            <InCallBar status={call.status} durationSeconds={call.durationSeconds} onHangup={() => void call.hangup()} />
          )}
          {(callError || call.error) && <p className="text-sm text-destructive">{callError ?? call.error}</p>}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => void handleCall()} disabled={busy || call.inCall}>
              {busy ? <Loader2 className="animate-spin" /> : <Phone />} Ligar (L)
            </Button>
            <Button variant="outline" onClick={handleInterest} disabled={busy}>
              <ThumbsUp /> Interesse (I)
            </Button>
            <Button variant="ghost" onClick={handleDiscard} disabled={busy}>
              <XCircle /> Descartar (D)
            </Button>
            <Button variant="ghost" onClick={next} disabled={busy}>
              <ArrowRight /> Próximo (→)
            </Button>
          </div>
        </div>
      </Card>

      <OutcomeDialog open={dialogOpen} onChoose={handleOutcome} />
    </div>
  );
}

"use client";

import * as React from "react";
import type { Vehicle, CallOutcome } from "@veiculo/types";
import { Phone, ThumbsUp, XCircle, ArrowRight, ImageOff } from "lucide-react";

import { primaryListing } from "@/mocks/vehicles";
import { sellerById } from "@/mocks/sellers";
import { formatCents, formatKm, daysAgoLabel } from "@/lib/format";
import { CALL_OUTCOME_LABELS } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { OutcomeDialog } from "@/components/dialer/outcome-dialog";

export function DialerView({ vehicles }: { vehicles: Vehicle[] }) {
  const [index, setIndex] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [lastOutcome, setLastOutcome] = React.useState<CallOutcome | null>(null);

  const vehicle = vehicles[index];

  const next = React.useCallback(() => {
    setLastOutcome(null);
    setIndex((i) => Math.min(i + 1, vehicles.length));
  }, [vehicles.length]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (dialogOpen || !vehicle) return;
      if (e.key === "l" || e.key === "L") setDialogOpen(true);
      if (e.key === "d" || e.key === "D") next();
      if (e.key === "i" || e.key === "I") next();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen, vehicle, next]);

  if (!vehicle) {
    return (
      <EmptyState
        icon={Phone}
        title="Fila de ligação vazia"
        description="Sem veículos pendentes de contato agora. Volte mais tarde ou ajuste os filtros de descarte."
      />
    );
  }

  const listing = primaryListing(vehicle);
  const seller = vehicle.sellerId ? sellerById(vehicle.sellerId) : undefined;
  const photo = listing.photos[0];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        {index + 1} de {vehicles.length} · atalhos: L ligar · D descartar · I interesse · → próximo
      </p>

      <Card className="overflow-hidden">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URI local
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
            <ScoreBadge score={vehicle.score} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{formatCents(listing.priceCents)}</span>
            <span>{formatKm(listing.km)}</span>
            <span>{daysAgoLabel(vehicle.daysListed)}</span>
          </div>
          {seller && (
            <div className="rounded-md border p-2 text-sm">
              <p className="font-medium">{seller.name}</p>
              <p className="text-muted-foreground">{seller.maskedPhone}</p>
            </div>
          )}
          {lastOutcome && (
            <Badge variant="outline">Último resultado: {CALL_OUTCOME_LABELS[lastOutcome]}</Badge>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => setDialogOpen(true)}>
              <Phone /> Ligar (L)
            </Button>
            <Button variant="outline" onClick={next}>
              <ThumbsUp /> Interesse (I)
            </Button>
            <Button variant="ghost" onClick={next}>
              <XCircle /> Descartar (D)
            </Button>
            <Button variant="ghost" onClick={next}>
              <ArrowRight /> Próximo (→)
            </Button>
          </div>
        </div>
      </Card>

      <OutcomeDialog
        open={dialogOpen}
        onChoose={(outcome) => {
          setLastOutcome(outcome);
          setDialogOpen(false);
          setTimeout(next, 400);
        }}
      />
    </div>
  );
}

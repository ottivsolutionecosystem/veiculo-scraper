import Link from "next/link";
import { ImageOff } from "lucide-react";

import type { QueueItem } from "@/lib/api-types";
import {
  formatCents,
  formatKm,
  formatPct,
  formatDate,
  daysAgoLabel,
  locationLabel,
  priceChangeLabel,
} from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { VehicleActions } from "@/components/queue/vehicle-actions";
import { sourceLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function QueueCard({ item, mode = "queue" }: { item: QueueItem; mode?: "queue" | "stock" }) {
  const { listing } = item;
  const photo = listing.photos[0];
  const variacao = priceChangeLabel(item.priceChangeCents);
  const caiu = (item.priceChangeCents ?? 0) < 0;
  const followUpDue =
    Boolean(item.followUpAt) && new Date(item.followUpAt!) <= new Date() && item.state !== "discarded";
  const droppedAfterContact = Boolean(item.lastContactedAt) && (item.priceChangeCents ?? 0) < 0;
  const local = locationLabel(listing.city, listing.stateCode);

  return (
    <Card
      className={cn(
        "group card-lift flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-3.5",
        followUpDue && "border-l-[3px] border-l-primary",
        droppedAfterContact && !followUpDue && "border-l-[3px] border-l-coral",
        item.consignador && "ring-1 ring-navy/10",
      )}
    >
      <Link
        href={`/veiculos/${item.id}`}
        className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center"
      >
        <span className="flex aspect-[16/10] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-navy/[0.06] sm:aspect-auto sm:h-[4.75rem] sm:w-[7.25rem]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URI local, sem chamada de rede
            <img
              src={photo}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 rounded-md bg-navy/[0.06] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-navy/60">
              #{item.id}
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-navy transition-colors group-hover:text-primary">
              {listing.brand ?? "?"} {listing.model ?? "?"} {listing.modelYear ?? ""}
            </span>
            <Badge variant="outline">{sourceLabel(listing.source)}</Badge>
            {item.listingsCount > 1 && <Badge variant="outline">{item.listingsCount} fontes</Badge>}
            <ScoreBadge score={item.score} />
            {item.consignador && <Badge variant="secondary">{item.consignador}</Badge>}
            {item.discardReason && (
              <Badge variant="outline" className="border-coral/40 text-coral">
                {item.discardReason}
              </Badge>
            )}
          </span>
          <span className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="text-[17px] font-semibold tabular-nums tracking-tight text-navy">
              {formatCents(listing.priceCents)}
            </span>
            {variacao && (
              <span
                className={caiu ? "font-medium text-boa" : "font-medium text-destructive"}
                title={item.priceChangedAt ? `Mudou em ${formatDate(item.priceChangedAt)}` : undefined}
              >
                {variacao}
                {item.previousPriceCents !== null && (
                  <span className="font-normal text-muted-foreground"> (era {formatCents(item.previousPriceCents)})</span>
                )}
              </span>
            )}
            {item.fipeDiscountPct !== null && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  item.fipeDiscountPct > 0 ? "bg-boa/10 text-boa" : "bg-destructive/10 text-destructive",
                )}
              >
                {formatPct(item.fipeDiscountPct)} vs FIPE
              </span>
            )}
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              {formatKm(listing.km)}
              {local && (
                <>
                  <span aria-hidden className="h-1 w-1 rounded-full bg-navy/20" />
                  {local}
                </>
              )}
              <span aria-hidden className="h-1 w-1 rounded-full bg-navy/20" />
              {daysAgoLabel(item.daysListed)}
            </span>
          </span>
        </span>
      </Link>

      <VehicleActions
        vehicleId={item.id}
        sellerId={item.sellerId}
        maskedPhone={item.sellerMaskedPhone ?? "sem telefone"}
        listing={{
          brand: listing.brand,
          model: listing.model,
          modelYear: listing.modelYear,
          priceCents: listing.priceCents,
          url: listing.url,
        }}
        fipeDiscountPct={item.fipeDiscountPct}
        consignador={item.consignador}
        consignadorId={item.consignadorId}
        lockedUntil={item.lockedUntil}
        lastContactedAt={item.lastContactedAt}
        mode={mode}
      />
    </Card>
  );
}

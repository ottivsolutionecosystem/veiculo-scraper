import Link from "next/link";
import { ImageOff, Users } from "lucide-react";

import type { QueueItem } from "@/lib/api-types";
import { formatCents, formatKm, formatPct, daysAgoLabel } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { VehicleActions } from "@/components/queue/vehicle-actions";

export function QueueCard({ item }: { item: QueueItem }) {
  const { listing } = item;
  const photo = listing.photos[0];

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <Link
        href={`/veiculos/${item.id}`}
        className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URI local, sem chamada de rede
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/veiculos/${item.id}`} className="font-semibold hover:underline">
            {listing.brand ?? "?"} {listing.model ?? "?"} {listing.modelYear ?? ""}
          </Link>
          <ScoreBadge score={item.score} />
          {item.compatibleCustomersCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />{" "}
              {item.compatibleCustomersCount === 1
                ? "1 cliente procurando"
                : `${item.compatibleCustomersCount} clientes procurando`}
            </Badge>
          )}
          {!listing.active && <Badge variant="secondary">Inativo</Badge>}
          {listing.sellerType && (
            <Badge variant="outline">{listing.sellerType === "dealer" ? "Loja" : "Particular"}</Badge>
          )}
          {listing.pendingFields.length > 0 && <Badge variant="outline">Pendências</Badge>}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{listing.normalizedTitle}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold">{formatCents(listing.priceCents)}</span>
          {item.fipeDiscountPct !== null && (
            <span className={item.fipeDiscountPct > 0 ? "text-boa" : "text-destructive"}>
              {formatPct(item.fipeDiscountPct)} vs FIPE
            </span>
          )}
          <span className="text-muted-foreground">{formatKm(listing.km)}</span>
          <span className="text-muted-foreground">{daysAgoLabel(item.daysListed)}</span>
          <Badge variant="outline">{listing.source}</Badge>
          {item.listingsCount > 1 && <Badge variant="outline">{item.listingsCount} fontes</Badge>}
        </div>
      </div>

      <VehicleActions vehicleId={item.id} maskedPhone={item.sellerMaskedPhone ?? "sem telefone"} />
    </Card>
  );
}

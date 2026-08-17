import Link from "next/link";
import type { Vehicle } from "@veiculo/types";
import { ImageOff, Users } from "lucide-react";

import { primaryListing } from "@/mocks/vehicles";
import { sellerById } from "@/mocks/sellers";
import { formatCents, formatKm, formatPct, daysAgoLabel } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { VehicleActions } from "@/components/queue/vehicle-actions";

export function QueueCard({ vehicle }: { vehicle: Vehicle }) {
  const listing = primaryListing(vehicle);
  const seller = vehicle.sellerId ? sellerById(vehicle.sellerId) : undefined;
  const photo = listing.photos[0];

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <Link
        href={`/veiculos/${vehicle.id}`}
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
          <Link href={`/veiculos/${vehicle.id}`} className="font-semibold hover:underline">
            {listing.brand ?? "?"} {listing.model ?? "?"} {listing.modelYear ?? ""}
          </Link>
          <ScoreBadge score={vehicle.score} />
          {vehicle.compatibleCustomersCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />{" "}
              {vehicle.compatibleCustomersCount === 1
                ? "1 cliente procurando"
                : `${vehicle.compatibleCustomersCount} clientes procurando`}
            </Badge>
          )}
          {!listing.active && <Badge variant="secondary">Inativo</Badge>}
          {listing.pendingFields.length > 0 && <Badge variant="outline">Pendências</Badge>}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{listing.normalizedTitle}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold">{formatCents(listing.priceCents)}</span>
          {vehicle.fipeDiscountPct !== null && (
            <span className={vehicle.fipeDiscountPct > 0 ? "text-boa" : "text-destructive"}>
              {formatPct(vehicle.fipeDiscountPct)} vs FIPE
            </span>
          )}
          <span className="text-muted-foreground">{formatKm(listing.km)}</span>
          <span className="text-muted-foreground">{daysAgoLabel(vehicle.daysListed)}</span>
          <Badge variant="outline">{listing.source}</Badge>
          {vehicle.listings.length > 1 && (
            <Badge variant="outline">{vehicle.listings.length} fontes</Badge>
          )}
        </div>
      </div>

      <VehicleActions maskedPhone={seller?.maskedPhone ?? "(67) 9****-0000"} />
    </Card>
  );
}

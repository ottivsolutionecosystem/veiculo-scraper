import { notFound } from "next/navigation";

import { VEHICLES, vehicleById, primaryListing, sellerById, matchesByVehicle, INTERESTS, CUSTOMERS } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { formatCents, formatKm, daysAgoLabel } from "@/lib/format";
import { VEHICLE_STATE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Gallery } from "@/components/vehicle/gallery";
import { FipeCard } from "@/components/vehicle/fipe-card";
import { ScoreBreakdown } from "@/components/vehicle/score-breakdown";
import { PriceHistoryCard } from "@/components/vehicle/price-history";
import { ListingsCard } from "@/components/vehicle/listings-card";
import { SellerCard } from "@/components/vehicle/seller-card";
import { MatchesCard } from "@/components/vehicle/matches-card";
import { RequestButton } from "@/components/vehicle/request-button";

export default async function VehiclePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Ficha do veículo");
  if (demo === "loading") await delay(900);

  const vehicle = vehicleById(Number(params.id));
  if (!vehicle) notFound();

  const listing = primaryListing(vehicle);
  const seller = vehicle.sellerId ? sellerById(vehicle.sellerId) : undefined;
  const otherVehicles = VEHICLES.filter((v) => v.sellerId === vehicle.sellerId && v.id !== vehicle.id);
  const matchRows = matchesByVehicle(vehicle.id)
    .map((match) => {
      const interest = INTERESTS.find((i) => i.id === match.interestId);
      const customer = interest ? CUSTOMERS.find((c) => c.id === interest.customerId) : undefined;
      return interest && customer ? { match, interest, customer } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">
              {listing.brand} {listing.model} {listing.trim} {listing.modelYear}
            </h1>
            <p className="text-sm text-muted-foreground">{listing.normalizedTitle}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{VEHICLE_STATE_LABELS[vehicle.state]}</Badge>
              {!listing.active && <Badge variant="secondary">Inativo</Badge>}
              {vehicle.state === "discarded" && vehicle.discardReason && (
                <Badge variant="destructive">{vehicle.discardReason}</Badge>
              )}
            </div>
          </div>
          <RequestButton />
        </div>

        <Gallery photos={listing.photos} alt={`${listing.brand} ${listing.model}`} />

        <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border p-4 text-sm">
          <span className="font-semibold">{formatCents(listing.priceCents)}</span>
          <span>{formatKm(listing.km)}</span>
          <span>{listing.transmission}</span>
          <span>{listing.fuelType}</span>
          <span>{listing.color ?? "cor não informada"}</span>
          <span>
            {listing.city}/{listing.stateCode}
          </span>
          <span>{daysAgoLabel(vehicle.daysListed)}</span>
        </div>

        <FipeCard vehicle={vehicle} listing={listing} />
        <PriceHistoryCard history={vehicle.priceHistory} />
        <ListingsCard listings={vehicle.listings} />
      </div>

      <div className="space-y-4">
        <ScoreBreakdown score={vehicle.score} />
        {seller && <SellerCard seller={seller} otherVehicles={otherVehicles} />}
        <MatchesCard rows={matchRows} />
      </div>
    </div>
  );
}

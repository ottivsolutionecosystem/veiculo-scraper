"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { ApiError, getVehicle } from "@/lib/api";
import type { VehicleDetailResponse } from "@/lib/api-types";
import { useAuth } from "@/components/auth/auth-provider";
import { formatCents, formatKm, daysAgoLabel } from "@/lib/format";
import { VEHICLE_STATE_LABELS, sourceLabel } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Gallery } from "@/components/vehicle/gallery";
import { FipeCard } from "@/components/vehicle/fipe-card";
import { ScoreBreakdown } from "@/components/vehicle/score-breakdown";
import { PriceHistoryCard } from "@/components/vehicle/price-history";
import { ListingsCard } from "@/components/vehicle/listings-card";
import { SellerCard } from "@/components/vehicle/seller-card";
import { VehicleActions } from "@/components/queue/vehicle-actions";

export function VehicleBoard({ vehicleId }: { vehicleId: number }) {
  const { ready, operator } = useAuth();
  const [data, setData] = React.useState<VehicleDetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ready || !operator) return;
    let cancelled = false;
    void getVehicle(vehicleId)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Veículo não encontrado.");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Não carregou a ficha.");
      });
    return () => {
      cancelled = true;
    };
  }, [ready, operator, vehicleId]);

  if (!ready) return null;
  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando ficha…
      </div>
    );
  }

  const { vehicle, seller, otherVehicles, interactions } = data;
  const listing = vehicle.listings.find((l) => l.id === vehicle.primaryListingId) ?? vehicle.listings[0];
  if (!listing) return <p className="p-6 text-sm text-muted-foreground">Anúncio principal ausente.</p>;

  return (
    <div className="grid gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-navy sm:text-xl">
              <span className="mr-2 align-middle rounded-md bg-navy/[0.06] px-2 py-0.5 text-sm font-semibold tabular-nums text-navy/60">
                #{vehicle.id}
              </span>
              {listing.brand} {listing.model} {listing.trim} {listing.modelYear}
            </h1>
            <p className="text-sm text-muted-foreground">{listing.normalizedTitle}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{sourceLabel(listing.source)}</Badge>
              <Badge>{VEHICLE_STATE_LABELS[vehicle.state]}</Badge>
              {!listing.active && <Badge variant="secondary">Inativo</Badge>}
              {vehicle.consignador && <Badge variant="secondary">{vehicle.consignador}</Badge>}
              {vehicle.discardReason && (
                <Badge variant="outline" className="border-coral/40 text-coral">
                  {vehicle.discardReason}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            <VehicleActions
              vehicleId={vehicle.id}
              sellerId={seller?.id ?? vehicle.sellerId}
              maskedPhone={seller?.maskedPhone ?? "sem telefone"}
              listing={{
                brand: listing.brand,
                model: listing.model,
                modelYear: listing.modelYear,
                priceCents: listing.priceCents,
                url: listing.url,
              }}
              fipeDiscountPct={vehicle.fipeDiscountPct}
              consignador={vehicle.consignador}
              consignadorId={vehicle.consignadorId}
              lockedUntil={vehicle.lockedUntil}
              lastContactedAt={vehicle.lastContactedAt}
              mode={vehicle.state === "acquired" ? "stock" : "detail"}
            />
          </div>
        </div>

        <Gallery photos={listing.photos} alt={`${listing.brand} ${listing.model}`} />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-navy/[0.06] bg-card p-4 text-sm shadow-card">
          <span className="text-lg font-semibold tabular-nums tracking-tight text-navy">
            {formatCents(listing.priceCents)}
          </span>
          {[
            formatKm(listing.km),
            listing.transmission,
            listing.fuelType,
            listing.color ?? "cor não informada",
            `${listing.city}/${listing.stateCode}`,
            daysAgoLabel(vehicle.daysListed),
          ].map((info, i) => (
            <span key={`${info}-${i}`} className="flex items-center gap-5 text-muted-foreground">
              <span aria-hidden className="h-1 w-1 rounded-full bg-navy/15" />
              {info}
            </span>
          ))}
        </div>

        <FipeCard vehicle={vehicle} listing={listing} />
        <PriceHistoryCard history={vehicle.priceHistory} />
        <ListingsCard listings={vehicle.listings} />
      </div>

      <div className="space-y-4">
        <ScoreBreakdown score={vehicle.score} />
        {seller && (
          <SellerCard
            seller={seller}
            vehicleId={vehicle.id}
            otherVehicles={otherVehicles}
            interactions={interactions ?? []}
            listing={{
              brand: listing.brand,
              model: listing.model,
              year: listing.modelYear,
              priceCents: listing.priceCents,
              fipeDiscountPct: vehicle.fipeDiscountPct,
            }}
          />
        )}
      </div>
    </div>
  );
}

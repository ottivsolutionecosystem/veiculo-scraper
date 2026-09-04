"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { ApiError, getSeller } from "@/lib/api";
import type { SellerDetailResponse } from "@/lib/api-types";
import { formatCents, formatKm, formatDate } from "@/lib/format";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SellerToggles } from "@/components/seller/seller-toggles";
import { ContactActions } from "@/components/vehicle/contact-actions";

export function SellerDetailBoard({ sellerId }: { sellerId: number }) {
  const { ready, operator } = useAuth();
  const [data, setData] = React.useState<SellerDetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ready || !operator) return;
    let cancelled = false;
    void getSeller(sellerId)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Vendedor não encontrado.");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Não carregou o vendedor.");
      });
    return () => {
      cancelled = true;
    };
  }, [ready, operator, sellerId]);

  if (!ready) return null;
  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando vendedor…
      </div>
    );
  }

  const { seller, vehicles } = data;
  const first = vehicles[0]?.listing;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-navy">{seller.name}</h1>
        <p className="text-sm text-muted-foreground">
          {seller.maskedPhone ?? "sem telefone"} · {seller.totalListings} anúncios ·{" "}
          {seller.lastContactedAt ? `último contato em ${formatDate(seller.lastContactedAt)}` : "sem contato ainda"}
        </p>
      </div>

      <Card className="p-4">
        <ContactActions
          sellerId={seller.id}
          vehicleId={vehicles[0]?.vehicleId}
          maskedPhone={seller.maskedPhone}
          muted={seller.muted}
          doNotDisturb={seller.doNotDisturb}
          hasPhone={Boolean(seller.maskedPhone)}
          listing={
            first
              ? {
                  brand: first.brand ?? null,
                  model: first.model ?? null,
                  year: first.modelYear ?? null,
                  priceCents: first.priceCents ?? null,
                  fipeDiscountPct: null,
                }
              : undefined
          }
        />
      </Card>

      <Card className="p-4">
        <SellerToggles sellerId={seller.id} muted={seller.muted} doNotDisturb={seller.doNotDisturb} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todos os carros deste vendedor na base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {vehicles.map(({ vehicleId, listing }) => (
            <Link
              key={vehicleId}
              href={`/veiculos/${vehicleId}`}
              className="flex min-h-11 items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
            >
              <span>
                {listing.brand} {listing.model} {listing.modelYear}
              </span>
              <span className="flex gap-3 text-muted-foreground">
                <span>{formatKm(listing.km ?? null)}</span>
                <span>{formatCents(listing.priceCents ?? null)}</span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

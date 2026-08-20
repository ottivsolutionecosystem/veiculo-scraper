import Link from "next/link";
import type { Seller, Listing } from "@veiculo/types";
import { UserRound, BellOff, VolumeX } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactActions } from "@/components/vehicle/contact-actions";

export function SellerCard({
  seller,
  otherVehicles,
  listing,
}: {
  seller: Seller;
  otherVehicles: { vehicleId: number; listing: Partial<Listing> }[];
  listing?: {
    brand: string | null;
    model: string | null;
    year: number | null;
    priceCents: number | null;
    fipeDiscountPct: number | null;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="h-4 w-4" /> {seller.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ContactActions
          sellerId={seller.id}
          maskedPhone={seller.maskedPhone}
          muted={seller.muted}
          doNotDisturb={seller.doNotDisturb}
          hasPhone={Boolean(seller.maskedPhone)}
          listing={listing}
        />
        <div className="flex gap-2">
          {seller.muted && (
            <Badge variant="secondary" className="gap-1">
              <VolumeX className="h-3 w-3" /> Mutado
            </Badge>
          )}
          {seller.doNotDisturb && (
            <Badge variant="secondary" className="gap-1">
              <BellOff className="h-3 w-3" /> Não perturbe
            </Badge>
          )}
        </div>
        {otherVehicles.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Outros {otherVehicles.length} carros deste vendedor
            </p>
            <div className="space-y-1">
              {otherVehicles.slice(0, 5).map(({ vehicleId, listing: other }) => (
                <Link
                  key={vehicleId}
                  href={`/veiculos/${vehicleId}`}
                  className="block truncate text-sm text-primary hover:underline"
                >
                  {other.brand} {other.model} {other.modelYear}
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

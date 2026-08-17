import Link from "next/link";
import type { Seller, Listing } from "@veiculo/types";
import { UserRound, BellOff, VolumeX } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SellerCard({
  seller,
  otherVehicles,
}: {
  seller: Seller;
  otherVehicles: { vehicleId: number; listing: Partial<Listing> }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="h-4 w-4" /> {seller.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{seller.maskedPhone}</p>
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
              {otherVehicles.slice(0, 5).map(({ vehicleId, listing }) => (
                <Link
                  key={vehicleId}
                  href={`/veiculos/${vehicleId}`}
                  className="block truncate text-sm text-primary hover:underline"
                >
                  {listing.brand} {listing.model} {listing.modelYear}
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

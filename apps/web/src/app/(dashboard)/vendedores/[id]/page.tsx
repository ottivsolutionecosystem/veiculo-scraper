import { notFound } from "next/navigation";
import Link from "next/link";

import { getSeller, ApiError } from "@/lib/api";
import { formatCents, formatKm, formatDate } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SellerToggles } from "@/components/seller/seller-toggles";

export default async function SellerPage({ params }: { params: { id: string } }) {
  let data;
  try {
    data = await getSeller(Number(params.id));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const { seller, vehicles } = data;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">{seller.name}</h1>
        <p className="text-sm text-muted-foreground">
          {seller.maskedPhone} · {seller.totalListings} anúncios ·{" "}
          {seller.lastContactedAt ? `último contato em ${formatDate(seller.lastContactedAt)}` : "sem contato ainda"}
        </p>
      </div>

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
              className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
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

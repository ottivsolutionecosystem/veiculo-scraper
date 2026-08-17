import { notFound } from "next/navigation";
import Link from "next/link";

import { SELLERS, VEHICLES, primaryListing } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { formatCents, formatKm, formatDate } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SellerToggles } from "@/components/seller/seller-toggles";

export default async function SellerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Ficha do vendedor");
  if (demo === "loading") await delay(900);

  const seller = SELLERS.find((s) => s.id === params.id);
  if (!seller) notFound();

  const vehicles = VEHICLES.filter((v) => v.sellerId === seller.id);

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
        <SellerToggles muted={seller.muted} doNotDisturb={seller.doNotDisturb} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todos os carros deste vendedor na base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {vehicles.map((v) => {
            const listing = primaryListing(v);
            return (
              <Link
                key={v.id}
                href={`/veiculos/${v.id}`}
                className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
              >
                <span>
                  {listing.brand} {listing.model} {listing.modelYear}
                </span>
                <span className="flex gap-3 text-muted-foreground">
                  <span>{formatKm(listing.km)}</span>
                  <span>{formatCents(listing.priceCents)}</span>
                </span>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

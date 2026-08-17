import { notFound } from "next/navigation";
import Link from "next/link";

import {
  CUSTOMERS,
  interestsByCustomer,
  matchesByInterest,
  vehicleById,
  primaryListing,
} from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { formatCents, formatDate } from "@/lib/format";
import { INTEREST_PRIORITY_LABELS, INTEREST_STATUS_LABELS } from "@/lib/labels";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Ficha do cliente");
  if (demo === "loading") await delay(900);

  const customer = CUSTOMERS.find((c) => c.id === params.id);
  if (!customer) notFound();

  const interests = interestsByCustomer(customer.id);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">{customer.name}</h1>
        <p className="text-sm text-muted-foreground">
          {customer.contact} · {customer.source} · responsável: {customer.owner} · desde{" "}
          {formatDate(customer.createdAt)}
        </p>
        {customer.notes && <p className="mt-1 text-sm text-muted-foreground">{customer.notes}</p>}
      </div>

      <div className="space-y-3">
        {interests.map((interest) => {
          const matches = matchesByInterest(interest.id);
          return (
            <Card key={interest.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>
                  {interest.brand ?? "Qualquer marca"} {interest.model ?? ""}
                </CardTitle>
                <div className="flex gap-1.5">
                  <Badge variant="outline">{INTEREST_PRIORITY_LABELS[interest.priority]}</Badge>
                  <Badge variant="outline">{INTEREST_STATUS_LABELS[interest.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ano {interest.yearMin ?? "—"}–{interest.yearMax ?? "—"} · até{" "}
                  {interest.maxKm?.toLocaleString("pt-BR") ?? "qualquer"} km · até{" "}
                  {interest.priceMaxCents ? formatCents(interest.priceMaxCents) : "sem teto"}
                  {interest.city ? ` · ${interest.city}` : ""}
                </p>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Carros compatíveis agora ({matches.length})
                  </p>
                  {matches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum veículo compatível com este interesse ainda.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {matches.map((match) => {
                        const vehicle = vehicleById(match.vehicleId);
                        if (!vehicle) return null;
                        const listing = primaryListing(vehicle);
                        return (
                          <Link
                            key={match.id}
                            href={`/veiculos/${vehicle.id}`}
                            className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
                          >
                            <span>
                              {listing.brand} {listing.model} {listing.modelYear}
                            </span>
                            <Badge variant="outline">{match.matchScore}% aderência</Badge>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

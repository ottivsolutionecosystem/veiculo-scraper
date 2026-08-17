import { notFound } from "next/navigation";
import Link from "next/link";

import { getCustomer, ApiError } from "@/lib/api";
import { formatCents, formatDate } from "@/lib/format";
import { INTEREST_PRIORITY_LABELS, INTEREST_STATUS_LABELS } from "@/lib/labels";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CustomerPage({ params }: { params: { id: string } }) {
  let data;
  try {
    data = await getCustomer(Number(params.id));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const { customer, interests } = data;

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
        {interests.map((interest) => (
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
                  Carros compatíveis agora ({interest.matches.length})
                </p>
                {interest.matches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum veículo compatível com este interesse ainda.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {interest.matches.map((match) => (
                      <Link
                        key={match.id}
                        href={`/veiculos/${match.vehicleId}`}
                        className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
                      >
                        <span>
                          {match.vehicle.brand} {match.vehicle.model} {match.vehicle.modelYear}
                        </span>
                        <Badge variant="outline">{match.matchScore}% aderência</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

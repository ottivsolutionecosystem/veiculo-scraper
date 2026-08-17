"use client";

import * as React from "react";
import type { Vehicle } from "@veiculo/types";
import { Check } from "lucide-react";

import { primaryListing } from "@/mocks/vehicles";
import { formatCents } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FipeReviewCard({ vehicle }: { vehicle: Vehicle }) {
  const [resolved, setResolved] = React.useState<string | null>(null);
  const listing = primaryListing(vehicle);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>
          {listing.brand} {listing.model} {listing.trim} {listing.modelYear}
        </CardTitle>
        <span className="text-sm text-muted-foreground">{formatCents(listing.priceCents)}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{listing.normalizedTitle}</p>

        {resolved ? (
          <Badge variant="boa" className="gap-1">
            <Check className="h-3 w-3" /> Confirmado: {resolved}
          </Badge>
        ) : vehicle.fipeMatchCandidates && vehicle.fipeMatchCandidates.length > 0 ? (
          <div className="space-y-1.5">
            {vehicle.fipeMatchCandidates.map((c) => (
              <div key={c.fipeCode} className="flex items-center justify-between gap-2 rounded-md border p-2">
                <div>
                  <p className="text-sm">{c.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Confiança {(c.confidence * 100).toFixed(0)}% · FIPE {c.fipeCode}
                  </p>
                </div>
                <Button size="sm" onClick={() => setResolved(c.label)}>
                  Confirmar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem candidato automático — marca/modelo não reconhecidos ou ano fora da tabela FIPE
            importada. Requer classificação manual.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

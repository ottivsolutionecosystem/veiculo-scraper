import type { Vehicle, Listing } from "@veiculo/types";
import { GitCompareArrows } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCents, formatPct } from "@/lib/format";
import { findFipePrice } from "@/mocks/fipe";

export function FipeCard({ vehicle, listing }: { vehicle: Vehicle; listing: Listing }) {
  const fipe = findFipePrice(listing.brand, listing.model, listing.modelYear);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4" /> Comparativo FIPE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Preço do anúncio</span>
          <span className="font-medium">{formatCents(listing.priceCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Valor FIPE ({fipe?.referenceMonth ?? "—"})</span>
          <span className="font-medium">{fipe ? formatCents(fipe.valueCents) : "sem match"}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-sm">
          <span className="text-muted-foreground">Desconto</span>
          <span className={vehicle.fipeDiscountPct && vehicle.fipeDiscountPct > 0 ? "font-semibold text-boa" : "font-semibold text-destructive"}>
            {formatPct(vehicle.fipeDiscountPct)} {vehicle.fipeDiscountCents ? `(${formatCents(vehicle.fipeDiscountCents)})` : ""}
          </span>
        </div>

        {vehicle.fipeMatchConfidence !== null && vehicle.fipeMatchConfidence < 0.85 && (
          <div className="rounded-md border border-morna/30 bg-morna/10 p-3 text-sm">
            <p className="mb-2 font-medium text-morna">
              Confiança do match: {(vehicle.fipeMatchConfidence * 100).toFixed(0)}% — na fila de revisão
            </p>
            {vehicle.fipeMatchCandidates?.map((c) => (
              <div key={c.fipeCode} className="flex items-center justify-between gap-2 py-1">
                <span className="text-xs">{c.label}</span>
                <Button size="sm" variant="outline">
                  Confirmar
                </Button>
              </div>
            ))}
          </div>
        )}

        {vehicle.fipeMatchConfidence === null && (
          <Badge variant="outline">Sem match FIPE — fila de revisão</Badge>
        )}
      </CardContent>
    </Card>
  );
}

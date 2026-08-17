import type { PriceHistoryPoint } from "@veiculo/types";
import { TrendingDown } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCents, formatDate } from "@/lib/format";

export function PriceHistoryCard({ history }: { history: PriceHistoryPoint[] }) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" /> Histórico de preço
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {sorted.length <= 1 ? (
          <p className="text-sm text-muted-foreground">Sem quedas de preço registradas.</p>
        ) : (
          sorted.map((point, i) => {
            const previous = sorted[i + 1];
            const delta = previous ? point.priceCents - previous.priceCents : 0;
            return (
              <div key={point.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{formatDate(point.observedAt)}</span>
                <span className="font-medium">{formatCents(point.priceCents)}</span>
                {delta !== 0 && (
                  <span className={delta < 0 ? "text-boa" : "text-destructive"}>
                    {delta < 0 ? "↓" : "↑"} {formatCents(Math.abs(delta))}
                  </span>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

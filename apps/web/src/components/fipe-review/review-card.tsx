"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import type { FipeReviewItem } from "@/lib/api-types";
import { confirmFipeMatch, ApiError } from "@/lib/api";
import { formatCents } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FipeReviewCard({ item }: { item: FipeReviewItem }) {
  const [resolved, setResolved] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function confirm(fipeCode: string, label: string) {
    setConfirming(fipeCode);
    setError(null);
    try {
      await confirmFipeMatch(item.id, fipeCode);
      setResolved(label);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao confirmar match.");
    } finally {
      setConfirming(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>
          {item.brand} {item.model} {item.trim} {item.modelYear}
        </CardTitle>
        <span className="text-sm text-muted-foreground">{formatCents(item.priceCents)}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">{item.normalizedTitle}</p>

        {resolved ? (
          <Badge variant="boa" className="gap-1">
            <Check className="h-3 w-3" /> Confirmado: {resolved}
          </Badge>
        ) : item.fipeMatchCandidates && item.fipeMatchCandidates.length > 0 ? (
          <div className="space-y-1.5">
            {item.fipeMatchCandidates.map((c) => (
              <div key={c.fipeCode} className="flex items-center justify-between gap-2 rounded-md border p-2">
                <div>
                  <p className="text-sm">{c.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Confiança {(c.confidence * 100).toFixed(0)}% · FIPE {c.fipeCode}
                  </p>
                </div>
                <Button size="sm" disabled={confirming !== null} onClick={() => confirm(c.fipeCode, c.label)}>
                  {confirming === c.fipeCode && <Loader2 className="animate-spin" />} Confirmar
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
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

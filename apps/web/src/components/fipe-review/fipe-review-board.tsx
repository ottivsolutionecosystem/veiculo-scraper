"use client";

import * as React from "react";
import { GitCompareArrows, Loader2 } from "lucide-react";

import { ApiError, getFipeReview } from "@/lib/api";
import type { FipeReviewItem } from "@/lib/api-types";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { FipeReviewCard } from "@/components/fipe-review/review-card";

export function FipeReviewBoard() {
  const { ready, operator } = useAuth();
  const [items, setItems] = React.useState<FipeReviewItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ready || !operator) return;
    let cancelled = false;
    void getFipeReview({ limit: 40 })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Não carregou a revisão FIPE.");
      });
    return () => {
      cancelled = true;
    };
  }, [ready, operator]);

  if (!ready) return null;
  if (error) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!items) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando revisão FIPE…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {items.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="Fila de revisão vazia"
          description="Todo veículo coletado teve o match FIPE resolvido automaticamente com confiança alta."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <FipeReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

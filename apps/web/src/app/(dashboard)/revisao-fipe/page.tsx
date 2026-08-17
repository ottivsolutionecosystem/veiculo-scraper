import { GitCompareArrows } from "lucide-react";

import { getFipeReview } from "@/lib/api";
import { EmptyState } from "@/components/shared/empty-state";
import { FipeReviewCard } from "@/components/fipe-review/review-card";

export default async function RevisaoFipePage() {
  const page = await getFipeReview({ limit: 40 });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Revisão de match FIPE</h1>
        <p className="text-sm text-muted-foreground">
          {page.items.length}
          {page.nextCursor ? "+" : ""} veículos aguardando confirmação — confiança entre 0,60 e 0,85
          ganha 3 candidatos; sem match nenhum precisa de classificação manual (seção 8 do SPEC).
        </p>
      </div>

      {page.items.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="Fila de revisão vazia"
          description="Todo veículo coletado teve o match FIPE resolvido automaticamente com confiança alta."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {page.items.map((item) => (
            <FipeReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

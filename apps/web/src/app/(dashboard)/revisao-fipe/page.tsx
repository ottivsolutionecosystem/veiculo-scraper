import { GitCompareArrows } from "lucide-react";

import { VEHICLES } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { EmptyState } from "@/components/shared/empty-state";
import { FipeReviewCard } from "@/components/fipe-review/review-card";

export default async function RevisaoFipePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Revisão de match FIPE");
  if (demo === "loading") await delay(900);

  const pending =
    demo === "empty"
      ? []
      : VEHICLES.filter(
          (v) => v.fipeMatchConfidence === null || (v.fipeMatchConfidence >= 0.6 && v.fipeMatchConfidence < 0.85),
        );

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Revisão de match FIPE</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} veículos aguardando confirmação — confiança entre 0,60 e 0,85 ganha 3
          candidatos; sem match nenhum precisa de classificação manual (seção 8 do SPEC).
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="Fila de revisão vazia"
          description="Todo veículo coletado teve o match FIPE resolvido automaticamente com confiança alta."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pending.map((vehicle) => (
            <FipeReviewCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  );
}

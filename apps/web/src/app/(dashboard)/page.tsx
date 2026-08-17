import { Flame } from "lucide-react";

import { getQueue } from "@/lib/api";
import { EmptyState } from "@/components/shared/empty-state";
import { QueueView } from "@/components/queue/queue-view";
import { Badge } from "@/components/ui/badge";

export default async function FilaDoDiaPage() {
  const page = await getQueue({ limit: 40 });
  const quente = page.items.filter((v) => v.score?.band === "quente").length;
  const comDemanda = page.items.filter((v) => v.compatibleCustomersCount > 0).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-6 pb-4">
        <div>
          <h1 className="text-xl font-bold">Fila do dia</h1>
          <p className="text-sm text-muted-foreground">
            {page.items.length}
            {page.nextCursor ? "+" : ""} veículos carregados, ranqueados por oportunidade
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="quente">{quente} quentes nesta página</Badge>
          <Badge variant="outline">{comDemanda} com demanda</Badge>
        </div>
      </div>

      {page.items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={Flame}
            title="Nenhum veículo na fila"
            description="Assim que o coletor trouxer novos anúncios ou algum filtro de descarte mudar, eles aparecem aqui ranqueados por oportunidade."
          />
        </div>
      ) : (
        <div className="p-6 pt-4">
          <QueueView initial={page} source="queue" />
        </div>
      )}
    </div>
  );
}

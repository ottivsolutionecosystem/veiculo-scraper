"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import type { ScrapeRequest } from "@/lib/api-types";
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/format";

const SELLER_TYPE_LABELS: Record<"individual" | "dealer", string> = {
  individual: "Particular",
  dealer: "Loja",
};

/** Intervalo de atualização enquanto a coleta roda. O coletor grava o
 * progresso a cada página de listagem, então 3s é rápido sem ser barulhento. */
const INTERVALO_MS = 3000;

/** Painel de uma coleta em andamento. Lê `execucoes_solicitadas.progresso`,
 * que o coletor Python atualiza durante a execução — a UI só faz polling do
 * GET /api/sources, nada de RPC. */
export function ScrapeProgress({ request, onRefresh }: { request: ScrapeRequest; onRefresh?: () => void }) {
  React.useEffect(() => {
    if (!onRefresh) return;
    const id = setInterval(onRefresh, INTERVALO_MS);
    return () => clearInterval(id);
  }, [onRefresh]);

  const filtro = request.sellerType ? SELLER_TYPE_LABELS[request.sellerType] : "particular e loja";
  const p = request.progress;

  if (!request.startedAt || !p) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Pedido de coleta ({filtro}) feito em {formatDateTime(request.requestedAt)} — na fila do coletor.
      </p>
    );
  }

  const processados = p.new + p.updated + p.unchanged;
  const total = p.onlineCount > 0 ? p.onlineCount : processados;
  const pct = total > 0 ? Math.min(100, Math.round((processados / total) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-2 text-xs font-medium">
        <Loader2 className="h-3 w-3 animate-spin" />
        Coletando {filtro}… {processados} de {p.onlineCount} anúncios no ar
      </p>
      <Progress value={pct} />
      <p className="text-xs text-muted-foreground">
        {p.new} novos · {p.updated} atualizados · {p.priceChanges} mudaram de preço · {p.unchanged} sem mudança ·{" "}
        {p.deactivated} saíram do ar
      </p>
      <p className="text-xs text-muted-foreground">
        {p.pages} páginas de listagem · {p.requests} requisições · {p.errors} erros
      </p>
    </div>
  );
}

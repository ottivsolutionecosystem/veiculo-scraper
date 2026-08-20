"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import type { ScrapeRequest } from "@/lib/api-types";
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/format";

const SELLER_TYPE_LABELS: Record<"individual" | "dealer", string> = {
  individual: "Particular",
  dealer: "Loja",
};

/** Espelho de `COLLECTOR_STALE_MS` em apps/api — loop do coletor é 15s. */
const STALE_MS = 90_000;

function resolvePhase(request: ScrapeRequest, now = Date.now()): ScrapeRequest["phase"] {
  if (request.progress) return "running";
  if (request.startedAt) return "started";
  const t = Date.parse(request.requestedAt);
  if (Number.isFinite(t) && now - t >= STALE_MS) return "stale";
  return "queued";
}

/** Intervalo de atualização enquanto a coleta está pendente ou rodando. */
const INTERVALO_MS = 3000;

/** Painel de uma coleta em andamento. Lê `execucoes_solicitadas` via
 * GET /api/sources — a UI só faz polling, nada de RPC. */
export function ScrapeProgress({ request, onRefresh }: { request: ScrapeRequest; onRefresh?: () => void | Promise<unknown> }) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), INTERVALO_MS);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (!onRefresh) return;
    const id = setInterval(onRefresh, INTERVALO_MS);
    return () => clearInterval(id);
  }, [onRefresh]);

  const filtro = request.sellerType ? SELLER_TYPE_LABELS[request.sellerType] : "particular e loja";
  const p = request.progress;
  const quando = formatDateTime(request.requestedAt);
  const phase = resolvePhase(request, now);

  if (phase === "stale") {
    return (
      <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-2">
        <p className="flex items-start gap-2 text-xs font-medium text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Coletor parado
        </p>
        <p className="text-xs text-muted-foreground">
          Pedido ({filtro}) gravado em {quando}, mas o serviço work não pegou. No Dokploy: o
          serviço work precisa estar Running com <code className="rounded bg-muted px-1">BOT_CONTACT_URL</code>,{" "}
          <code className="rounded bg-muted px-1">BOT_CONTACT_EMAIL</code> e o mesmo{" "}
          <code className="rounded bg-muted px-1">DATABASE_URL</code> da api.
        </p>
      </div>
    );
  }

  if (phase === "queued") {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Pedido de coleta ({filtro}) feito em {quando} — aguardando o coletor (loop de 15s).
      </p>
    );
  }

  if (phase === "started" || !p) {
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-medium">
          <Loader2 className="h-3 w-3 animate-spin" />
          Coletando {filtro}… listando anúncios no ar
        </p>
        <p className="text-xs text-muted-foreground">
          O coletor já pegou o pedido. A barra de contagem aparece depois da listagem.
        </p>
      </div>
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

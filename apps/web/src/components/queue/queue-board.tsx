"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ApiError, getQueue, getQueueStats, type QueueScope, type QueueStats } from "@/lib/api";
import type { Page, QueueItem } from "@/lib/api-types";
import { parseQueueListFilters, queueFiltersActive } from "@/lib/queue-filters";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { QueueView } from "@/components/queue/queue-view";
import { QueueFilters } from "@/components/queue/queue-filters";
import { CoverageBar } from "@/components/queue/coverage-bar";

const SCOPES: QueueScope[] = ["untouched", "mine", "followup", "price_drop", "all", "tagged"];

const EMPTY: Record<QueueScope, { title: string; description: string }> = {
  untouched: {
    title: "Ninguém livre para consignar",
    description: "Todos os ativos estão no kanban, no estoque, ou com outro consignador.",
  },
  mine: {
    title: "Nenhum carro seu na fila",
    description: "O que você assumiu está no kanban. A fila só mostra o mercado livre.",
  },
  followup: {
    title: "Nenhum follow-up vencido",
    description: "Follow-up antigo. O fluxo de hoje vive no kanban.",
  },
  price_drop: {
    title: "Nenhuma queda de preço",
    description: "Quando um anúncio livre baixa o preço, ele aparece aqui.",
  },
  tagged: {
    title: "Nenhum carro com tag",
    description: "Quando a tratativa não fecha, o carro volta para a fila com a tag do motivo.",
  },
  all: {
    title: "Nenhum veículo no ar",
    description: "A fila lê o mercado livre. Quem está no kanban ou no estoque não aparece aqui.",
  },
};

function asScope(raw: string | null): QueueScope {
  return SCOPES.includes(raw as QueueScope) ? (raw as QueueScope) : "untouched";
}

export function QueueBoard() {
  const { ready, operator } = useAuth();
  const searchParams = useSearchParams();
  const scope = asScope(searchParams.get("scope"));
  const listFilters = parseQueueListFilters(Object.fromEntries(searchParams.entries()));
  const filtered = queueFiltersActive(listFilters);

  const [page, setPage] = React.useState<Page<QueueItem> | null>(null);
  const [stats, setStats] = React.useState<QueueStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const filterKey = JSON.stringify({ scope, listFilters });

  React.useEffect(() => {
    if (!ready || !operator) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      getQueue({ limit: 40, scope, ...listFilters }),
      getQueueStats(),
    ])
      .then(([nextPage, nextStats]) => {
        if (cancelled) return;
        setPage(nextPage);
        setStats(nextStats);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Não carregou a fila.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, operator, filterKey]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 border-b border-navy/5 bg-card/40 px-3 py-2 sm:space-y-4 sm:px-6 sm:py-5">
            {stats && <CoverageBar initial={stats} />}
            <QueueFilters />
          </div>

      {loading && !page ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground sm:p-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando fila…
        </div>
      ) : error && !page ? (
        <p className="p-4 text-sm text-destructive sm:p-6">{error}</p>
      ) : !page || page.items.length === 0 ? (
        <div className="p-4 sm:p-6">
          <EmptyState
            title={filtered ? "Nenhum carro com esses filtros" : EMPTY[scope].title}
            description={
              filtered ? "Solte os filtros ou escolha outra fatia da fila." : EMPTY[scope].description
            }
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 px-3 py-3 sm:px-6 sm:pt-4">
          <QueueView
            fill
            initial={page}
            source="queue"
            scope={scope}
            listFilters={listFilters}
          />
        </div>
      )}
    </div>
  );
}

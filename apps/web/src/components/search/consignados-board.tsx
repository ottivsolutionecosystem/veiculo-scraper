"use client";

import * as React from "react";
import { Warehouse, Loader2 } from "lucide-react";

import { ApiError, searchVehicles } from "@/lib/api";
import type { Page, QueueItem } from "@/lib/api-types";
import type { SearchFilters } from "@/lib/search";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchFiltersForm } from "@/components/search/search-filters";
import { QueueView } from "@/components/queue/queue-view";

export function ConsignadosBoard({ filters }: { filters: SearchFilters }) {
  const { ready, operator } = useAuth();
  const [page, setPage] = React.useState<Page<QueueItem> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const filterKey = JSON.stringify(filters);

  React.useEffect(() => {
    if (!ready || !operator) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void searchVehicles({ ...filters, limit: 30 })
      .then((next) => {
        if (!cancelled) setPage(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Não carregou o estoque.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // filterKey serializa os filtros
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, operator, filterKey]);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <p className="text-sm text-muted-foreground">
        {page ? `${page.items.length}${page.nextCursor ? "+" : ""} no estoque` : "Estoque consignado"} — todo
        veículo que consignou, particular ou loja. Filtro afina, não esconde o restante por padrão.
      </p>

      <SearchFiltersForm />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando estoque…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !page || page.items.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="Nenhum veículo consignado"
          description="Quando o parecer for “consignou”, o carro aparece aqui. Ficha completa, filtros e o anúncio original."
        />
      ) : (
        <QueueView initial={page} source="search" filters={filters} />
      )}
    </div>
  );
}

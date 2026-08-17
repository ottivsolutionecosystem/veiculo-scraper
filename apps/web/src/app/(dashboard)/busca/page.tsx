import { Search } from "lucide-react";

import { searchVehicles } from "@/lib/api";
import { parseSearchFilters } from "@/lib/search";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchFiltersForm } from "@/components/search/search-filters";
import { QueueView } from "@/components/queue/queue-view";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const filters = parseSearchFilters(searchParams);
  const page = await searchVehicles({ ...filters, limit: 30 });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Busca</h1>
        <p className="text-sm text-muted-foreground">
          {page.items.length}
          {page.nextCursor ? "+" : ""} veículos encontrados — filtros refletidos na URL
        </p>
      </div>

      <SearchFiltersForm />

      {page.items.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum veículo encontrado"
          description="Ajuste os filtros acima — marca, ano, preço máximo ou desconto FIPE mínimo."
        />
      ) : (
        <QueueView initial={page} source="search" filters={filters} />
      )}
    </div>
  );
}

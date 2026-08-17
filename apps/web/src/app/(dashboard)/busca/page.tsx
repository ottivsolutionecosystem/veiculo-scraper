import { Search } from "lucide-react";

import { VEHICLES } from "@/mocks";
import { parseSearchFilters, filterVehicles } from "@/lib/search";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchFiltersForm } from "@/components/search/search-filters";
import { SearchResults } from "@/components/search/search-results";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Busca");
  if (demo === "loading") await delay(900);

  const filters = parseSearchFilters(searchParams);
  const results = demo === "empty" ? [] : filterVehicles(VEHICLES, filters);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Busca</h1>
        <p className="text-sm text-muted-foreground">
          {results.length} veículos encontrados — filtros refletidos na URL
        </p>
      </div>

      <SearchFiltersForm />

      {results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum veículo encontrado"
          description="Ajuste os filtros acima — marca, ano, preço máximo ou desconto FIPE mínimo."
        />
      ) : (
        <SearchResults vehicles={results} />
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Operator, OpsOverview, OpsRange } from "@veiculo/types";

import { ApiError, getOpsOverview, getOperators } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { OpsFilters } from "@/components/ops/ops-filters";
import { OpsKpis } from "@/components/ops/ops-kpis";
import { OpsDailyChart, OpsFunnel } from "@/components/ops/ops-charts";
import { OpsReasons, OpsKanbanBars, OpsBrands } from "@/components/ops/ops-mix";
import { OpsRanking } from "@/components/ops/ops-ranking";
import { OpsAlerts } from "@/components/ops/ops-alerts";

function asRange(raw: string | null): OpsRange {
  return raw === "today" || raw === "7d" || raw === "30d" || raw === "month" ? raw : "7d";
}

function asSellerType(raw: string | null): "individual" | "dealer" | undefined {
  if (raw === "dealer") return "dealer";
  if (raw === "individual") return "individual";
  return undefined;
}

export function OpsBoard() {
  const { ready, operator } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = asRange(searchParams.get("range"));
  const sellerType = asSellerType(searchParams.get("sellerType"));
  const operatorId = Number(searchParams.get("operatorId") ?? "") || undefined;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [data, setData] = React.useState<OpsOverview | null>(null);
  const [operators, setOperators] = React.useState<Operator[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  function patch(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    if (!ready || !operator) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      getOpsOverview({ range, operatorId, sellerType, from: from || undefined, to: to || undefined }),
      getOperators(),
    ])
      .then(([overview, team]) => {
        if (cancelled) return;
        setData(overview);
        setOperators(team.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Não deu para carregar a operação.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, operator, range, operatorId, sellerType, from, to]);

  if (!ready) return null;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <OpsFilters
        range={range}
        from={from}
        to={to}
        operatorId={operatorId}
        operators={operators}
        onPatch={patch}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando operação…
        </div>
      ) : data ? (
        <>
          <OpsKpis kpis={data.kpis} />
          <div className="grid gap-3 lg:grid-cols-3">
            <OpsDailyChart daily={data.daily} />
            <OpsFunnel funnel={data.funnel} />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <OpsReasons slices={data.returnReasons} />
            <OpsKanbanBars stages={data.kanbanNow} />
            <OpsBrands slices={data.stockBrands} />
          </div>
          <OpsRanking
            ranking={data.ranking}
            selectedId={operatorId}
            onSelect={(id) => patch({ operatorId: id ? String(id) : undefined })}
          />
          <OpsAlerts
            overdueItems={data.overdueItems}
            upcomingVisits={data.upcomingVisits}
            collection={data.collection}
          />
        </>
      ) : null}
    </div>
  );
}

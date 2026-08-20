"use client";

import type { OpsKpi, OpsOverview } from "@veiculo/types";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatOpsValue, opsDelta } from "@/lib/ops-format";

const CARDS: {
  key: keyof OpsOverview["kpis"];
  label: string;
  invert?: boolean;
  featured?: boolean;
}[] = [
  { key: "stockTotal", label: "Estoque consignado", featured: true },
  { key: "consignedPeriod", label: "Consignou no período" },
  { key: "conversion", label: "Conversão" },
  { key: "returnedPeriod", label: "Devolveu", invert: true },
  { key: "pipelineOpen", label: "Em tratativa" },
  { key: "overdue", label: "Prazo vencido", invert: true },
  { key: "claims", label: "Assumiu" },
  { key: "closeRate", label: "Taxa de fechamento" },
  { key: "visits", label: "Visitas no período" },
  { key: "avgTicketCents", label: "Ticket médio do estoque" },
  { key: "avgFipeDiscountPct", label: "Desconto FIPE médio" },
  { key: "online", label: "Anúncios no ar" },
];

function Delta({ kpi, invert }: { kpi: OpsKpi; invert?: boolean }) {
  const d = opsDelta(kpi);
  if (!d) return <p className="text-[11px] text-muted-foreground">Saldo agora — sem histórico</p>;
  if (d.zero) return <p className="text-[11px] text-muted-foreground">igual ao período anterior</p>;
  const good = invert ? !d.up : d.up;
  return (
    <p className={cn("text-[11px] font-medium", good ? "text-boa" : "text-destructive")}>
      {d.text} vs período anterior
    </p>
  );
}

export function OpsKpis({ kpis }: { kpis: OpsOverview["kpis"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => {
        const kpi = kpis[card.key];
        return (
          <Card
            key={card.key}
            title={kpi.formula}
            className={cn(card.featured && "col-span-2 bg-navy text-white shadow-none")}
          >
            <CardContent className={cn("space-y-1 p-4", card.featured && "p-5")}>
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.12em]",
                  card.featured ? "text-white/55" : "text-muted-foreground",
                )}
              >
                {card.label}
              </p>
              <p className={cn("font-semibold tabular-nums tracking-tight", card.featured ? "text-3xl" : "text-2xl")}>
                {formatOpsValue(kpi)}
              </p>
              {card.featured ? (
                <p className="text-[11px] text-white/55">{kpi.formula}</p>
              ) : (
                <>
                  <Delta kpi={kpi} invert={card.invert} />
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">{kpi.formula}</p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, Radio } from "lucide-react";
import type { OpsCollection, OpsDealRow } from "@veiculo/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REQUEST_STATE_LABELS } from "@/lib/labels";
import { countdownLabel, formatDateTime } from "@/lib/format";
import type { AcquisitionRequestState } from "@veiculo/types";

function DealList({ items, empty }: { items: OpsDealRow[]; empty: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y">
      {items.map((item) => {
        const clock = countdownLabel(item.deadline);
        return (
          <li key={item.requestId}>
            <Link
              href={`/veiculos/${item.vehicleId}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-navy"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.owner} · {REQUEST_STATE_LABELS[item.state as AcquisitionRequestState] ?? item.state}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs">
                {item.visitAt && <p>{formatDateTime(item.visitAt)}</p>}
                <p className={clock.overdue ? "font-medium text-destructive" : "text-muted-foreground"}>{clock.text}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function OpsAlerts({
  overdueItems,
  upcomingVisits,
  collection,
}: {
  overdueItems: OpsDealRow[];
  upcomingVisits: OpsDealRow[];
  collection: OpsCollection;
}) {
  const stale =
    collection.lastRunAt && Date.now() - new Date(collection.lastRunAt).getTime() > 12 * 60 * 60 * 1000;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle>Prazo vencido</CardTitle>
        </CardHeader>
        <CardContent>
          <DealList items={overdueItems} empty="Nenhuma tratativa vencida." />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <CalendarClock className="h-4 w-4 text-primary" />
          <CardTitle>Visitas em 48h</CardTitle>
        </CardHeader>
        <CardContent>
          <DealList items={upcomingVisits} empty="Nenhuma visita nas próximas 48 horas." />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Radio className="h-4 w-4 text-navy" />
          <CardTitle>Saúde da coleta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Última execução:{" "}
            <span className={stale ? "font-medium text-destructive" : ""}>
              {collection.lastRunAt ? formatDateTime(collection.lastRunAt) : "nunca"}
            </span>
            {collection.source ? ` · ${collection.source}` : ""}
          </p>
          <p className="text-muted-foreground">
            {collection.novos} novos · {collection.erros} erros · {collection.newListingsPeriod} anúncios no período
          </p>
          <p className={collection.fipePending > 0 ? "font-medium" : "text-muted-foreground"}>
            {collection.fipePending} veículos na revisão FIPE
          </p>
          {collection.fipePending > 0 && (
            <Link href="/revisao-fipe" className="text-xs font-medium text-primary hover:underline">
              Abrir revisão FIPE
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

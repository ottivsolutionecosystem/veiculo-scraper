"use client";

import * as React from "react";
import { Loader2, Radio } from "lucide-react";

import { ApiError, getSources } from "@/lib/api";
import type { SourceWithLastRun } from "@/lib/api-types";
import { ACCESS_LEVEL_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SourceToggle } from "@/components/sources/source-toggle";
import { RunScrapeButton } from "@/components/sources/run-scrape-button";
import { cn } from "@/lib/utils";

const MANUALLY_LOCKED = new Set(["webmotors", "olx"]);

const SELLER_TYPE_LABELS: Record<"individual" | "dealer", string> = {
  individual: "Particular",
  dealer: "Loja",
};

export function SourcesBoard() {
  const { ready, operator } = useAuth();
  const [sources, setSources] = React.useState<SourceWithLastRun[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    return getSources()
      .then((next) => {
        setSources(next);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Não carregou as fontes.");
      });
  }, []);

  React.useEffect(() => {
    if (!ready || !operator) return;
    reload();
  }, [ready, operator, reload]);

  if (!ready) return null;
  if (error && !sources) return <p className="p-6 text-sm text-destructive">{error}</p>;
  if (!sources) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando fontes…
      </div>
    );
  }

  const sourcesWithRuns = sources.filter((s) => s.lastRun);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {sources.length === 0 ? (
        <EmptyState icon={Radio} title="Nenhuma fonte configurada" description="Configure ao menos uma fonte de coleta para começar." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {sources.map((source) => {
            const locked = MANUALLY_LOCKED.has(source.source);
            return (
              <Card key={source.source} className="card-lift relative overflow-hidden">
                {source.active && (
                  <span aria-hidden className="auttus-gradient absolute inset-x-0 top-0 h-0.5" />
                )}
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <CardTitle className="capitalize">{source.source}</CardTitle>
                    <Badge variant="outline">{ACCESS_LEVEL_LABELS[source.accessLevel]}</Badge>
                  </div>
                  <SourceToggle
                    source={source.source}
                    active={source.active}
                    locked={locked}
                    lockedReason={source.reason ?? undefined}
                  />
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-xs leading-relaxed text-muted-foreground">{source.legalBasis}</p>
                  {source.cursor && (
                    <p className="truncate text-xs text-muted-foreground">Cursor: {source.cursor}</p>
                  )}
                  {source.pendingRequest ? (
                    source.lastRun ? (
                      <p className="border-t border-navy/[0.06] pt-3 text-xs text-muted-foreground">
                        Última execução concluída: {formatDateTime(source.lastRun.finishedAt)}
                        {source.lastRun.sellerTypeFilter
                          ? ` (${SELLER_TYPE_LABELS[source.lastRun.sellerTypeFilter]})`
                          : ""}
                      </p>
                    ) : null
                  ) : source.lastRun ? (
                    <div className="space-y-2.5 border-t border-navy/[0.06] pt-3">
                      <p className="text-xs text-muted-foreground">
                        Última execução: {formatDateTime(source.lastRun.finishedAt)}
                        {source.lastRun.sellerTypeFilter
                          ? ` (${SELLER_TYPE_LABELS[source.lastRun.sellerTypeFilter]})`
                          : ""}
                      </p>
                      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-navy/[0.06]">
                        {[
                          { label: "Novos", value: source.lastRun.new },
                          { label: "Atualizados", value: source.lastRun.updated },
                          { label: "Mudou preço", value: source.lastRun.priceChanges },
                          { label: "Saíram do ar", value: source.lastRun.deactivated },
                          { label: "Revisão", value: source.lastRun.needsReview },
                          { label: "Erros", value: source.lastRun.errors },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-card px-2 py-2 text-center">
                            <dt className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                              {stat.label}
                            </dt>
                            <dd
                              className={cn(
                                "mt-0.5 text-base font-semibold tabular-nums tracking-tight",
                                stat.label === "Erros" && stat.value > 0 ? "text-destructive" : "text-navy",
                              )}
                            >
                              {stat.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p className="text-xs text-muted-foreground">{source.lastRun.endedBy}</p>
                    </div>
                  ) : (
                    <p className="border-t border-navy/[0.06] pt-3 text-xs text-muted-foreground">
                      Nunca executada.
                    </p>
                  )}
                  <div className="border-t border-navy/[0.06] pt-3">
                    <RunScrapeButton
                      source={source.source}
                      locked={locked}
                      pendingRequest={source.pendingRequest}
                      onRefresh={reload}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {sourcesWithRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Última execução por fonte</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="space-y-2 md:hidden">
              {sourcesWithRuns.map((source) => (
                <div key={source.source} className="rounded-xl border border-navy/[0.06] p-3 text-sm">
                  <p className="font-semibold capitalize text-navy">{source.source}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(source.lastRun!.finishedAt)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {source.lastRun!.new} novos · {source.lastRun!.updated} atualizados · {source.lastRun!.errors} erros
                  </p>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead>Requisições</TableHead>
                  <TableHead>Novos</TableHead>
                  <TableHead>Atualizados</TableHead>
                  <TableHead>Mudou preço</TableHead>
                  <TableHead>Saíram do ar</TableHead>
                  <TableHead>Revisão</TableHead>
                  <TableHead>Erros</TableHead>
                  <TableHead>Encerrado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcesWithRuns.map((source) => (
                  <TableRow key={source.source}>
                    <TableCell className="capitalize">{source.source}</TableCell>
                    <TableCell>{formatDateTime(source.lastRun!.finishedAt)}</TableCell>
                    <TableCell>{source.lastRun!.requests}</TableCell>
                    <TableCell>{source.lastRun!.new}</TableCell>
                    <TableCell>{source.lastRun!.updated}</TableCell>
                    <TableCell>{source.lastRun!.priceChanges}</TableCell>
                    <TableCell>{source.lastRun!.deactivated}</TableCell>
                    <TableCell>{source.lastRun!.needsReview}</TableCell>
                    <TableCell>{source.lastRun!.errors}</TableCell>
                    <TableCell className="text-muted-foreground">{source.lastRun!.endedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

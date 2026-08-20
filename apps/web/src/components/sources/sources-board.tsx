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
    void getSources()
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
      <p className="text-sm text-muted-foreground">
        {sources.length} fontes configuradas. O botão abaixo só grava o pedido; quem raspa é o coletor Python
        (`npm run dev:collector`). <code className="rounded bg-muted px-1">webmotors</code> e{" "}
        <code className="rounded bg-muted px-1">olx</code> nascem desligadas — não são ligadas por aqui.
      </p>

      {sources.length === 0 ? (
        <EmptyState icon={Radio} title="Nenhuma fonte configurada" description="Configure ao menos uma fonte de coleta para começar." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {sources.map((source) => {
            const locked = MANUALLY_LOCKED.has(source.source);
            return (
              <Card key={source.source}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="capitalize">{source.source}</CardTitle>
                  <SourceToggle
                    source={source.source}
                    active={source.active}
                    locked={locked}
                    lockedReason={source.reason ?? undefined}
                  />
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Badge variant="outline">{ACCESS_LEVEL_LABELS[source.accessLevel]}</Badge>
                  <p className="text-xs text-muted-foreground">{source.legalBasis}</p>
                  {source.cursor && <p className="text-xs">Cursor: {source.cursor}</p>}
                  {source.lastRun ? (
                    <div className="border-t pt-2 text-xs text-muted-foreground">
                      <p>
                        Última execução: {formatDateTime(source.lastRun.finishedAt)}
                        {source.lastRun.sellerTypeFilter
                          ? ` (${SELLER_TYPE_LABELS[source.lastRun.sellerTypeFilter]})`
                          : ""}
                      </p>
                      <p>
                        {source.lastRun.new} novos · {source.lastRun.updated} atualizados ·{" "}
                        {source.lastRun.priceChanges} mudaram de preço
                      </p>
                      <p>
                        {source.lastRun.deactivated} saíram do ar · {source.lastRun.needsReview} em revisão ·{" "}
                        {source.lastRun.errors} erros
                      </p>
                      <p>{source.lastRun.endedBy}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nunca executada.</p>
                  )}
                  <div className="border-t pt-2">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

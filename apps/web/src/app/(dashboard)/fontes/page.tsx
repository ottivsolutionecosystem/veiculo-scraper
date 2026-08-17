import { Radio } from "lucide-react";

import { getSources } from "@/lib/api";
import { ACCESS_LEVEL_LABELS } from "@/lib/labels";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SourceToggle } from "@/components/sources/source-toggle";
import { RunScrapeButton } from "@/components/sources/run-scrape-button";
import { formatDateTime } from "@/lib/format";

const MANUALLY_LOCKED = new Set(["webmotors", "olx"]);

export default async function FontesPage() {
  const sources = await getSources();
  const sourcesWithRuns = sources.filter((s) => s.lastRun);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Fontes</h1>
        <p className="text-sm text-muted-foreground">
          {sources.length} fontes configuradas.{" "}
          <code className="rounded bg-muted px-1">webmotors</code> e{" "}
          <code className="rounded bg-muted px-1">olx</code> nascem desligadas por decisão de
          projeto (seção 4.2 do SPEC) — não são ligadas por aqui.
        </p>
      </div>

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
                      <p>Última execução: {formatDateTime(source.lastRun.finishedAt)}</p>
                      <p>
                        {source.lastRun.new} novos · {source.lastRun.updated} atualizados ·{" "}
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead>Requisições</TableHead>
                  <TableHead>Novos</TableHead>
                  <TableHead>Atualizados</TableHead>
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

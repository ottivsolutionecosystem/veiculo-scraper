import { Radio } from "lucide-react";

import { SOURCES, SCRAPE_RUNS } from "@/mocks";
import { getDemoState, delay, DemoError } from "@/lib/demo-state";
import { ACCESS_LEVEL_LABELS } from "@/lib/labels";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SourceToggle } from "@/components/sources/source-toggle";
import { formatDateTime } from "@/lib/format";

const MANUALLY_LOCKED = new Set(["webmotors", "olx"]);

export default async function FontesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const demo = getDemoState(searchParams);
  if (demo === "error") throw new DemoError("Fontes");
  if (demo === "loading") await delay(900);

  const sources = demo === "empty" ? [] : SOURCES;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Fontes</h1>
        <p className="text-sm text-muted-foreground">
          {sources.length} fontes configuradas. {" "}
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
            const lastRun = SCRAPE_RUNS.filter((r) => r.source === source.source).sort(
              (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
            )[0];
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
                  {lastRun ? (
                    <div className="border-t pt-2 text-xs text-muted-foreground">
                      <p>Última execução: {formatDateTime(lastRun.finishedAt)}</p>
                      <p>
                        {lastRun.new} novos · {lastRun.updated} atualizados · {lastRun.errors} erros
                      </p>
                      <p>{lastRun.endedBy}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nunca executada.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {SCRAPE_RUNS.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de execuções</CardTitle>
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
                {SCRAPE_RUNS.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="capitalize">{run.source}</TableCell>
                    <TableCell>{formatDateTime(run.finishedAt)}</TableCell>
                    <TableCell>{run.requests}</TableCell>
                    <TableCell>{run.new}</TableCell>
                    <TableCell>{run.updated}</TableCell>
                    <TableCell>{run.needsReview}</TableCell>
                    <TableCell>{run.errors}</TableCell>
                    <TableCell className="text-muted-foreground">{run.endedBy}</TableCell>
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
